/**
 * Last.fm Manager - Actions
 * Handles scrobble selection and deletion operations
 */

const LfmActions = {
    async deleteSelected(detector) {
        const selected = Array.from(detector.getCheckboxes()).filter(cb => cb.checked);
        if (selected.length === 0) return;

        // Analyze selection risk
        let nonDuplicateCount = 0;
        selected.forEach(cb => {
            const row = cb.closest('tr');
            if (row && !row.classList.contains(detector.CONFIG.classes.duplicate)) {
                nonDuplicateCount++;
            }
        });

        // Construct warning message
        let warningMsg = null;
        if (nonDuplicateCount > 0) {
            warningMsg = `Warning: ${nonDuplicateCount} of these items are NOT duplicates! You are about to delete ORIGINAL scrobbles.`;
        }

        // Show confirmation modal based on setting
        const confirmLevel = detector.state.settings.confirmDelete || 'text';
        let confirmed = false;

        if (confirmLevel === 'none') {
            confirmed = true;
        } else {
            confirmed = await LfmUI.confirm({
                title: 'Delete Scrobbles',
                message: `You are about to permanently delete <strong>${selected.length}</strong> scrobbles. This action cannot be undone.`,
                confirmText: 'Delete',
                cancelText: 'Cancel',
                danger: true,
                warning: warningMsg,
                requireInput: confirmLevel === 'text' ? 'DELETE' : null
            });
        }

        if (!confirmed) {
            LfmUI.info('Deletion cancelled.');
            return;
        }

        // Show loading overlay
        const loading = LfmUI.showLoading(`Deleting scrobbles... 0/${selected.length}`);
        detector.log(`Starting deletion of ${selected.length} items...`);

        let deletedCount = 0;
        let errorCount = 0;

        for (const cb of selected) {
            const row = cb.closest('tr');
            if (row) {
                const form = row.querySelector('form[action$="/delete"]');
                const submit = form?.querySelector('button[type="submit"]');
                if (submit) {
                    try {
                        submit.click();
                        row.style.opacity = '0.2';
                        row.style.pointerEvents = 'none';
                        cb.checked = false;
                        deletedCount++;
                        loading.update(`Deleting scrobbles... ${deletedCount}/${selected.length}`);
                        loading.setProgress((deletedCount / selected.length) * 100);
                        // Small delay to avoid overwhelming Last.fm's server
                        await new Promise(r => setTimeout(r, 100));
                    } catch (err) {
                        errorCount++;
                        detector.log(`Error deleting row: ${err.message}`);
                    }
                }
            }
        }

        loading.hide();

        // Show result notification
        if (errorCount === 0) {
            LfmUI.success(`Successfully deleted ${deletedCount} scrobbles. Refreshing page...`);
        } else {
            LfmUI.warning(`Deleted ${deletedCount} scrobbles with ${errorCount} errors.`);
        }

        setTimeout(() => globalThis.location.reload(), 1500);
    },

    /**
     * Internal helper to select/deselect items based on a CSS class
     * @param {Object} detector 
     * @param {string|null} className - Class to filter by (null for all)
     * @param {boolean} inverse - If true, select items NOT matching the class
     */
    _toggleSelection(detector, className = null, inverse = false) {
        const checkboxes = detector.getCheckboxes();
        const targets = Array.from(checkboxes).filter(cb => {
            if (!className) return true;
            const hasClass = cb.closest('tr').classList.contains(className);
            return inverse ? !hasClass : hasClass;
        });

        if (targets.length === 0) return;

        const allChecked = targets.every(cb => cb.checked);
        const newState = !allChecked;

        targets.forEach(cb => cb.checked = newState);

        detector.log(`${newState ? 'Selecting' : 'Deselecting'} items.`);
        this.updateState(detector);
    },

    /**
     * Selects or deselects all scrobbles
     */
    selectAll(detector) {
        this._toggleSelection(detector);
    },

    /**
     * Deselects all scrobbles
     */
    deselectAll(detector) {
        const checkboxes = detector.getCheckboxes();
        checkboxes.forEach(cb => cb.checked = false);
        this.updateState(detector);
    },

    /**
     * Inverts the current selection
     */
    invertSelection(detector) {
        const checkboxes = detector.getCheckboxes();
        checkboxes.forEach(cb => cb.checked = !cb.checked);
        this.updateState(detector);
    },

    /**
     * Selects all identified duplicates
     */
    selectAllDuplicates(detector) {
        this._toggleSelection(detector, detector.CONFIG.classes.duplicate);
    },

    /**
     * Selects all identified original scrobbles
     */
    selectOriginals(detector) {
        this._toggleSelection(detector, detector.CONFIG.classes.duplicate, true);
    },

    /**
     * Internal helper to update detector state and trigger UI updates
     */
    updateState(detector) {
        detector.state.selectedCount = detector.getSelectedCount();
        detector.updateActionBar();
        globalThis.dispatchEvent(new CustomEvent('lfm-selection-change'));
    }
};
