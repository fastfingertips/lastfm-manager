/**
 * Last.fm Manager - Orchestrator
 * Coordinates state, engine, actions, and UI components
 */

const LfmManager = {
    CONFIG: {
        debug: true,
        selectors: {
            row: 'tr.chartlist-row',
            trackName: 'td.chartlist-name a',
            artistName: 'td.chartlist-artist a',
            metadataList: '.col-main .metadata-list, .library-track-metadata .metadata-list, .library-header-metadata .metadata-list, .metadata-list',
            checkbox: 'input.lfm-checkbox'
        },
        classes: {
            processed: 'lfm-processed',
            duplicate: 'lfm-row-duplicate',
            badgeBase: 'lfm-badge',
            badgeDuplicate: 'lfm-badge-duplicate',
            badgeOriginal: 'lfm-badge-original',
            checkboxCell: 'lfm-checkbox-cell',
            checkbox: 'lfm-checkbox',
            editMode: 'lfm-edit-mode'
        }
    },

    state: {
        selectedCount: 0,
        duplicateCount: 0,
        editMode: false,
        settings: { ...LfmConfig.DEFAULT_SETTINGS }
    },

    log(msg, ...args) {
        if (this.state.settings.debugMode) {
            console.log(`%c[Last.fm Manager] ${msg}`, 'color: #d29922; font-weight: bold;', ...args);
        }
    },

    init() {
        this.log('Initialized.');
        globalThis.addEventListener('lfm-selection-change', () => LfmComponents.updateActionBar(this));

        // Listen for settings changes from the popup
        if (typeof chrome !== 'undefined' && chrome.storage) {
            chrome.storage.onChanged.addListener((changes, namespace) => {
                this.log('External settings change detected, rescanning...');
                this.detect();
            });
        }
    },

    async loadSettings() {
        return new Promise(resolve => {
            if (typeof chrome !== 'undefined' && chrome.storage) {
                const storage = chrome.storage.sync || chrome.storage.local;
                storage.get(this.state.settings, (items) => {
                    this.state.settings = { ...this.state.settings, ...items };
                    this.log('Settings loaded:', this.state.settings);
                    resolve(this.state.settings);
                });
            } else {
                this.log('Storage API unavailable, using defaults.');
                resolve(this.state.settings);
            }
        });
    },

    async saveSettings(newSettings) {
        this.state.settings = { ...this.state.settings, ...newSettings };
        return new Promise(resolve => {
            if (typeof chrome !== 'undefined' && chrome.storage) {
                const storage = chrome.storage.sync || chrome.storage.local;
                storage.set(this.state.settings, () => {
                    this.log('Settings saved:', this.state.settings);
                    resolve(true);
                });
            } else {
                resolve(false);
            }
        });
    },

    toggleEditMode() {
        this.state.editMode = !this.state.editMode;
        document.body.classList.toggle(this.CONFIG.classes.editMode, this.state.editMode);
        this.log(`Edit mode toggled: ${this.state.editMode}`);
    },

    injectUI(duplicatesCount) {
        LfmComponents.injectUI(this, duplicatesCount);
    },

    updateActionBar() {
        LfmComponents.updateActionBar(this);
    },

    async detect() {
        await this.loadSettings();

        // If extension is globally disabled, run cleanup and exit
        if (this.state.settings.enabled === false) {
            this.disable();
            return { originals: 0, duplicates: 0 };
        }

        const rows = document.querySelectorAll(this.CONFIG.selectors.row);
        this.log(`Scanning ${rows.length} rows.`);

        let stats = { originals: 0, duplicates: 0 };
        let groups = [];

        if (rows.length > 0) {
            // Analyze Rows using Engine (with settings)
            const analysis = LfmEngine.analyzeRows(rows, {
                toleranceSeconds: this.state.settings.timeTolerance,
                fuzzy: this.state.settings.fuzzyMatch
            });
            groups = analysis.groups;
            stats = analysis.stats;
        }

        // Apply UI for each scrobble
        groups.forEach((group) => {
            group.forEach((entry) => {
                LfmComponents.applyRowUI(this, entry.row, entry.isDuplicate, group.length > 1);
            });
        });

        this.log(`Complete. Originals: ${stats.originals}, Duplicates: ${stats.duplicates}`);
        this.state.duplicateCount = stats.duplicates;

        // 3. Inject Navigation (Always on library pages)
        LfmComponents.injectNavigation(this);

        // 4. Inject Scrobble Panel UI if it's the user's own library
        const isMyLib = LfmEngine.isMyLibrary();
        if (isMyLib) {
            this.injectUI(stats.duplicates);
        } else {
            this.log('Not your library. Removing Action Bar if present.');
            const actionBar = document.getElementById('lfm-action-bar');
            if (actionBar) actionBar.remove();
            const metaEdit = document.getElementById('lfm-meta-edit-item');
            if (metaEdit) metaEdit.remove();
        }

        // Apply visual preferences based on settings
        const mode = this.state.settings.badgeMode;
        document.body.classList.remove('lfm-badge-mode-icon', 'lfm-badge-mode-none');
        if (mode === 'icon_only') document.body.classList.add('lfm-badge-mode-icon');
        else if (mode === 'none') document.body.classList.add('lfm-badge-mode-none');

        document.body.classList.toggle('lfm-no-color', !this.state.settings.colorize);

        // 4. Update initial selection state
        this.state.selectedCount = this.getSelectedCount();
        this.updateActionBar();

        return stats;
    },

    /**
     * Fully deactivates the extension UI on the page
     */
    disable() {
        this.log('Extension disabled. Cleaning up UI...');

        // 1. Remove Action Bar
        const actionBar = document.getElementById('lfm-action-bar');
        if (actionBar) actionBar.remove();

        // 2. Remove Metadata Items (Counter & Manager Button)
        const metaDuplicate = document.getElementById('lfm-meta-duplicate');
        if (metaDuplicate) metaDuplicate.remove();
        const metaEdit = document.getElementById('lfm-meta-edit-item');
        if (metaEdit) metaEdit.remove();

        // 3. Clean up Rows
        const rows = document.querySelectorAll(this.CONFIG.selectors.row);
        rows.forEach(row => {
            row.classList.remove(this.CONFIG.classes.processed, this.CONFIG.classes.duplicate);

            // Row-level badges
            const badges = row.querySelectorAll(`.${this.CONFIG.classes.badgeBase}`);
            badges.forEach(b => b.remove());

            // Row-level checkboxes
            const cbCell = row.querySelector(`.${this.CONFIG.classes.checkboxCell}`);
            if (cbCell) cbCell.remove();

            // More Menu Items
            const moreMenuItems = row.querySelectorAll('.lfm-more-menu-item');
            moreMenuItems.forEach(item => item.remove());

            // Highlighted song links
            const songLink = row.querySelector('.lfm-song-duplicate');
            if (songLink) {
                songLink.classList.remove('lfm-song-duplicate');
                songLink.removeAttribute('title');
            }
        });

        // 4. Clear Body Classes & Settings
        document.body.classList.remove('lfm-hide-badges', 'lfm-no-color');

        // 5. Disconnect Observers
        if (this._metadataObserver) {
            this._metadataObserver.disconnect();
            this._metadataObserver = null;
        }

        // 6. Reset Internal State
        this.state.duplicateCount = 0;
        this.state.selectedCount = 0;
    },

    reset() {
        // Soft reset for rescanning (not full disable)
        const rows = document.querySelectorAll(this.CONFIG.selectors.row);
        rows.forEach(row => {
            row.classList.remove(this.CONFIG.classes.processed, this.CONFIG.classes.duplicate);
            const badges = row.querySelectorAll(`.${this.CONFIG.classes.badgeBase}`);
            badges.forEach(b => b.remove());
        });
    },

    /**
     * Gets all scrobble checkboxes on the page
     * @returns {NodeList}
     */
    getCheckboxes() {
        return document.querySelectorAll(this.CONFIG.selectors.checkbox);
    },

    /**
     * Gets the number of currently checked scrobbles
     * @returns {number}
     */
    getSelectedCount() {
        return document.querySelectorAll(`${this.CONFIG.selectors.checkbox}:checked`).length;
    },

    getStats() {
        return {
            originals: document.querySelectorAll('tr.chartlist-row:not(.lfm-row-duplicate)').length,
            duplicates: this.state.duplicateCount,
            selectedCount: this.getSelectedCount(),
            isMyLibrary: LfmEngine.isMyLibrary()
        };
    }
};
