/**
 * Last.fm Manager - Content Script Entry Point
 * Initializes the extension and sets up communication
 */

(function () {
    'use strict';

    /**
     * Wait until DOM stops changing for a specified duration
     * @param {Function} callback - Called when DOM is stable
     * @param {number} stableTime - How long (ms) DOM must be unchanged to be considered stable
     */
    function waitForDomStability(callback, stableTime = 300) {
        let stabilityTimer = null;
        let callbackCalled = false;

        const executeCallback = () => {
            if (callbackCalled) return;
            callbackCalled = true;
            observer.disconnect();
            callback();
        };

        const observer = new MutationObserver(() => {
            if (stabilityTimer) clearTimeout(stabilityTimer);
            stabilityTimer = setTimeout(executeCallback, stableTime);
        });

        observer.observe(document.body, { childList: true, subtree: true });

        // Max wait time (3 seconds) in case page never stabilizes
        setTimeout(executeCallback, 3000);

        // Initial timer in case page is already stable
        stabilityTimer = setTimeout(executeCallback, stableTime);
    }

    /**
     * Initialize the extension
     */
    function init() {
        console.log('[Last.fm Manager] Initializing...');

        // Initialize SVG sprite system if available
        if (typeof LfmIcons !== 'undefined' && LfmIcons.initSprite) {
            LfmIcons.initSprite();
        }

        // Initialize core manager
        if (typeof LfmManager !== 'undefined') {
            LfmManager.init();

            // Initialize navigation hotkeys
            if (typeof LfmNavigator !== 'undefined') {
                LfmNavigator.initHotkeys();
            }

            // Set up page observers
            const handleRescan = () => {
                LfmManager.reset();
                LfmManager.detect();
            };

            PageObserver.initMutationObserver(handleRescan);
            PageObserver.initUrlWatcher(handleRescan);

            // Listen for manual rescan requests
            globalThis.addEventListener('lfm-rescan-duplicates', handleRescan);

            // Wait for DOM to stabilize before initial scan
            waitForDomStability(() => {
                console.log('[Last.fm Manager] DOM stable, starting initial scan...');
                LfmManager.detect();
            });
        }
    }

    // Listen for messages from popup
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (typeof LfmManager === 'undefined') return;

        if (request.action === 'getStats') {
            const stats = LfmManager.getStats();
            sendResponse({ success: true, ...stats });
        } else if (request.action === 'rescan') {
            LfmManager.reset();
            // Handle async detect properly
            LfmManager.detect().then(results => {
                sendResponse({ success: true, ...results });
            });
            return true;
        } else if (request.action === 'navigateDay') {
            if (typeof LfmNavigator !== 'undefined') {
                LfmNavigator.stepDay(request.step);
            }
        }
        return true;
    });

    // Start when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
