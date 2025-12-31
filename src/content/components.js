/**
 * Last.fm Manager - UI Components
 * Handles injection and management of page elements: Action Bar, Metadata, and Header Buttons
 */


const LfmComponents = {
    /**
     * Applies UI changes (checkboxes, badges, colors) to a row based on its status
     * @param {Object} detector - Main detector instance
     * @param {HTMLElement} row - The chartlist row
     * @param {boolean} isDuplicate - Whether this row is a duplicate
     * @param {boolean} isInGroup - Whether this row is part of a duplicate group
     */
    applyRowUI(detector, row, isDuplicate, isInGroup) {
        const nameCell = row.querySelector('td.chartlist-name');
        if (!nameCell) return;

        // Add checkbox
        const shouldCheck = isDuplicate && detector.state.settings.autoSelect;
        this.addCheckbox(detector, row, shouldCheck);

        if (isDuplicate) {
            row.classList.add(detector.CONFIG.classes.duplicate);

            const songLink = row.querySelector(detector.CONFIG.selectors.trackName);
            if (songLink) {
                songLink.classList.add('lfm-song-duplicate');
                songLink.title = 'Duplicate Scrobble';
            }

            if (detector.state.settings.badgeMode !== 'none') {
                const existingBadge = row.querySelector(`.${detector.CONFIG.classes.badgeDuplicate}`);
                if (!existingBadge) {
                    const badge = this.createBadge(detector, 'duplicate', 'DUPLICATE');
                    nameCell.insertBefore(badge, nameCell.firstChild);
                }
            }
        } else if (detector.state.settings.badgeMode !== 'none' && isInGroup) {
            const existingBadge = row.querySelector(`.${detector.CONFIG.classes.badgeOriginal}`);
            if (!existingBadge) {
                const badge = this.createBadge(detector, 'check', 'ORIGINAL');
                nameCell.insertBefore(badge, nameCell.firstChild);
            }
        }

        row.classList.add(detector.CONFIG.classes.processed);

        // Add row-click selection support (only once per row)
        if (!row.dataset.lfmClickBound) {
            row.dataset.lfmClickBound = 'true';
            row.addEventListener('click', (e) => {
                // Only trigger if clicking on the background cells, not links or buttons
                const isClickableContainer = ['TD', 'TR'].includes(e.target.tagName);
                const isEditMode = detector.state.editMode;

                if (isClickableContainer && isEditMode) {
                    const cb = row.querySelector(`.${detector.CONFIG.classes.checkbox}`);
                    if (cb) {
                        // Prevent default and click the checkbox to trigger its existing logic
                        e.preventDefault();
                        cb.click();
                    }
                }
            });
        }

        // Inject scrobble details button into more menu
        injectMoreMenuInfo(row);
    },

    /**
     * Helper to add a selection checkbox to a row
     */
    addCheckbox(detector, row, isChecked = false) {
        const existingCell = row.querySelector(`.${detector.CONFIG.classes.checkboxCell}`);
        if (existingCell) return;

        const cell = document.createElement('td');
        cell.className = detector.CONFIG.classes.checkboxCell;

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = detector.CONFIG.classes.checkbox;
        checkbox.checked = isChecked;

        checkbox.addEventListener('click', (e) => {
            const checkboxes = Array.from(detector.getCheckboxes());
            const currentIndex = checkboxes.indexOf(checkbox);

            if (e.shiftKey && detector._lastChecked !== undefined) {
                const start = Math.min(currentIndex, detector._lastChecked);
                const end = Math.max(currentIndex, detector._lastChecked);
                const stateToSet = checkboxes[detector._lastChecked].checked;

                for (let i = start; i <= end; i++) {
                    checkboxes[i].checked = stateToSet;
                }
            }

            detector._lastChecked = currentIndex;

            // Trigger state update
            detector.state.selectedCount = detector.getSelectedCount();
            globalThis.dispatchEvent(new CustomEvent('lfm-selection-change'));
        });

        cell.appendChild(checkbox);
        row.insertBefore(cell, row.firstElementChild);
    },

    /**
     * Creates a badge element (structure is always icon + text, visibility handled by CSS)
     */
    createBadge(detector, iconName, labelText) {
        const badge = document.createElement('span');
        badge.className = `${detector.CONFIG.classes.badgeBase} lfm-badge-${iconName === 'check' ? 'original' : 'duplicate'}`;
        badge.title = labelText; // Tooltip for icon-only mode

        const icon = createIcon(iconName, 10, 'lfm-badge-icon');
        if (icon) {
            badge.appendChild(icon);
        }

        const text = document.createElement('span');
        text.textContent = labelText;
        badge.appendChild(text);

        return badge;
    },

    /**
     * Injects the main detector UI elements
     * @param {Object} detector - Main detector instance
     * @param {number} duplicatesCount - Number of found duplicates
     */
    injectUI(detector, duplicatesCount) {
        const list = document.querySelector(detector.CONFIG.selectors.metadataList);
        if (!list) {
            detector.log('Metadata list not found.');
            return;
        }

        this.monitorMetadata(detector, list);
        this.injectNavigation(detector);

        // 1. Ensure Action Bar exists (ALWAYS - even without duplicates)
        let actionBar = document.getElementById('lfm-action-bar');
        if (!actionBar) {
            actionBar = document.createElement('div');
            actionBar.id = 'lfm-action-bar';
            actionBar.className = 'lfm-action-bar';
            if (list.parentNode) {
                list.parentNode.insertBefore(actionBar, list.nextSibling);
            }
        }

        // 2. Inject Edit Button into Header CTAs (ALWAYS - for manual scrobble management)
        this.injectHeaderButton(detector, duplicatesCount);

        // 3. Manage Metadata Item (only show if duplicates exist)
        let item = document.getElementById('lfm-meta-duplicate');

        if (duplicatesCount === 0) {
            // Remove duplicate counter if no duplicates, but keep action bar and header button
            if (item) item.remove();
            this.updateActionBar(detector);
            return;
        }

        if (item) {
            const countEl = item.querySelector('.lfm-meta-count');
            if (countEl) {
                countEl.textContent = duplicatesCount;
            } else {
                const display = item.querySelector('.metadata-display');
                if (display) display.textContent = duplicatesCount;
            }
        } else {
            detector.log(`Creating UI for ${duplicatesCount} duplicates.`);
            item = document.createElement('li');
            item.className = 'metadata-item lfm-meta-item';
            item.id = 'lfm-meta-duplicate';

            item.innerHTML = `
                <h2 class="metadata-title lfm-meta-title">Duplicates</h2>
                <div class="metadata-display lfm-meta-value lfm-meta-value--red">
                    <span class="lfm-meta-count">${duplicatesCount}</span>
                </div>
            `;
        }

        // Force rightmost position for duplicate item (before edit button)
        const editItem = document.getElementById('lfm-meta-edit-item');
        if (editItem) {
            // Insert duplicate item before the edit button
            editItem.before(item);
        } else {
            // No edit button yet, just append
            list.appendChild(item);
        }

        // Ensure edit button is always last
        if (editItem && list.lastElementChild !== editItem) {
            list.appendChild(editItem);
        }

        this.updateActionBar(detector);
    },

    /**
     * Injects Quick Navigation buttons (Next/Back Day)
     */
    injectNavigation(detector) {
        const controls = document.querySelector('.library-controls');
        if (!controls) return;

        if (document.getElementById('lfm-quick-nav')) return;

        const nav = document.createElement('div');
        nav.id = 'lfm-quick-nav';
        nav.className = 'lfm-quick-nav';

        const prevIcon = getIcon('prev');
        const nextIcon = getIcon('next');

        nav.innerHTML = `
            <button id="lfm-btn-prev-day" class="lfm-nav-btn" title="Previous Day (Left Arrow)">
                <span class="lfm-nav-btn-icon">${prevIcon}</span>
                <span class="lfm-nav-btn-text">BACK DAY</span>
            </button>
            <button id="lfm-btn-next-day" class="lfm-nav-btn" title="Next Day (Right Arrow)">
                <span class="lfm-nav-btn-text">NEXT DAY</span>
                <span class="lfm-nav-btn-icon">${nextIcon}</span>
            </button>
        `;

        nav.querySelector('#lfm-btn-prev-day').onclick = (e) => {
            e.preventDefault();
            LfmNavigator.stepDay(-1);
        };
        nav.querySelector('#lfm-btn-next-day').onclick = (e) => {
            e.preventDefault();
            LfmNavigator.stepDay(1);
        };

        // Insert into library-controls, usually after the navlist
        const navlist = controls.querySelector('.navlist');
        if (navlist) {
            navlist.after(nav);
        } else {
            controls.appendChild(nav);
        }
    },

    /**
     * Injects the edit button into the metadata list area
     */
    injectHeaderButton(detector, duplicatesCount) {
        // Primary location: inside metadata-list as well
        const metadataList = document.querySelector(detector.CONFIG.selectors.metadataList);

        if (!metadataList) {
            detector.log('No metadata list found for header button.');
            return;
        }

        let btn = document.getElementById('lfm-header-edit-btn');
        const editIcon = getIcon('edit');

        if (btn) {
            // Update existing button
            const badge = btn.querySelector('.lfm-header-btn-badge');
            if (badge) {
                if (duplicatesCount > 0) {
                    badge.textContent = duplicatesCount;
                    badge.style.display = 'flex';
                } else {
                    badge.style.display = 'none';
                }
            }
            btn.title = duplicatesCount > 0 ? `Manage ${duplicatesCount} duplicates` : 'Scrobble Manager';
            // Ensure button is last in the list
            if (metadataList.lastElementChild !== btn.parentElement) {
                metadataList.appendChild(btn.parentElement);
            }
            return;
        }

        // Create wrapper as metadata-item
        const wrapper = document.createElement('li');
        wrapper.className = 'metadata-item lfm-meta-item lfm-meta-edit-wrapper';
        wrapper.id = 'lfm-meta-edit-item';

        btn = document.createElement('a');
        btn.id = 'lfm-header-edit-btn';
        btn.className = 'lfm-header-cta';
        btn.href = '#';
        btn.title = duplicatesCount > 0 ? `Manage ${duplicatesCount} duplicates` : 'Scrobble Manager';
        btn.setAttribute('aria-expanded', 'false');

        btn.innerHTML = `
            <span class="lfm-header-btn-icon">${editIcon}</span>
            ${duplicatesCount > 0 ? `<span class="lfm-header-btn-badge">${duplicatesCount}</span>` : '<span class="lfm-header-btn-badge" style="display:none"></span>'}
        `;

        btn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            detector.toggleEditMode();
        };

        wrapper.appendChild(btn);
        metadataList.appendChild(wrapper);
    },

    /**
     * Updates the action bar with current selection counts and button states
     */
    updateActionBar(detector) {
        const bar = document.getElementById('lfm-action-bar');
        if (!bar) return;

        const checkboxes = detector.getCheckboxes();
        const checkboxArray = Array.from(checkboxes);
        const total = checkboxArray.length;
        const count = detector.getSelectedCount();

        detector.state.selectedCount = count;
        const hasDuplicates = detector.state.duplicateCount > 0;

        const allSelected = total > 0 && count === total;
        const noneSelected = count === 0;

        const isDup = (cb) => cb.closest('tr').classList.contains(detector.CONFIG.classes.duplicate);
        const dups = checkboxArray.filter(isDup);
        const origs = checkboxArray.filter(cb => !isDup(cb));

        const allDupsSelected = dups.length > 0 && dups.every(cb => cb.checked);
        const allOrigsSelected = origs.length > 0 && origs.every(cb => cb.checked);

        const icons = getIcons('delete', 'close', 'refresh', 'selectAll', 'deselectAll', 'duplicate', 'check', 'settings', 'search');

        // Prepare titles for buttons (with explanations for disabled states)
        let selectDupsTitle = 'Select Duplicates';
        if (!hasDuplicates) selectDupsTitle = 'No duplicates found on this page';
        else if (allDupsSelected) selectDupsTitle = 'All duplicates selected';

        const deleteSuffix = count > 1 ? 's' : '';
        const deleteTitle = count > 0
            ? `Delete ${count} selected scrobble${deleteSuffix}`
            : 'Select scrobbles to delete';

        bar.innerHTML = `
            <span class="lfm-action-bar-count">${count}/${total} selected</span>
            <button id="lfm-btn-scan" class="lfm-btn lfm-btn-secondary" title="Refresh Analysis" style="margin-right: 12px; border-color: var(--lfm-red);">
                <span class="lfm-icon">${icons.refresh}</span><span class="lfm-btn-text">Refresh</span>
            </button>
            <div class="lfm-btn-group">
                <button id="lfm-btn-select-all" class="lfm-btn lfm-btn-secondary ${allSelected ? 'lfm-btn-active' : ''}" title="Select All">
                    <span class="lfm-icon">${icons.selectAll}</span><span class="lfm-btn-text">All</span>
                </button>
                <button id="lfm-btn-deselect-all" class="lfm-btn lfm-btn-secondary ${noneSelected ? 'lfm-btn-active' : ''}" title="Deselect All">
                    <span class="lfm-icon">${icons.deselectAll}</span><span class="lfm-btn-text">None</span>
                </button>
            </div>
            <div class="lfm-btn-group">
                <button id="lfm-btn-select-duplicates" class="lfm-btn lfm-btn-secondary ${allDupsSelected ? 'lfm-btn-active' : ''}" ${hasDuplicates ? '' : 'disabled'} title="${selectDupsTitle}">
                    <span class="lfm-icon">${icons.duplicate}</span><span class="lfm-btn-text">Dups</span>
                </button>
                <button id="lfm-btn-select-originals" class="lfm-btn lfm-btn-secondary ${allOrigsSelected ? 'lfm-btn-active' : ''}" title="${allOrigsSelected ? 'All originals selected' : 'Select Originals'}">
                    <span class="lfm-icon">${icons.check}</span><span class="lfm-btn-text">Orig</span>
                </button>
            </div>
            <button id="lfm-btn-invert" class="lfm-btn lfm-btn-secondary" title="Invert Selection">
                <span class="lfm-icon">${icons.refresh}</span><span class="lfm-btn-text">Inv</span>
            </button>
            <button id="lfm-btn-delete" class="lfm-btn lfm-btn-danger" ${count === 0 ? 'disabled' : ''} title="${deleteTitle}">
                <span class="lfm-icon">${icons.delete}</span><span class="lfm-btn-text">Delete</span>
            </button>
            <div class="lfm-btn-group" style="margin-left: 4px;">
                <button id="lfm-btn-settings" class="lfm-btn lfm-btn-secondary" title="Advanced Settings">
                    <span class="lfm-icon">${icons.settings}</span>
                </button>
                <button id="lfm-btn-cancel" class="lfm-btn lfm-btn-secondary" title="Exit Edit Mode">
                    <span class="lfm-icon">${icons.close}</span>
                </button>
            </div>
        `;

        bar.querySelector('#lfm-btn-delete').onclick = () => LfmActions.deleteSelected(detector);
        bar.querySelector('#lfm-btn-cancel').onclick = () => detector.toggleEditMode();
        bar.querySelector('#lfm-btn-settings').onclick = () => LfmUI.showSettingsModal(detector);
        bar.querySelector('#lfm-btn-scan').onclick = (e) => {
            const btn = e.currentTarget;
            const text = btn.querySelector('.lfm-btn-text');
            const originalText = text.textContent;

            btn.classList.add('lfm-btn-loading');
            text.textContent = 'Refreshing...';

            detector.detect().then(() => {
                btn.classList.remove('lfm-btn-loading');
                text.textContent = 'Refreshed!';
                setTimeout(() => {
                    text.textContent = originalText;
                }, 1500);
            });
        };
        bar.querySelector('#lfm-btn-select-all').onclick = () => LfmActions.selectAll(detector);
        bar.querySelector('#lfm-btn-deselect-all').onclick = () => LfmActions.deselectAll(detector);
        bar.querySelector('#lfm-btn-select-duplicates').onclick = () => LfmActions.selectAllDuplicates(detector);
        bar.querySelector('#lfm-btn-select-originals').onclick = () => LfmActions.selectOriginals(detector);
        bar.querySelector('#lfm-btn-invert').onclick = () => LfmActions.invertSelection(detector);
    },

    /**
     * Monitors the metadata list to ensure the detector item stays in place
     */
    monitorMetadata(detector, list) {
        if (detector._metadataObserver) return;

        detector._metadataObserver = new MutationObserver((mutations) => {
            // Ignore mutations caused by our own elements
            const isOurMutation = mutations.some(m =>
                Array.from(m.addedNodes).some(n => n.id?.startsWith('lfm-') || n.classList?.contains('lfm-meta-item')) ||
                Array.from(m.removedNodes).some(n => n.id && n.id.startsWith('lfm-'))
            );
            if (isOurMutation) return;

            const editItem = document.getElementById('lfm-meta-edit-item');

            // Check if duplicate item was removed by Last.fm
            const duplicateRemoved = mutations.some(m =>
                Array.from(m.removedNodes).some(n => n.id === 'lfm-meta-duplicate')
            );

            // Re-inject only if duplicate item was removed and we have duplicates
            if (duplicateRemoved && detector.state.duplicateCount > 0) {
                this.injectUI(detector, detector.state.duplicateCount);
            }

            // Ensure edit button stays last (after duplicate item if it exists)
            if (editItem && list.lastElementChild !== editItem) {
                list.appendChild(editItem);
            }
        });

        detector._metadataObserver.observe(list, { childList: true });
    }
};
