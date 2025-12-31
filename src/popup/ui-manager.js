/**
 * Handles UI interactions, tabs, and state updates
 */
const UIManager = {
    initTabs() {
        const btns = document.querySelectorAll('.tab-btn');
        const contents = document.querySelectorAll('.tab-content');

        btns.forEach(btn => {
            btn.addEventListener('click', () => {
                const target = btn.dataset.tab;
                btns.forEach(b => b.classList.remove('active'));
                contents.forEach(c => c.classList.remove('active'));

                btn.classList.add('active');
                const content = document.getElementById(`tab-${target}`);
                if (content) content.classList.add('active');
            });
        });
    },

    updateCheckbox(id, value) {
        const el = document.getElementById(id);
        if (el) el.checked = !!value;
    },

    toggleDisabledState(isDisabled) {
        document.body.classList.toggle('is-disabled', isDisabled);
    },

    updateStats(callback) {
        if (typeof chrome === 'undefined' || !chrome.tabs) return;

        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, { action: 'getStats' }, (response) => {
                    const moduleContainer = document.getElementById('scrobble-module-container');
                    const isActive = !!(response && response.success);

                    if (moduleContainer) {
                        moduleContainer.classList.toggle('is-inactive', !isActive);
                    }
                    if (callback) callback(response);
                });
            }
        });
    }
};
