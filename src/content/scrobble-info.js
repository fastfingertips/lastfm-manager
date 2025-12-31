/**
 * Last.fm Manager - Scrobble Info
 * Detailed scrobble metadata inspection tool
 * Supports both main library (/user/X/library) and track-specific (/user/X/library/music/.../Track) pages
 */

/**
 * Extracts all available metadata from a scrobble row
 * @param {HTMLElement} row - The chartlist row element
 * @returns {Object} - Object containing all extracted scrobble data
 */
function extractScrobbleInfo(row) {
    const info = {};

    // Scrobble Technical Info
    info.scrobbleId = row.dataset.editScrobbleId || null;

    // Timestamp from delete form (uses global extractTimestamp from engine.js)
    info.timestamp = extractTimestamp(row);
    info.dateFormatted = info.timestamp ? new Date(info.timestamp * 1000).toLocaleString() : null;

    // Track Spelling ID (main library only)
    const trackSpellingInput = row.querySelector('input[name="track_spelling_id"]');
    info.trackSpellingId = trackSpellingInput ? trackSpellingInput.value : null;

    // Toggle Button Group ID (love state sync)
    const loveToggle = row.querySelector('[data-toggle-button-group-id]');
    info.toggleGroupId = loveToggle?.dataset.toggleButtonGroupId || null;

    // === Spotify Info ===
    // Try row first, then fallback to page header
    let spotifyLink = row.querySelector('[data-spotify-id]');
    if (!spotifyLink) {
        spotifyLink = document.querySelector('.library-header-image [data-spotify-id]');
    }
    if (spotifyLink) {
        info.spotifyId = spotifyLink.dataset.spotifyId;
        info.spotifyUrl = spotifyLink.dataset.spotifyUrl;
    }

    // === YouTube Info ===
    // Try row first, then fallback to page header
    let youtubeLink = row.querySelector('[data-youtube-id]');
    if (!youtubeLink) {
        youtubeLink = document.querySelector('.library-header-image [data-youtube-id]');
    }
    if (youtubeLink) {
        info.youtubeId = youtubeLink.dataset.youtubeId;
        info.youtubeUrl = youtubeLink.dataset.youtubeUrl;
    }

    // === Apple Music / iTunes Info ===
    const appleMusicLink = row.querySelector('.buylink--itunes');
    if (appleMusicLink) {
        info.appleMusicUrl = appleMusicLink.href;
        const urlMatch = appleMusicLink.href.match(/album\/(\d+)\?i=(\d+)/);
        if (urlMatch) {
            info.appleMusicAlbumId = urlMatch[1];
            info.appleMusicTrackId = urlMatch[2];
        }
    }

    // === Amazon Music Info ===
    const amazonLink = row.querySelector('.buylink--amazon');
    if (amazonLink) {
        info.amazonUrl = amazonLink.href;
    }

    // === Track Info ===
    // Uses global extractTrackInfo from engine.js with all fallback strategies
    const trackInfo = extractTrackInfo(row, { includeUrls: true, usePageHeader: true });
    info.trackName = trackInfo.trackName;
    info.artistName = trackInfo.artistName;
    info.trackUrl = trackInfo.trackUrl;
    info.artistUrl = trackInfo.artistUrl;

    // === Album Info ===
    // Try row first (chartlist-image), then chartlist-album cell, then page header
    const albumImage = row.querySelector('.chartlist-image a');
    const albumImg = row.querySelector('.chartlist-image img');
    if (albumImage) {
        info.albumUrl = albumImage.getAttribute('href');
        info.albumName = albumImg?.alt || null;
        info.albumArtUrl = albumImg?.src || null;
    } else {
        // Track-specific pages have album in chartlist-album cell
        const albumCell = row.querySelector('.chartlist-album a');
        if (albumCell) {
            info.albumName = albumCell.textContent?.trim() || null;
            info.albumUrl = albumCell.getAttribute('href') || null;
        }
    }

    // Fallback album art from page header
    if (!info.albumArtUrl) {
        const headerImg = document.querySelector('.library-header-image img');
        if (headerImg) {
            info.albumArtUrl = headerImg.src;
            if (!info.albumName) info.albumName = headerImg.alt;
        }
    }

    // === Love Status ===
    // Try row first, then page header
    let loveStateEl = row.querySelector('[data-toggle-button-current-state]');
    if (loveStateEl) {
        info.loveStatus = loveStateEl.dataset.toggleButtonCurrentState || null;
    } else {
        loveStateEl = document.querySelector('.library-header-ctas [data-ajax-form-state]');
        if (loveStateEl) {
            // On track pages, love status is determined by which form is visible
            const isLoved = loveStateEl.querySelector('.love-button--loved');
            info.loveStatus = isLoved ? 'loved' : 'unloved';
        }
    }

    // === Timestamp Display ===
    const timestampSpan = row.querySelector('.chartlist-timestamp span');
    if (timestampSpan) {
        info.relativeTime = timestampSpan.textContent?.trim();
        info.fullDateTime = timestampSpan.getAttribute('title');
    }

    // === Status Flags ===
    info.isDuplicate = row.classList.contains('lfm-row-duplicate');
    info.hasArtist = row.classList.contains('chartlist-row--with-artist');
    info.hasBuylinks = row.classList.contains('chartlist-row--with-buylinks');

    // Detect page type
    info.pageType = document.querySelector('.library-header-image') ? 'track-specific' : 'main-library';

    return info;
}

