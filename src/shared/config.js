/**
 * Last.fm Manager - Shared Configuration & Defaults
 */
const LfmConfig = {
    DEFAULT_SETTINGS: {
        timeTolerance: 86400, // 1 day in seconds
        autoSelect: true,    // Auto-select duplicates on scan
        colorize: true,      // Highlight rows
        fuzzyMatch: false,   // Ignore "remastered", "feat", casing
        confirmDelete: 'text', // 'none', 'simple', 'text' (require DELETE)
        enabled: true,        // Global extension toggle
        badgeMode: 'both',    // 'both', 'icon_only', 'none'
        debugMode: false,     // Detailed console logs
        hotkeysEnabled: false  // Master toggle for keyboard shortcuts
    },

    PRESET_TOLERANCES: [60, 300, 1800, 3600, 86400],

    STORAGE_KEYS: {
        SETTINGS: 'lfm_settings'
    }
};

// Export for different environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LfmConfig;
} else if (typeof globalThis !== 'undefined') {
    globalThis.LfmConfig = LfmConfig;
}
