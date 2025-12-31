/**
 * Last.fm Manager - Library Navigator
 * Handles daily stepping logic via UI buttons and Hotkeys
 */
const LfmNavigator = {
    /**
     * Navigates to the next or previous day
     * @param {number} directionalStep - 1 for next day, -1 for previous day
     */
    stepDay(directionalStep) {
        const url = new URL(globalThis.location.href);
        const fromDateStr = url.searchParams.get('from');
        const context = LfmEngine.getUrlContext();

        if (!context.user) return;

        let baseDate;
        if (fromDateStr) {
            baseDate = new Date(fromDateStr);
        } else {
            // If no date in URL, assume today
            baseDate = new Date();
        }

        // Add/Subtract 1 day (86400000 ms)
        const targetDate = new Date(baseDate.getTime() + (directionalStep * 86400000));
        const targetDateStr = targetDate.toISOString().split('T')[0];

        // Construct target URL
        // Format: /user/[USER]/library/tracks?from=[DATE]&rangetype=1day
        const targetUrl = `/user/${context.user}/library/tracks?from=${targetDateStr}&rangetype=1day`;

        // Navigate
        globalThis.location.href = targetUrl;
    },

    initHotkeys() {
        globalThis.addEventListener('keydown', (e) => {
            // Check if hotkeys are enabled in settings
            if (typeof LfmManager !== 'undefined' && !LfmManager.state.settings.hotkeysEnabled) return;

            // Only trigger if no input is focused
            if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

            // Arrow Right -> Next Day
            if (e.key === 'ArrowRight') {
                this.stepDay(1);
            }
            // Arrow Left -> Previous Day
            if (e.key === 'ArrowLeft') {
                this.stepDay(-1);
            }
        });
    }
};