/**
 * Shows scrobble info in a modal
 * @param {Object} info - Scrobble info object from extractScrobbleInfo
 */
function showScrobbleInfoModal(info) {
    const infoIcon = getIcon('info');
    const copyIcon = getIcon('copy');
    const heartIcon = getIcon('heart');
    const heartOffIcon = getIcon('heartOff');
    const warningIcon = getIcon('warning');
    const spotifyIcon = getIcon('spotify');
    const youtubeIcon = getIcon('youtube');
    const appleIcon = getIcon('apple');
    const amazonIcon = getIcon('amazon');
    const externalIcon = getIcon('externalLink');

    // Build info rows (only show if data exists)
    const rows = [];
    // ... (rest of the row building logic remains same)
    // Scrobble Section
    rows.push('<div class="lfm-info-section"><h4>Scrobble Info</h4>');
    if (info.scrobbleId) rows.push(`<div class="lfm-info-row"><span class="lfm-info-label">Scrobble ID</span><span class="lfm-info-value lfm-copyable" data-copy="${info.scrobbleId}">${info.scrobbleId.substring(0, 16)}...</span></div>`);
    if (info.timestamp) rows.push(`<div class="lfm-info-row"><span class="lfm-info-label">Unix Timestamp</span><span class="lfm-info-value lfm-copyable" data-copy="${info.timestamp}">${info.timestamp}</span></div>`);
    if (info.dateFormatted) rows.push(`<div class="lfm-info-row"><span class="lfm-info-label">Date</span><span class="lfm-info-value">${info.dateFormatted}</span></div>`);
    if (info.fullDateTime) rows.push(`<div class="lfm-info-row"><span class="lfm-info-label">Full DateTime</span><span class="lfm-info-value">${info.fullDateTime}</span></div>`);
    if (info.trackSpellingId) rows.push(`<div class="lfm-info-row"><span class="lfm-info-label">Track Spelling ID</span><span class="lfm-info-value lfm-copyable" data-copy="${info.trackSpellingId}">${info.trackSpellingId}</span></div>`);
    if (info.toggleGroupId) rows.push(`<div class="lfm-info-row"><span class="lfm-info-label">Toggle Group ID</span><span class="lfm-info-value lfm-copyable" data-copy="${info.toggleGroupId}">${info.toggleGroupId.substring(0, 12)}...</span></div>`);
    if (info.loveStatus) rows.push(`<div class="lfm-info-row"><span class="lfm-info-label">Love Status</span><span class="lfm-info-value lfm-status-${info.loveStatus}"><span class="lfm-inline-icon">${info.loveStatus === 'loved' ? heartIcon : heartOffIcon}</span> ${info.loveStatus === 'loved' ? 'Loved' : 'Not loved'}</span></div>`);
    if (info.isDuplicate) rows.push(`<div class="lfm-info-row"><span class="lfm-info-label">Status</span><span class="lfm-info-value lfm-status-duplicate"><span class="lfm-inline-icon">${warningIcon}</span> Duplicate</span></div>`);
    rows.push('</div>');

    // Track Section
    rows.push(
        '<div class="lfm-info-section"><h4>Track Info</h4>',
        info.trackName ? `<div class="lfm-info-row"><span class="lfm-info-label">Track</span><span class="lfm-info-value">${info.trackName}</span></div>` : '',
        info.artistName ? `<div class="lfm-info-row"><span class="lfm-info-label">Artist</span><span class="lfm-info-value">${info.artistName}</span></div>` : '',
        info.albumName ? `<div class="lfm-info-row"><span class="lfm-info-label">Album</span><span class="lfm-info-value">${info.albumName}</span></div>` : '',
        '</div>'
    );

    // Streaming Section
    const hasStreaming = info.spotifyId || info.youtubeId || info.appleMusicUrl || info.amazonUrl;
    if (hasStreaming) {
        rows.push('<div class="lfm-info-section"><h4>Streaming & Buy Links</h4>');
        if (info.spotifyId) rows.push(`<div class="lfm-info-row"><span class="lfm-info-label">Spotify ID</span><span class="lfm-info-value lfm-copyable" data-copy="${info.spotifyId}">${info.spotifyId}</span></div>`);
        if (info.spotifyUrl) rows.push(`<div class="lfm-info-row"><span class="lfm-info-label">Spotify</span><a href="${info.spotifyUrl}" target="_blank" class="lfm-info-link"><span class="lfm-inline-icon lfm-icon-spotify">${spotifyIcon}</span> Open <span class="lfm-inline-icon">${externalIcon}</span></a></div>`);
        if (info.youtubeId) rows.push(`<div class="lfm-info-row"><span class="lfm-info-label">YouTube ID</span><span class="lfm-info-value lfm-copyable" data-copy="${info.youtubeId}">${info.youtubeId}</span></div>`);
        if (info.youtubeUrl) rows.push(`<div class="lfm-info-row"><span class="lfm-info-label">YouTube</span><a href="${info.youtubeUrl}" target="_blank" class="lfm-info-link"><span class="lfm-inline-icon lfm-icon-youtube">${youtubeIcon}</span> Open <span class="lfm-inline-icon">${externalIcon}</span></a></div>`);
        if (info.appleMusicAlbumId) rows.push(`<div class="lfm-info-row"><span class="lfm-info-label">Apple Album ID</span><span class="lfm-info-value lfm-copyable" data-copy="${info.appleMusicAlbumId}">${info.appleMusicAlbumId}</span></div>`);
        if (info.appleMusicTrackId) rows.push(`<div class="lfm-info-row"><span class="lfm-info-label">Apple Track ID</span><span class="lfm-info-value lfm-copyable" data-copy="${info.appleMusicTrackId}">${info.appleMusicTrackId}</span></div>`);
        if (info.appleMusicUrl) rows.push(`<div class="lfm-info-row"><span class="lfm-info-label">Apple Music</span><a href="${info.appleMusicUrl}" target="_blank" class="lfm-info-link"><span class="lfm-inline-icon lfm-icon-apple">${appleIcon}</span> Open <span class="lfm-inline-icon">${externalIcon}</span></a></div>`);
        if (info.amazonUrl) rows.push(`<div class="lfm-info-row"><span class="lfm-info-label">Amazon</span><a href="${info.amazonUrl}" target="_blank" class="lfm-info-link"><span class="lfm-inline-icon lfm-icon-amazon">${amazonIcon}</span> Search <span class="lfm-inline-icon">${externalIcon}</span></a></div>`);
        rows.push('</div>');
    }

    // Album Art
    if (info.albumArtUrl) {
        rows.push(
            '<div class="lfm-info-section"><h4>Album Art</h4>',
            `<div class="lfm-info-album-art"><img src="${info.albumArtUrl.replace('/64s/', '/300x300/')}" alt="${info.albumName || 'Album'}" /></div>`,
            '</div>'
        );
    }

    // Use LfmUI.baseModal if available, otherwise fallback to local creation
    if (typeof LfmUI !== 'undefined' && LfmUI.baseModal) {
        const { overlay } = LfmUI.baseModal({
            id: 'lfm-scrobble-info-modal',
            modalClass: 'lfm-info-modal',
            title: 'Scrobble Details',
            titleIcon: infoIcon,
            headerActions: '<span class="lfm-modal-hint">ESC to close</span>',
            bodyContent: rows.join(''),
            bodyClass: 'lfm-info-body lfm-info-grid',
            footerContent: `
                <button class="lfm-btn lfm-btn-secondary lfm-copy-all-btn">
                    <span class="lfm-icon">${copyIcon}</span> Copy All as JSON
                </button>
            `
        });

        setupModalInteractions(overlay, info);
    } else {
        // Fallback for safety (though LfmUI should be there)
        createLocalModal(info, rows, { infoIcon, copyIcon });
    }
}

