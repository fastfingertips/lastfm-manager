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

        let baseDate;
        if (fromDateStr) {
            // Split YYYY-MM-DD to avoid timezone shifts
            const parts = fromDateStr.split('-');
            baseDate = new Date(parts[0], parts[1] - 1, parts[2]);
        } else {
            baseDate = new Date();
        }

        if (isNaN(baseDate.getTime())) baseDate = new Date();

        // Add/Subtract days
        const targetDate = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate() + directionalStep);

        // Format to YYYY-MM-DD
        const y = targetDate.getFullYear();
        const m = String(targetDate.getMonth() + 1).padStart(2, '0');
        const d = String(targetDate.getDate()).padStart(2, '0');
        const targetDateStr = `${y}-${m}-${d}`;

        // Update search params without losing rest of the URL structure
        url.searchParams.set('from', targetDateStr);
        url.searchParams.set('to', targetDateStr);
        url.searchParams.set('rangetype', '1day');

        // Navigate
        globalThis.location.href = url.toString();
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
