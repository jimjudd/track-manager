// ABOUTME: Tracks view for browsing and filtering all tracks across programs
// ABOUTME: Provides search, filtering by track type, and inline rating functionality

// Date formatting constants
const MS_PER_DAY = 1000 * 60 * 60 * 24;
const DAYS_PER_WEEK = 7;
const DAYS_PER_MONTH = 30;
const DAYS_PER_YEAR = 365;

export class TracksView {
    constructor(container) {
        this.container = container;
        this.currentFilter = 'all';
        this.currentProgramFilter = 'all';
        this.searchQuery = '';
        this.currentSort = 'lastUsed'; // Default sort
        this.tracks = [];
        this.eventListeners = [];
    }

    async render() {
        this.cleanup();

        // Check if user is signed in
        if (!window.db) {
            this.container.innerHTML = `
                <div class="tracks-view">
                    <div class="tracks-header">
                        <h1>Tracks</h1>
                    </div>
                    <div class="tracks-list">
                        <p class="empty-state">Please sign in to view your tracks.</p>
                    </div>
                </div>
            `;
            return;
        }

        try {
            await this.loadTracks();
            const trackTypes = await this.getTrackTypes();
            const programs = await window.db.programs.toArray();

            this.container.innerHTML = `
                <div class="tracks-view">
                    <div class="tracks-header">
                        <h1>Tracks</h1>
                        <div class="tracks-controls">
                            <div class="filter-group">
                                <label for="track-program-filter">Program:</label>
                                <select id="track-program-filter" aria-label="Filter by program">
                                    <option value="all">All Programs</option>
                                    ${programs.map(program => `
                                        <option value="${program.id}">${this.escapeHtml(program.name)}</option>
                                    `).join('')}
                                </select>
                            </div>
                            <div class="filter-group">
                                <label for="track-type-filter">Track Type:</label>
                                <select id="track-type-filter" aria-label="Filter by track type">
                                    <option value="all">All Tracks</option>
                                    ${trackTypes.map(type => `
                                        <option value="${this.escapeHtml(type)}">${this.escapeHtml(type)}</option>
                                    `).join('')}
                                </select>
                            </div>
                            <div class="sort-group">
                                <label for="track-sort">Sort by:</label>
                                <select id="track-sort" aria-label="Sort tracks">
                                    <option value="lastUsed">Last Used (Recent First)</option>
                                    <option value="rating">Rating (Highest First)</option>
                                    <option value="releaseNumber">Release Number (Newest First)</option>
                                    <option value="songTitle">Song Title (A-Z)</option>
                                </select>
                            </div>
                            <div class="search-group">
                                <label for="track-search">Search:</label>
                                <input
                                    type="search"
                                    id="track-search"
                                    placeholder="Song, artist, or release..."
                                    aria-label="Search tracks by song, artist, or release number"
                                />
                            </div>
                        </div>
                    </div>

                    <div class="tracks-list" role="list">
                        ${this.renderTracksList()}
                    </div>
                </div>
            `;

            this.attachEventListeners();
        } catch (error) {
            console.error('Error rendering tracks view:', error);
            this.container.innerHTML = `
                <div class="error-state">
                    <p>Error loading tracks. Please try refreshing the page.</p>
                </div>
            `;
        }
    }

    async loadTracks() {
        try {
            const tracksFromDb = await window.db.tracks.toArray();

            // Enrich tracks with release and program data
            this.tracks = await Promise.all(tracksFromDb.map(async (track) => {
                const release = await window.db.releases.get(track.releaseId);
                let programName = 'Unknown Program';
                let programId = null;

                if (release) {
                    const program = await window.db.programs.get(release.programId);
                    if (program) {
                        programName = program.name;
                        programId = program.id;
                    }
                }

                return {
                    ...track,
                    releaseNumber: release ? release.releaseNumber : 'Unknown',
                    programName: programName,
                    programId: programId
                };
            }));
        } catch (error) {
            console.error('Error loading tracks:', error);
            this.tracks = [];
        }
    }

    async getTrackTypes() {
        try {
            const programs = await window.db.programs.toArray();
            const typesSet = new Set();

            programs.forEach(program => {
                if (Array.isArray(program.trackTypes)) {
                    program.trackTypes.forEach(type => typesSet.add(type));
                }
            });

            return Array.from(typesSet).sort();
        } catch (error) {
            console.error('Error getting track types:', error);
            return [];
        }
    }

