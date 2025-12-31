/**
 * Handles all settings-related logic: Loading, Saving, and Import/Export
 * Depends on shared/scripts/config.js (LfmConfig)
 */
const SettingsManager = {
    DEFAULT_SETTINGS: LfmConfig.DEFAULT_SETTINGS,
    PRESET_TOLERANCES: LfmConfig.PRESET_TOLERANCES,

    getStorage() {
        return chrome.storage ? (chrome.storage.sync || chrome.storage.local) : null;
    },

    async load(callback) {
        const storage = this.getStorage();
        if (!storage) return;

        storage.get(this.DEFAULT_SETTINGS, (items) => {
            callback(items);
        });
    },

    save(key, value) {
        const storage = this.getStorage();
        if (storage) {
            storage.set({ [key]: value });
        }
    },

    export() {
        const storage = this.getStorage();
        if (!storage) return;

        storage.get(null, (items) => {
            const blob = new Blob([JSON.stringify(items, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `lfm-settings-${Date.now()}.json`;
            a.click();
            URL.revokeObjectURL(url);
        });
    },

    async import(file) {
        const storage = this.getStorage();
        if (!storage || !file) return;

        try {
            const text = await file.text();
            const settings = JSON.parse(text);
            if (confirm('Importing settings will overwrite current configuration. Proceed?')) {
                storage.clear(() => {
                    storage.set(settings, () => {
                        location.reload();
                    });
                });
            }
        } catch (err) {
            console.error('Settings import error:', err);
            alert('Invalid settings file.');
        }
    }
};
