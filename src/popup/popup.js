/**
 * Last.fm Manager - Popup Main Entry
 * Orchestrates SettingsManager and UIManager
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize UI
    UIManager.initTabs();
    UIManager.updateStats();

    // 2. Load Settings & Update UI
    SettingsManager.load((items) => {
        // Sync Checkboxes
        const checkboxMap = {
            'opt-colorize': items.colorize,
            'opt-autoSelect': items.autoSelect,
            'opt-fuzzyMatch': items.fuzzyMatch,
            'opt-enabled': items.enabled,
            'opt-debugMode': items.debugMode,
            'opt-hotkeysEnabled': items.hotkeysEnabled
        };

        Object.keys(checkboxMap).forEach(id => {
            UIManager.updateCheckbox(id, checkboxMap[id]);
        });

        // Toggle Body State
        UIManager.toggleDisabledState(!items.enabled);

        // Sync Selects
        const badgeModeSelect = document.getElementById('opt-badgeMode');
        if (badgeModeSelect) badgeModeSelect.value = items.badgeMode || 'both';

        const confirmDeleteSelect = document.getElementById('opt-confirmDelete');
        if (confirmDeleteSelect) confirmDeleteSelect.value = items.confirmDelete || 'text';

        // Time Tolerance Logic
        const toleranceSelect = document.getElementById('opt-time-tolerance');
        const customGroup = document.getElementById('custom-tolerance-group');
        const customInput = document.getElementById('opt-time-tolerance-custom');

        if (SettingsManager.PRESET_TOLERANCES.includes(items.timeTolerance)) {
            if (toleranceSelect) toleranceSelect.value = String(items.timeTolerance);
            if (customGroup) customGroup.style.display = 'none';
        } else {
            if (toleranceSelect) toleranceSelect.value = 'custom';
            if (customGroup) customGroup.style.display = 'flex';
            if (customInput) customInput.value = items.timeTolerance;
        }
    });

    // 3. Event Listeners for Settings Changes
    const mapIdToKey = {
        'opt-colorize': 'colorize',
        'opt-autoSelect': 'autoSelect',
        'opt-fuzzyMatch': 'fuzzyMatch',
        'opt-enabled': 'enabled',
        'opt-debugMode': 'debugMode',
        'opt-hotkeysEnabled': 'hotkeysEnabled'
    };

    Object.keys(mapIdToKey).forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('change', (e) => {
                const key = mapIdToKey[id];
                const val = e.target.checked;
                SettingsManager.save(key, val);
                if (key === 'enabled') UIManager.toggleDisabledState(!val);
            });
        }
    });

    // Select Changes
    ['opt-badgeMode', 'opt-confirmDelete'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('change', (e) => {
                SettingsManager.save(id.replace('opt-', ''), e.target.value);
            });
        }
    });

    // Tolerance Select
    const toleranceSelect = document.getElementById('opt-time-tolerance');
    const customGroup = document.getElementById('custom-tolerance-group');
    if (toleranceSelect) {
        toleranceSelect.addEventListener('change', (e) => {
            const val = e.target.value;
            if (val === 'custom') {
                if (customGroup) customGroup.style.display = 'flex';
            } else {
                if (customGroup) customGroup.style.display = 'none';
                SettingsManager.save('timeTolerance', Number.parseInt(val, 10));
            }
        });
    }

    // Custom Input
    const customInput = document.getElementById('opt-time-tolerance-custom');
    if (customInput) {
        customInput.addEventListener('change', (e) => {
            let val = Number.parseInt(e.target.value, 10);
            if (Number.isNaN(val) || val < 1) val = 1;
            if (val > 604800) val = 604800;
            e.target.value = val;
            SettingsManager.save('timeTolerance', val);
        });
    }

    // 4. Configuration Portability
    const exportBtn = document.getElementById('btn-export-settings');
    if (exportBtn) exportBtn.onclick = () => SettingsManager.export();

    const importBtn = document.getElementById('btn-import-settings');
    const fileInput = document.getElementById('file-import-settings');
    if (importBtn && fileInput) {
        importBtn.onclick = () => fileInput.click();
        fileInput.onchange = (e) => SettingsManager.import(e.target.files[0]);
    }

    // 5. External Change Sync (ignore self-changes)
    let ignoreNextChange = false;
    const originalSave = SettingsManager.save.bind(SettingsManager);
    SettingsManager.save = (key, value) => {
        ignoreNextChange = true;
        originalSave(key, value);
        setTimeout(() => { ignoreNextChange = false; }, 100);
    };

    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (ignoreNextChange) return;
        // External change detected, reload to sync
        location.reload();
    });
});