    renderTracksList() {
        const filteredTracks = this.getFilteredTracks();
        const sortedTracks = this.getSortedTracks(filteredTracks);

        if (sortedTracks.length === 0) {
            return `
                <div class="empty-state">
                    <p>No tracks found matching your search criteria.</p>
                </div>
            `;
        }

        return sortedTracks.map(track => `
            <div class="track-card" role="listitem" data-track-id="${track.id}">
                <div class="track-header">
                    <span class="track-type-badge">${this.escapeHtml(track.trackType)}</span>
                    <span class="track-release">Release ${this.escapeHtml(String(track.releaseNumber))}</span>
                </div>
                <div class="track-info">
                    <h3 class="track-title">${this.escapeHtml(track.songTitle)}</h3>
                    ${track.artist ? `<p class="track-artist">${this.escapeHtml(track.artist)}</p>` : ''}
                    <p class="track-program">${this.escapeHtml(track.programName)}</p>
                </div>
                <div class="track-footer">
                    <div class="track-rating" role="group" aria-label="Rate track from 1 to 5 stars">
                        ${this.renderStarRating(track.rating, track.id)}
                    </div>
                    <div class="track-last-used">
                        ${track.lastUsed ? `Last used: ${this.formatLastUsed(track.lastUsed)}` : 'Never used'}
                    </div>
                </div>
            </div>
        `).join('');
    }

    renderStarRating(currentRating, trackId) {
        const stars = [];
        for (let i = 1; i <= 5; i++) {
            const filled = i <= currentRating;
            stars.push(`
                <button
                    class="star ${filled ? 'filled' : ''}"
                    data-track-id="${trackId}"
                    data-rating="${i}"
                    aria-label="Rate ${i} star${i > 1 ? 's' : ''}"
                    aria-pressed="${filled}"
                >
                    ${filled ? '★' : '☆'}
                </button>
            `);
        }
        return stars.join('');
    }

    getFilteredTracks() {
        let filtered = this.tracks;

        // Filter by program
        if (this.currentProgramFilter !== 'all') {
            const programId = parseInt(this.currentProgramFilter);
            filtered = filtered.filter(track => track.programId === programId);
        }

        // Filter by track type
        if (this.currentFilter !== 'all') {
            filtered = filtered.filter(track => track.trackType === this.currentFilter);
        }

        // Filter by search query
        if (this.searchQuery) {
            const query = this.searchQuery.toLowerCase();
            filtered = filtered.filter(track => {
                const songMatch = track.songTitle.toLowerCase().includes(query);
                const artistMatch = track.artist && track.artist.toLowerCase().includes(query);
                const releaseMatch = String(track.releaseNumber).includes(query);
                return songMatch || artistMatch || releaseMatch;
            });
        }

        return filtered;
    }

    getSortedTracks(tracks) {
        const sorted = [...tracks]; // Don't mutate original array

        switch (this.currentSort) {
            case 'lastUsed':
                return sorted.sort((a, b) => {
                    if (!a.lastUsed && !b.lastUsed) return 0;
                    if (!a.lastUsed) return 1; // null last
                    if (!b.lastUsed) return -1; // null last
                    return new Date(b.lastUsed) - new Date(a.lastUsed); // Most recent first
                });

            case 'rating':
                return sorted.sort((a, b) => {
                    const ratingA = a.rating || 0;
                    const ratingB = b.rating || 0;
                    if (ratingB !== ratingA) {
                        return ratingB - ratingA; // Highest first
                    }
                    // Secondary sort by song title for consistency
                    return a.songTitle.localeCompare(b.songTitle);
                });

            case 'releaseNumber':
                return sorted.sort((a, b) => {
                    // Handle 'Unknown' release numbers
                    const releaseA = typeof a.releaseNumber === 'number' ? a.releaseNumber : -1;
                    const releaseB = typeof b.releaseNumber === 'number' ? b.releaseNumber : -1;

                    if (releaseB !== releaseA) {
                        return releaseB - releaseA; // Newest first
                    }
                    // Secondary sort by track type
                    return a.trackType.localeCompare(b.trackType);
                });

            case 'songTitle':
                return sorted.sort((a, b) => a.songTitle.localeCompare(b.songTitle));

            default:
                return sorted;
        }
    }

