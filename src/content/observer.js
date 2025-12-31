/**
 * Last.fm Manager - Page Observer
 * Handles DOM mutations and URL changes for dynamic content
 */

const PageObserver = {
    currentUrl: null,
    scanTimeout: null,
    observer: null,

    /**
     * Schedule a rescan with debounce
     */
    scheduleRescan(callback) {
        if (this.scanTimeout) {
            clearTimeout(this.scanTimeout);
        }
        this.scanTimeout = setTimeout(callback, 500);
    },

    /**
     * Initialize the mutation observer
     */
    initMutationObserver(onContentChange) {
        this.observer = new MutationObserver((mutations) => {
            let shouldRescan = false;

            mutations.forEach(mutation => {
                if (mutation.addedNodes.length > 0) {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            if (node.matches && (
                                node.matches('tr.chartlist-row') ||
                                node.querySelector('tr.chartlist-row') ||
                                node.matches('table.chartlist') ||
                                node.querySelector('table.chartlist')
                            )) {
                                shouldRescan = true;
                            }
                        }
                    });
                }
            });

            if (shouldRescan) {
                this.scheduleRescan(onContentChange);
            }
        });

        const mainContent = document.querySelector('.page-content') || document.body;
        this.observer.observe(mainContent, {
            childList: true,
            subtree: true
        });
    },

    /**
     * Initialize URL change detection
     */
    initUrlWatcher(onUrlChange) {
        this.currentUrl = globalThis.location.href;

        // Check URL periodically (for pushState/replaceState)
        setInterval(() => {
            if (globalThis.location.href !== this.currentUrl) {
                console.log('[Last.fm Manager] URL changed, rescanning...');
                this.currentUrl = globalThis.location.href;

                // When URL changes, Last.fm might take a moment to load new rows.
                // We'll try to detect immediately, and then retry a few times to ensure we catch the new content.
                this.scheduleRescan(onUrlChange);

                let attempts = 0;
                const retryScan = setInterval(() => {
                    attempts++;
                    this.scheduleRescan(onUrlChange);
                    if (attempts >= 4) clearInterval(retryScan);
                }, 750);
            }
        }, 500);

        // Also listen for popstate (back/forward navigation)
        globalThis.addEventListener('popstate', () => {
            console.log('[Last.fm Manager] Navigation detected, rescanning...');
            this.scheduleRescan(onUrlChange);
        });
    },

    /**
     * Stop observing
     */
    disconnect() {
        if (this.observer) {
            this.observer.disconnect();
        }
        if (this.scanTimeout) {
            clearTimeout(this.scanTimeout);
        }
    }
};