/**
 * Common setup for modal interactions (copy buttons, etc)
 */
function setupModalInteractions(overlay, info) {
    // Copy individual values
    overlay.querySelectorAll('.lfm-copyable').forEach(el => {
        el.style.cursor = 'pointer';
        el.title = 'Click to copy';
        el.onclick = () => {
            navigator.clipboard.writeText(el.dataset.copy);
            el.classList.add('lfm-copied');
            setTimeout(() => el.classList.remove('lfm-copied'), 1000);
        };
    });

    // Copy all as JSON
    const copyAllBtn = overlay.querySelector('.lfm-copy-all-btn');
    if (copyAllBtn) {
        copyAllBtn.onclick = () => {
            navigator.clipboard.writeText(JSON.stringify(info, null, 2));
            if (typeof LfmUI !== 'undefined' && LfmUI.success) {
                LfmUI.success('Copied to clipboard!');
            }
        };
    }
}

/**
 * Fallback modal creation if LfmUI is not fully loaded
 */
function createLocalModal(info, rows, icons) {
    const { infoIcon, copyIcon } = icons;
    const modal = document.createElement('div');
    modal.id = 'lfm-scrobble-info-modal';
    modal.className = 'lfm-modal-overlay';

    const closeIcon = getIcon('close');

    modal.innerHTML = `
        <div class="lfm-modal lfm-info-modal">
            <div class="lfm-modal-header">
                <h3><span class="lfm-modal-icon">${infoIcon}</span> Scrobble Details</h3>
                <div class="lfm-modal-header-actions">
                    <span class="lfm-modal-hint">ESC to close</span>
                    <button class="lfm-modal-close" title="Close (ESC)">${closeIcon}</button>
                </div>
            </div>
            <div class="lfm-modal-body lfm-info-body lfm-info-grid">
                ${rows.join('')}
            </div>
            <div class="lfm-modal-footer">
                <button class="lfm-btn lfm-btn-secondary lfm-copy-all-btn">
                    <span class="lfm-icon">${copyIcon}</span> Copy All as JSON
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    const closeModal = () => modal.remove();
    modal.querySelector('.lfm-modal-close').onclick = closeModal;
    modal.onclick = (e) => { if (e.target === modal) closeModal(); };

    if (typeof LfmUI !== 'undefined' && LfmUI.onEscape) {
        LfmUI.onEscape(closeModal);
    }

    setupModalInteractions(modal, info);
}

/**
 * Injects "Scrobble Details" button into a row's more menu
 * @param {HTMLElement} row - The chartlist row element
 */
function injectMoreMenuInfo(row) {
    const moreMenu = row.querySelector('.chartlist-more-menu');
    if (!moreMenu) return;

    // Check if already injected
    if (moreMenu.querySelector('.lfm-scrobble-info-btn')) return;

    const infoIcon = getIcon('info');

    const li = document.createElement('li');
    li.className = 'lfm-more-menu-item';
    li.innerHTML = `
        <button class="mimic-link dropdown-menu-clickable-item lfm-scrobble-info-btn">
            ${infoIcon ? `<span class="lfm-menu-icon">${infoIcon}</span>` : ''} Scrobble Details
        </button>
    `;

    li.querySelector('button').onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();

        // Close the dropdown menu
        const trigger = row.querySelector('.chartlist-more-button');
        if (trigger) {
            trigger.setAttribute('aria-expanded', 'false');
            trigger.classList.remove('disclose-active');
        }
        moreMenu.classList.add('disclose-hide');
        moreMenu.style.removeProperty('top');
        moreMenu.style.removeProperty('left');
        moreMenu.style.removeProperty('right');

        // Show our modal
        const info = extractScrobbleInfo(row);
        showScrobbleInfoModal(info);
    };

    // Insert at the beginning of the menu
    moreMenu.insertBefore(li, moreMenu.firstChild);
}
