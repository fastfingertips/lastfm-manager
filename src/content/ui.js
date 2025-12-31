/**
 * Last.fm Manager - UI Components
 * Toast, Modal, Loading, and Empty State utilities
 * Uses LfmIcons for consistent iconography
 */

const LfmUI = {
    /**
     * Helper to listen for Escape key once and execute a callback
     * @param {Function} callback - Function to run when ESC is pressed
     * @returns {Function} - Function to manually remove the listener
     */
    onEscape(callback) {
        const handler = (e) => {
            if (e.key === 'Escape') {
                callback();
                document.removeEventListener('keydown', handler);
            }
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    },

    /**
     * Base modal factory to create a consistent modal structure
     * @param {Object} options - Modal options
     * @returns {Object} - { overlay, close }
     */
    baseModal(options = {}) {
        const {
            id = null,
            modalClass = '',
            title = '',
            titleIcon = '',
            headerActions = '',
            bodyContent = '',
            bodyClass = '',
            footerContent = '',
            onClose = null
        } = options;

        const overlay = document.createElement('div');
        overlay.className = 'lfm-modal-overlay';
        if (id) overlay.id = id;

        const closeIcon = getIcon('close');

        overlay.innerHTML = `
            <div class="lfm-modal ${modalClass}">
                <div class="lfm-modal-header">
                    <h3 class="lfm-modal-title">${titleIcon ? `<span class="lfm-modal-icon">${titleIcon}</span>` : ''}${title}</h3>
                    <div class="lfm-modal-header-actions">
                        ${headerActions}
                        <button class="lfm-modal-close" data-action="close" title="Close (ESC)">${closeIcon}</button>
                    </div>
                </div>
                <div class="lfm-modal-body ${bodyClass}">
                    ${bodyContent}
                </div>
                ${footerContent ? `<div class="lfm-modal-footer">${footerContent}</div>` : ''}
            </div>
        `;

        const close = () => {
            overlay.remove();
            if (onClose) onClose();
        };

        const closeBtn = overlay.querySelector('[data-action="close"]');
        closeBtn.onclick = close;

        overlay.onclick = (e) => {
            if (e.target === overlay) close();
        };

        this.onEscape(close);
        document.body.appendChild(overlay);

        return { overlay, close };
    },

    // --- Toast Notifications ---

    toastContainer: null,

    ensureToastContainer() {
        if (!this.toastContainer) {
            this.toastContainer = document.createElement('div');
            this.toastContainer.className = 'lfm-toast-container';
            document.body.appendChild(this.toastContainer);
        }
        return this.toastContainer;
    },

    /**
     * Show a toast notification
     * @param {string} message - Toast message
     * @param {string} type - 'success' | 'error' | 'warning' | 'info'
     * @param {number} duration - Auto-hide duration in ms (0 = manual close)
     */
    toast(message, type = 'info', duration = 4000) {
        const container = this.ensureToastContainer();

        // Get icon from LfmIcons
        const iconName = type === 'error' ? 'error' : type;
        const iconSvg = getIcon(iconName);

        const toast = document.createElement('div');
        toast.className = `lfm-toast lfm-toast--${type}`;
        toast.innerHTML = `
            ${iconSvg ? `<span class="lfm-toast-icon">${iconSvg}</span>` : ''}
            <span class="lfm-toast-message">${message}</span>
        `;

        container.appendChild(toast);

        const hide = () => {
            toast.classList.add('lfm-toast--hiding');
            setTimeout(() => toast.remove(), 300);
        };

        if (duration > 0) {
            setTimeout(hide, duration);
        }

        toast.onclick = hide;
        return { hide };
    },

    success(message, duration) { return this.toast(message, 'success', duration); },
    error(message, duration) { return this.toast(message, 'error', duration); },
    warning(message, duration) { return this.toast(message, 'warning', duration); },
    info(message, duration) { return this.toast(message, 'info', duration); },


    // --- Modal Dialogs ---

    /**
     * Show a confirmation modal
     * @param {Object} options - Modal options
     * @returns {Promise<boolean>} - Resolves true if confirmed, false if cancelled
     */
    confirm(options = {}) {
        const {
            title = 'Confirm',
            message = 'Are you sure?',
            confirmText = 'Confirm',
            cancelText = 'Cancel',
            danger = false,
            warning = null,
            requireInput = null // String to type for confirmation
        } = options;

        return new Promise((resolve) => {
            const warningHtml = warning ? `<div class="lfm-modal-warning"><span class="lfm-modal-warning-icon">${getIcon('warning')}</span><span>${warning}</span></div>` : '';
            const inputHtml = requireInput ? `<input type="text" class="lfm-modal-input" placeholder='Type "${requireInput}" to confirm'>` : '';

            const { overlay } = this.baseModal({
                title,
                bodyContent: `<p>${message}</p>${warningHtml}${inputHtml}`,
                footerContent: `
                    <button class="lfm-btn lfm-btn-secondary" data-action="cancel">${cancelText}</button>
                    <button class="lfm-btn lfm-btn-danger" data-action="confirm" ${requireInput ? 'disabled' : ''}>${confirmText}</button>
                `,
                onClose: () => resolve(false)
            });

            const confirmBtn = overlay.querySelector('[data-action="confirm"]');
            const input = overlay.querySelector('.lfm-modal-input');

            if (input && requireInput) {
                input.focus();
                input.addEventListener('input', () => {
                    confirmBtn.disabled = input.value !== requireInput;
                });
                input.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter' && input.value === requireInput) {
                        overlay.remove();
                        resolve(true);
                    }
                });
            }

            overlay.addEventListener('click', (e) => {
                if (e.target.closest('[data-action="cancel"]')) {
                    overlay.remove();
                    resolve(false);
                }
                if (e.target.closest('[data-action="confirm"]') && !confirmBtn.disabled) {
                    overlay.remove();
                    resolve(true);
                }
            });
        });
    },


    // --- Loading States ---

    loadingOverlay: null,

    /**
     * Show a loading overlay using baseModal structure
     * @param {string} message - Loading message
     * @returns {Object} - { update(msg), setProgress(%), hide() }
     */
    showLoading(message = 'Loading...') {
        if (this.loadingOverlay) {
            this.loadingOverlay.querySelector('.lfm-loading-text').textContent = message;
            return this.loadingOverlay._controls;
        }

        const { overlay, close } = this.baseModal({
            modalClass: 'lfm-loading-modal',
            bodyClass: 'lfm-loading-body',
            bodyContent: `
                <div class="lfm-loading-spinner"></div>
                <div class="lfm-loading-text">${message}</div>
                <div class="lfm-progress">
                    <div class="lfm-progress-bar lfm-progress-bar--indeterminate"></div>
                </div>
            `,
            footerContent: `
                <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                    <div class="text-sub">v1.0.1 • <a href="https://github.com/fastfingertips/lastfm-manager" target="_blank" class="lfm-info-link">GitHub</a></div>
                    <div class="lfm-modal-actions">
                        <button class="lfm-btn lfm-btn-secondary lfm-btn-close">Close</button>
                    </div>
                </div>
            `,
        });

        // Loading modal shouldn't have a close button or header actions
        const header = overlay.querySelector('.lfm-modal-header');
        if (header) header.style.display = 'none';

        this.loadingOverlay = overlay;

        const controls = {
            update: (msg) => {
                const textEl = overlay.querySelector('.lfm-loading-text');
                if (textEl) textEl.textContent = msg;
            },
            setProgress: (percent) => {
                const bar = overlay.querySelector('.lfm-progress-bar');
                if (bar) {
                    bar.classList.remove('lfm-progress-bar--indeterminate');
                    bar.style.width = `${percent}%`;
                }
            },
            hide: () => {
                close();
                this.loadingOverlay = null;
            }
        };

        overlay._controls = controls;
        return controls;
    },

    /**
     * Create inline loading indicator
     * @param {string} message 
     * @returns {HTMLElement}
     */
    createInlineLoading(message = 'Loading...') {
        const el = document.createElement('div');
        el.className = 'lfm-loading lfm-loading--inline';
        el.innerHTML = `
            <div class="lfm-loading-spinner"></div>
            <span class="lfm-loading-text">${message}</span>
        `;
        return el;
    },


    // --- Empty State ---

    /**
     * Create an empty state element
     * @param {Object} options
     * @returns {HTMLElement}
     */
    createEmptyState(options = {}) {
        const {
            icon = 'success',
            title = 'No duplicates found',
            text = 'Your library looks clean!',
            success = true,
            actionText = null,
            onAction = null
        } = options;

        // Get icon from LfmIcons
        const iconSvg = getIcon(icon);

        const el = document.createElement('div');
        el.className = `lfm-empty-state ${success ? 'lfm-empty-state--success' : ''}`;

        let actionHtml = '';
        if (actionText && onAction) {
            actionHtml = `<div class="lfm-empty-state-action">
                <button class="lfm-btn lfm-btn-secondary">${actionText}</button>
            </div>`;
        }

        el.innerHTML = `
            <div class="lfm-empty-state-icon">${iconSvg}</div>
            <div class="lfm-empty-state-title">${title}</div>
            <div class="lfm-empty-state-text">${text}</div>
            ${actionHtml}
        `;

        if (actionText && onAction) {
            el.querySelector('.lfm-empty-state-action button').onclick = onAction;
        }

        return el;
    },

    /**
     * Show settings modal to adjust detector behavior
     * @param {Object} detector - Main detector instance
     */
    showSettingsModal(detector) {
        const s = detector.state.settings;
        const bodyValue = `
            <div class="lfm-settings-grid">
                <div class="lfm-settings-header" style="padding: 12px 20px; background: var(--lfm-bg-alt); font-size: 11px; font-weight: bold; color: var(--lfm-text-secondary); border-bottom: 1px solid var(--lfm-border-light);">DETECTION ENGINE</div>
                
                <div class="lfm-settings-row">
                    <div class="lfm-settings-info">
                        <label>Fuzzy Matching</label>
                        <p>Ignore title tags like (Remastered).</p>
                    </div>
                    <div class="lfm-settings-control">
                        <label class="lfm-switch">
                            <input type="checkbox" id="lfm-setting-fuzzyMatch" ${s.fuzzyMatch ? 'checked' : ''}>
                            <span class="lfm-switch-slider"></span>
                        </label>
                    </div>
                </div>

                <div class="lfm-settings-row">
                    <div class="lfm-settings-info">
                        <label>Time Tolerance</label>
                        <p>Max window for duplicate scrobbles.</p>
                    </div>
                    <div class="lfm-settings-control lfm-settings-control--stacked">
                        <select id="lfm-setting-timeTolerance-select" style="width: 140px;">
                            <option value="60" ${s.timeTolerance === 60 ? 'selected' : ''}>1 minute</option>
                            <option value="300" ${s.timeTolerance === 300 ? 'selected' : ''}>5 minutes</option>
                            <option value="1800" ${s.timeTolerance === 1800 ? 'selected' : ''}>30 minutes</option>
                            <option value="3600" ${s.timeTolerance === 3600 ? 'selected' : ''}>1 hour</option>
                            <option value="86400" ${s.timeTolerance === 86400 ? 'selected' : ''}>1 day (default)</option>
                            <option value="custom" ${![60, 300, 1800, 3600, 86400].includes(s.timeTolerance) ? 'selected' : ''}>Custom...</option>
                        </select>
                        <input type="number" id="lfm-setting-timeTolerance" 
                               value="${s.timeTolerance}" min="1" max="604800" 
                               style="width: 140px; margin-top: 8px; ${[60, 300, 1800, 3600, 86400].includes(s.timeTolerance) ? 'display:none' : ''}">
                    </div>
                </div>

                <div class="lfm-settings-header" style="padding: 12px 20px; background: var(--lfm-bg-alt); font-size: 11px; font-weight: bold; color: var(--lfm-text-secondary); border-bottom: 1px solid var(--lfm-border-light); border-top: 1px solid var(--lfm-border-light);">VISUALS</div>

                <div class="lfm-settings-row">
                    <div class="lfm-settings-info">
                        <label>Highlight Rows</label>
                        <p>Colorize duplicate scrobbles in list.</p>
                    </div>
                    <div class="lfm-settings-control">
                        <label class="lfm-switch">
                            <input type="checkbox" id="lfm-setting-colorize" ${s.colorize ? 'checked' : ''}>
                            <span class="lfm-switch-slider"></span>
                        </label>
                    </div>
                </div>

                <div class="lfm-settings-row">
                    <div class="lfm-settings-info">
                        <label>Auto-Select</label>
                        <p>Automatically check found duplicates.</p>
                    </div>
                    <div class="lfm-settings-control">
                        <label class="lfm-switch">
                            <input type="checkbox" id="lfm-setting-autoSelect" ${s.autoSelect ? 'checked' : ''}>
                            <span class="lfm-switch-slider"></span>
                        </label>
                    </div>
                </div>

                <div class="lfm-settings-row">
                    <div class="lfm-settings-info">
                        <label>Badge Display</label>
                        <p>How tags are shown in the scrobble list.</p>
                    </div>
                    <div class="lfm-settings-control">
                        <select id="lfm-setting-badgeMode" style="width: 140px;">
                            <option value="both" ${s.badgeMode === 'both' ? 'selected' : ''}>Icon + Text</option>
                            <option value="icon_only" ${s.badgeMode === 'icon_only' ? 'selected' : ''}>Icon Only</option>
                            <option value="none" ${s.badgeMode === 'none' ? 'selected' : ''}>Disabled</option>
                        </select>
                    </div>
                </div>

                <div class="lfm-settings-header" style="padding: 12px 20px; background: var(--lfm-bg-alt); font-size: 11px; font-weight: bold; color: var(--lfm-text-secondary); border-bottom: 1px solid var(--lfm-border-light); border-top: 1px solid var(--lfm-border-light);">SAFETY</div>

                <div class="lfm-settings-row">
                    <div class="lfm-settings-info">
                        <label>Delete Safety Level</label>
                        <p>Verification required before mass removal.</p>
                    </div>
                    <div class="lfm-settings-control">
                        <select id="lfm-setting-confirmDelete" style="width: 140px;">
                            <option value="none" ${s.confirmDelete === 'none' ? 'selected' : ''}>None</option>
                            <option value="simple" ${s.confirmDelete === 'simple' ? 'selected' : ''}>Simple</option>
                            <option value="text" ${s.confirmDelete === 'text' ? 'selected' : ''}>DELETE Text</option>
                        </select>
                    </div>
                </div>
            </div>
        `;

        const { overlay, close } = this.baseModal({
            title: 'Scrobble Panel Settings',
            titleIcon: getIcon('settings'),
            bodyContent: bodyValue,
            bodyClass: 'lfm-settings-body',
            footerContent: `
                <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                    <div class="text-sub">Settings auto-save on change.</div>
                    <button class="lfm-btn lfm-btn-secondary lfm-btn-close">Close</button>
                </div>
            `
        });

        const syncAndSave = async () => {
            const getValue = (id, type) => {
                const el = overlay.querySelector(`#lfm-setting-${id}`);
                if (!el) return s[id];
                if (type === 'checkbox') return el.checked;
                if (type === 'number') return Number.parseInt(el.value, 10);
                return el.value;
            };

            const newSettings = {
                timeTolerance: getValue('timeTolerance', 'number'),
                autoSelect: getValue('autoSelect', 'checkbox'),
                fuzzyMatch: getValue('fuzzyMatch', 'checkbox'),
                colorize: getValue('colorize', 'checkbox'),
                badgeMode: getValue('badgeMode', 'select'),
                confirmDelete: getValue('confirmDelete', 'select')
            };

            await detector.saveSettings(newSettings);
            // Non-intrusive feedback
            const footerSub = overlay.querySelector('.lfm-modal-footer .text-sub');
            if (footerSub) {
                footerSub.textContent = 'Saving...';
                setTimeout(() => { footerSub.textContent = 'All changes saved.'; }, 600);
            }
        };

        // Attach listeners to all inputs
        overlay.querySelectorAll('input, select').forEach(el => {
            el.addEventListener('change', syncAndSave);
        });

        // Time Tolerance Special Toggle
        const ttSelect = overlay.querySelector('#lfm-setting-timeTolerance-select');
        const ttInput = overlay.querySelector('#lfm-setting-timeTolerance');
        if (ttSelect && ttInput) {
            ttSelect.addEventListener('change', () => {
                if (ttSelect.value === 'custom') {
                    ttInput.style.display = 'block';
                    ttInput.focus();
                } else {
                    ttInput.style.display = 'none';
                    ttInput.value = ttSelect.value;
                    // Trigger save manually for select change
                    syncAndSave();
                }
            });
        }

        // Close logic cleanup

        // Add dynamically sync listener FOR THE OPEN MODAL
        const storageListener = (changes, namespace) => {
            for (const [key, { newValue }] of Object.entries(changes)) {
                const el = overlay.querySelector(`#lfm-setting-${key}`);
                if (el) {
                    if (el.type === 'checkbox') el.checked = newValue;
                    else el.value = newValue;
                }
            }
        };

        if (typeof chrome !== 'undefined' && chrome.storage) {
            chrome.storage.onChanged.addListener(storageListener);
            // Ensure we remove listener when modal closes
            const originalClose = close;
            const newClose = () => {
                chrome.storage.onChanged.removeListener(storageListener);
                originalClose();
            };
            overlay.querySelector('.lfm-modal-close').onclick = newClose;
            overlay.querySelector('.lfm-btn-close').onclick = newClose;
        }
    }
};