    attachEventListeners() {
        // Program filter change handler
        const programFilterSelect = document.getElementById('track-program-filter');
        const programFilterChangeHandler = (e) => {
            this.currentProgramFilter = e.target.value;
            this.updateTracksList();
        };
        this.addEventListener(programFilterSelect, 'change', programFilterChangeHandler);

        // Track type filter change handler
        const filterSelect = document.getElementById('track-type-filter');
        const filterChangeHandler = (e) => {
            this.currentFilter = e.target.value;
            this.updateTracksList();
        };
        this.addEventListener(filterSelect, 'change', filterChangeHandler);

        // Sort change handler
        const sortSelect = document.getElementById('track-sort');
        if (sortSelect) {
            sortSelect.value = this.currentSort;
            const sortChangeHandler = (e) => {
                this.currentSort = e.target.value;
                this.updateTracksList();
            };
            this.addEventListener(sortSelect, 'change', sortChangeHandler);
        }

        // Search input handler
        const searchInput = document.getElementById('track-search');
        const searchInputHandler = (e) => {
            this.searchQuery = e.target.value;
            this.updateTracksList();
        };
        this.addEventListener(searchInput, 'input', searchInputHandler);

        // Star rating handlers
        const tracksList = this.container.querySelector('.tracks-list');
        const starClickHandler = async (e) => {
            if (e.target.classList.contains('star')) {
                const trackId = parseInt(e.target.dataset.trackId);
                const rating = parseInt(e.target.dataset.rating);
                await this.handleRating(trackId, rating);
            }
        };
        this.addEventListener(tracksList, 'click', starClickHandler);

        // Star rating keyboard handlers (for accessibility)
        const starKeydownHandler = async (e) => {
            if (e.target.classList.contains('star') && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault();
                const trackId = parseInt(e.target.dataset.trackId);
                const rating = parseInt(e.target.dataset.rating);
                await this.handleRating(trackId, rating);
            }
        };
        this.addEventListener(tracksList, 'keydown', starKeydownHandler);
    }

    updateTracksList() {
        const tracksList = this.container.querySelector('.tracks-list');
        if (tracksList) {
            tracksList.innerHTML = this.renderTracksList();
        }
    }

    async handleRating(trackId, rating) {
        try {
            const track = await window.db.tracks.get(trackId);
            if (track) {
                track.setRating(rating);
                await window.db.tracks.put(track);

                // Update local tracks array
                const localTrack = this.tracks.find(t => t.id === trackId);
                if (localTrack) {
                    localTrack.rating = rating;
                }

                // Re-render the tracks list to update the UI
                this.updateTracksList();
            }
        } catch (error) {
            console.error('Error updating track rating:', error);
        }
    }

    formatLastUsed(dateString) {
        try {
            const date = new Date(dateString);
            const now = new Date();
            const diffMs = now - date;
            const diffDays = Math.floor(diffMs / MS_PER_DAY);

            if (diffDays === 0) {
                return 'Today';
            } else if (diffDays === 1) {
                return 'Yesterday';
            } else if (diffDays < DAYS_PER_WEEK) {
                return `${diffDays} days ago`;
            } else if (diffDays < DAYS_PER_MONTH) {
                const weeks = Math.floor(diffDays / DAYS_PER_WEEK);
                return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
            } else if (diffDays < DAYS_PER_YEAR) {
                const months = Math.floor(diffDays / DAYS_PER_MONTH);
                return `${months} month${months > 1 ? 's' : ''} ago`;
            } else {
                const years = Math.floor(diffDays / DAYS_PER_YEAR);
                return `${years} year${years > 1 ? 's' : ''} ago`;
            }
        } catch (error) {
            console.error('Error formatting date:', error);
            return 'Unknown';
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    addEventListener(element, event, handler) {
        element.addEventListener(event, handler);
        this.eventListeners.push({ element, event, handler });
    }

    cleanup() {
        this.eventListeners.forEach(({ element, event, handler }) => {
            element.removeEventListener(event, handler);
        });
        this.eventListeners = [];
    }

    destroy() {
        this.cleanup();
    }
}
