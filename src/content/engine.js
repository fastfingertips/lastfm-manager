/**
 * Last.fm Manager - Engine
 * Pure logic for scrobble data extraction and duplicate identification
 */

/**
 * Global helper to extract Unix timestamp from a chartlist row
 * @param {HTMLElement} row - The chartlist row element
 * @returns {number|null} - Unix timestamp or null
 */
function extractTimestamp(row) {
    const input = row.querySelector('input[name="timestamp"]');
    const value = Number.parseInt(input?.value, 10);
    if (!Number.isNaN(value)) {
        return value;
    }
    return null;
}

/**
 * Global helper to extract track and artist info from a chartlist row
 * Uses multiple fallback strategies for maximum compatibility
 * @param {HTMLElement} row - The chartlist row element
 * @param {Object} options - Optional settings
 * @param {boolean} options.includeUrls - Include URL fields (default: true)
 * @param {boolean} options.usePageHeader - Fall back to page header (default: true)
 * @returns {Object} - { trackName, artistName, trackUrl?, artistUrl? }
 */
function extractTrackInfo(row, options = {}) {
    const { includeUrls = true, usePageHeader = true } = options;
    const result = {
        trackName: null,
        artistName: null
    };

    if (includeUrls) {
        result.trackUrl = null;
        result.artistUrl = null;
    }

    // Priority 1: Play button data attributes (most reliable)
    const playButton = row.querySelector('[data-track-name]');
    if (playButton) {
        result.trackName = playButton.dataset.trackName || null;
        result.artistName = playButton.dataset.artistName || null;
        if (includeUrls) {
            result.trackUrl = playButton.dataset.trackUrl || null;
            result.artistUrl = playButton.dataset.artistUrl || null;
        }
    }

    // Priority 2: Cell text content
    if (!result.trackName || !result.artistName) {
        const trackCell = row.querySelector('.chartlist-name a, td.chartlist-name a');
        const artistCell = row.querySelector('.chartlist-artist a, td.chartlist-artist a');

        if (!result.trackName && trackCell) {
            result.trackName = trackCell.textContent?.trim() || null;
            if (includeUrls && !result.trackUrl) {
                result.trackUrl = trackCell.getAttribute('href') || null;
            }
        }
        if (!result.artistName && artistCell) {
            result.artistName = artistCell.textContent?.trim() || null;
            if (includeUrls && !result.artistUrl) {
                result.artistUrl = artistCell.getAttribute('href') || null;
            }
        }
    }

    // Priority 3: Delete form inputs (track-specific pages use different names)
    if (!result.trackName) {
        const trackInput = row.querySelector('input[name="track_name"]') || row.querySelector('input[name="track"]');
        result.trackName = trackInput?.value || null;
    }
    if (!result.artistName) {
        const artistInput = row.querySelector('input[name="artist_name"]') || row.querySelector('input[name="artist"]');
        result.artistName = artistInput?.value || null;
    }

    // Priority 4: Page header (for track-specific library pages)
    if (usePageHeader && (!result.trackName || !result.artistName)) {
        const headerPlaylink = document.querySelector('.library-header-image [data-track-name]');
        if (headerPlaylink) {
            if (!result.trackName) result.trackName = headerPlaylink.dataset.trackName || null;
            if (!result.artistName) result.artistName = headerPlaylink.dataset.artistName || null;
            if (includeUrls) {
                if (!result.trackUrl) result.trackUrl = headerPlaylink.dataset.trackUrl || null;
                if (!result.artistUrl) result.artistUrl = headerPlaylink.dataset.artistUrl || null;
            }
        }
    }

    return result;
}

const LfmEngine = {
    /**
     * Extracts artist, track, and user info from URL
     */
    getUrlContext() {
        const path = globalThis.location.pathname;
        const artistMatch = /\/library\/music\/([^/]+)/.exec(path);
        const trackMatch = /\/library\/music\/[^/]+\/_\/([^/?]+)/.exec(path);
        const userMatch = /\/user\/([^/]+)/.exec(path);

        return {
            artist: artistMatch ? decodeURIComponent(artistMatch[1].replaceAll('+', ' ')) : null,
            track: trackMatch ? decodeURIComponent(trackMatch[1].replaceAll('+', ' ')) : null,
            user: userMatch ? userMatch[1] : null
        };
    },

    /**
     * Determines if the viewed library belongs to the logged-in user
     * @returns {boolean}
     */
    isMyLibrary() {
        const context = this.getUrlContext();
        if (!context.user) return false;

        // Try to find the logged-in username from the nav
        const userLink = document.querySelector('.nav-user-link') ||
            document.querySelector('a[href^="/user/"] .nav-avatar');

        let loggedInUser = null;
        if (userLink) {
            const href = userLink.getAttribute('href') || '';
            const match = /\/user\/([^/]+)/.exec(href);
            if (match) loggedInUser = match[1];
        }

        // If we can't find the logged-in user, we assume it's NOT ours if we don't see delete forms
        if (!loggedInUser) {
            return document.querySelector('form[action$="/delete"]') !== null;
        }

        return context.user.toLowerCase() === loggedInUser.toLowerCase();
    },

    /**
     * Determines if current page is any kind of library page
     * @returns {boolean}
     */
    isLibraryPage() {
        return window.location.pathname.includes('/library');
    },

    /**
     * Extracts Unix timestamp from a chartlist row
     * @deprecated Use global extractTimestamp() instead
     */
    extractTimestampFromRow(row) {
        return extractTimestamp(row);
    },

    /**
     * Normalizes a string for fuzzy matching (removes feat, remastered, etc)
     * @param {string} str - Input string
     * @returns {string} - Normalized string
     */
    normalizeString(str) {
        if (!str) return '';
        return str.toLowerCase()
            .replaceAll(/\s+/g, ' ')
            .replaceAll(/\((?:remastered|remaster|20\d\d remastered|digital remastered)\)/gi, '')
            .replaceAll(/\[(?:remastered|remaster|20\d\d remastered|digital remastered)\]/gi, '')
            .replaceAll(/\((?:feat|ft)\.?\s+[^)]+\)/gi, '')
            .replaceAll(/\[(?:feat|ft)\.?\s+[^\]]+\]/gi, '')
            .replaceAll(/- (?:remastered|remaster|20\d\d remastered)/gi, '')
            .trim();
    },

    /**
     * Creates a unique key for a track (artist + track name only)
     */
    createTrackKey(track, artist, fuzzy = false) {
        if (!track || !artist) return null;
        if (fuzzy) {
            return `${this.normalizeString(artist)}::${this.normalizeString(track)}`;
        }
        return `${artist.toLowerCase().trim()}::${track.toLowerCase().trim()}`;
    },

    /**
     * Analyzes rows and identifies which are duplicates based on time tolerance
     * @param {NodeList|Array} rows - Chartlist rows
     * @param {Object} options - { toleranceSeconds, fuzzy }
     * @returns {Object} Results containing group maps and statistics
     */
    analyzeRows(rows, options = {}) {
        const { toleranceSeconds = 86400, fuzzy = false } = options;
        const trackMap = new Map();
        const context = this.getUrlContext();

        // First pass: collect all scrobble data with timestamps
        rows.forEach((row, index) => {
            // Use global extractTrackInfo helper (without page header for performance)
            const trackInfo = extractTrackInfo(row, { includeUrls: false, usePageHeader: false });

            // Fallback to URL context if row doesn't have artist (track-specific pages)
            const track = trackInfo.trackName || context.track;
            const artist = trackInfo.artistName || context.artist;
            const timestamp = extractTimestamp(row);

            if (track && artist && timestamp) {
                const key = this.createTrackKey(track, artist, fuzzy);
                if (!trackMap.has(key)) trackMap.set(key, []);
                trackMap.get(key).push({ row, index, timestamp });
            }
        });

        const groups = [];
        let totalDuplicates = 0;
        let totalOriginals = 0;

        // Second pass: group by time tolerance and identify duplicates
        trackMap.forEach((scrobbles) => {
            // Sort by timestamp ascending (oldest first)
            scrobbles.sort((a, b) => a.timestamp - b.timestamp);

            // Group scrobbles within the tolerance window
            const timeGroups = [];
            let currentGroup = [scrobbles[0]];

            for (let i = 1; i < scrobbles.length; i++) {
                const timeDiff = scrobbles[i].timestamp - currentGroup[0].timestamp;

                if (timeDiff <= toleranceSeconds) {
                    // Within tolerance, add to current group
                    currentGroup.push(scrobbles[i]);
                } else {
                    // Outside tolerance, start new group
                    if (currentGroup.length > 0) {
                        timeGroups.push(currentGroup);
                    }
                    currentGroup = [scrobbles[i]];
                }
            }
            // Don't forget the last group
            if (currentGroup.length > 0) {
                timeGroups.push(currentGroup);
            }

            // Process each time-based group
            timeGroups.forEach((group) => {
                if (group.length === 1) {
                    // Single scrobble, not a duplicate
                    totalOriginals++;
                    groups.push([{
                        ...group[0],
                        isDuplicate: false
                    }]);
                } else {
                    // Multiple scrobbles in tolerance window
                    // Sort descending by index (oldest in DOM = higher index = original)
                    group.sort((a, b) => b.index - a.index);

                    const processedGroup = group.map((entry, i) => {
                        const isDuplicate = i > 0;
                        if (isDuplicate) totalDuplicates++;
                        else totalOriginals++;

                        return {
                            ...entry,
                            isDuplicate
                        };
                    });

                    groups.push(processedGroup);
                }
            });
        });

        return {
            groups,
            stats: {
                originals: totalOriginals,
                duplicates: totalDuplicates
            }
        };
    }
};
