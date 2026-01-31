// ABOUTME: Library view for managing programs, releases, and tracks
// ABOUTME: Provides UI for adding and organizing Les Mills data

import { db } from '../db.js';
import { Program } from '../models/Program.js';
import { Release } from '../models/Release.js';
import { Track } from '../models/Track.js';

export class LibraryView {
    constructor(container) {
        this.container = container;
        this.eventListeners = [];
        this.isLoading = false;
        this.expandedPrograms = new Set();
        this.currentProgramId = null;
        this.currentReleaseId = null;
        this.currentProgram = null;
        this.editingProgramId = null;
        this.editingReleaseId = null;
        this.editingTrackId = null;
    }

    async render() {
        this.cleanup();

        // Set up basic structure first so error handling works
        this.container.innerHTML = `
            <div class="library-view">
                <div class="library-header">
                    <h1>Library</h1>
                    <button class="btn-primary" id="add-program-btn">+ Add Program</button>
                </div>
                <div class="programs-list">
                    <p class="empty-state">Loading...</p>
                </div>
                <div id="error-message" class="error-banner hidden"></div>
                <div id="loading-indicator" class="loading-indicator hidden">
                    <div class="spinner"></div>
                    <p>Saving...</p>
                </div>
            </div>
        `;

        try {
            const programs = await db.programs.toArray();
            const programItems = await Promise.all(programs.map(p => this.renderProgramItem(p)));

            this.container.innerHTML = `
                <div class="library-view">
                    <div class="library-header">
                        <h1>Library</h1>
                        <button class="btn-primary" id="add-program-btn">+ Add Program</button>
                    </div>

                    <div class="programs-list">
                        ${programs.length === 0
                            ? '<p class="empty-state">No programs yet. Add your first program to get started.</p>'
                            : programItems.join('')
                        }
                    </div>

                    <div id="program-form-modal" class="modal hidden" role="dialog" aria-labelledby="program-modal-title" aria-modal="true">
                        <div class="modal-content">
                            <h2 id="program-modal-title">Add Program</h2>
                            <form id="program-form">
                                <div class="form-group">
                                    <label for="program-name">Program Name</label>
                                    <input type="text" id="program-name" required maxlength="100">
                                    <span class="error-message" id="program-name-error"></span>
                                </div>
                                <div class="form-group">
                                    <label for="track-types">Track Types (one per line)</label>
                                    <textarea id="track-types" rows="10" required></textarea>
                                </div>
                                <div class="form-actions">
                                    <button type="button" class="btn-secondary" id="cancel-program-btn">Cancel</button>
                                    <button type="submit" class="btn-primary" id="save-program-btn">Save</button>
                                </div>
                            </form>
                        </div>
                    </div>

                    <div id="release-form-modal" class="modal hidden" role="dialog" aria-labelledby="release-modal-title" aria-modal="true">
                        <div class="modal-content">
                            <h2 id="release-modal-title">Add Release</h2>
                            <form id="release-form">
                                <div class="form-group">
                                    <label for="release-number">Release Number</label>
                                    <input type="number" id="release-number" required min="1" step="1">
                                    <span class="error-message" id="release-number-error"></span>
                                </div>
                                <div id="track-inputs-placeholder"></div>
                                <div class="form-actions">
                                    <button type="button" class="btn-secondary" id="cancel-release-btn">Cancel</button>
                                    <button type="submit" class="btn-primary" id="save-release-btn">Save</button>
                                </div>
                            </form>
                        </div>
                    </div>

                    <div id="track-form-modal" class="modal hidden" role="dialog" aria-labelledby="track-modal-title" aria-modal="true">
                        <div class="modal-content">
                            <h2 id="track-modal-title">Add Track</h2>
                            <form id="track-form">
                                <div class="form-group">
                                    <label for="track-type">Track Type</label>
                                    <select id="track-type" required>
                                    </select>
                                    <span class="error-message" id="track-type-error"></span>
                                </div>
                                <div class="form-group">
                                    <label for="song-title">Song Title</label>
                                    <input type="text" id="song-title" required maxlength="200">
                                    <span class="error-message" id="song-title-error"></span>
                                </div>
                                <div class="form-group">
                                    <label for="artist">Artist (optional)</label>
                                    <input type="text" id="artist" maxlength="200">
                                    <span class="error-message" id="artist-error"></span>
                                </div>
                                <div class="form-actions">
                                    <button type="button" class="btn-secondary" id="cancel-track-btn">Cancel</button>
                                    <button type="submit" class="btn-primary" id="save-track-btn">Save</button>
                                </div>
                            </form>
                        </div>
                    </div>

                    <div id="loading-indicator" class="loading-indicator hidden">
                        <div class="spinner"></div>
                        <p>Saving...</p>
                    </div>

                    <div id="error-message" class="error-banner hidden"></div>
                </div>
            `;

            this.attachEventListeners();
        } catch (error) {
            this.showError('Failed to load programs. Please refresh the page.');
            console.error('Error rendering library view:', error);
        }
    }

    async renderProgramItem(program) {
        const escapedName = this.escapeHtml(program.name);
        const releases = await db.releases.where('programId').equals(program.id).toArray();
        const isExpanded = this.expandedPrograms.has(program.id);
        const expandIcon = isExpanded ? '▼' : '▶';

        // Sort releases in descending order by release number
        releases.sort((a, b) => b.releaseNumber - a.releaseNumber);

        // Set current program for track type dropdown
        this.currentProgram = program;

        // Render releases with tracks
        const releaseItems = await Promise.all(releases.map(r => this.renderReleaseItem(r)));

        return `
            <div class="program-item" data-id="${program.id}">
                <div class="program-header">
                    <button class="expand-program" data-id="${program.id}" aria-expanded="${isExpanded}" aria-label="Expand ${escapedName}">
                        <span class="expand-icon">${expandIcon}</span>
                    </button>
                    <div class="program-info">
                        <h3>${escapedName}</h3>
                        <p class="track-types-count">${program.trackTypes.length} track types • ${releases.length} ${releases.length === 1 ? 'release' : 'releases'}</p>
                    </div>
                    <div class="program-actions">
                        <button class="btn-secondary edit-program-btn" data-id="${program.id}">Edit</button>
                        <button class="btn-secondary delete-program-btn" data-id="${program.id}">Delete</button>
                    </div>
                </div>
                <div class="releases-list ${isExpanded ? '' : 'hidden'}">
                    <div class="releases-header">
                        <h4>Releases</h4>
                        <button class="btn-primary add-release-btn" data-program-id="${program.id}">+ Add Release</button>
                    </div>
                    ${releases.length === 0
                        ? '<p class="empty-state">No releases yet. Add your first release to get started.</p>'
                        : releaseItems.join('')
                    }
                </div>
            </div>
        `;
    }

    async renderReleaseItem(release) {
        const escapedNumber = this.escapeHtml(String(release.releaseNumber));
        const tracks = await db.tracks.where('releaseId').equals(release.id).toArray();

        // Sort tracks by track type order from program
        if (this.currentProgram && this.currentProgram.trackTypes) {
            tracks.sort((a, b) => {
                const indexA = this.currentProgram.trackTypes.indexOf(a.trackType);
                const indexB = this.currentProgram.trackTypes.indexOf(b.trackType);
                return indexA - indexB;
            });
        }

        return `
            <div class="release-item" data-release-id="${release.id}">
                <div class="release-header">
                    <span class="release-number">Release ${escapedNumber}</span>
                    <div class="release-actions">
                        <button class="btn-secondary edit-release-btn" data-id="${release.id}">Edit</button>
                        <button class="btn-secondary delete-release-btn" data-id="${release.id}">Delete</button>
                        <button class="btn-primary add-track-btn" data-release-id="${release.id}">+ Add Track</button>
                    </div>
                </div>
                <div class="tracks-list">
                    ${tracks.length === 0
                        ? '<p class="empty-state">No tracks yet. Add your first track to get started.</p>'
                        : tracks.map(t => this.renderTrackItem(t)).join('')
                    }
                </div>
            </div>
        `;
    }

    renderTrackItem(track) {
        const escapedType = this.escapeHtml(track.trackType);
        const escapedTitle = this.escapeHtml(track.songTitle);
        const escapedArtist = this.escapeHtml(track.artist || '');

        return `
            <div class="track-item" data-track-id="${track.id}">
                <span class="track-type">${escapedType}</span>
                <div class="track-details">
                    <span class="track-title">${escapedTitle}</span>
                    ${escapedArtist ? `<span class="track-artist">${escapedArtist}</span>` : ''}
                </div>
                <div class="track-actions">
                    <button class="btn-secondary edit-track-btn" data-id="${track.id}">Edit</button>
                    <button class="btn-secondary delete-track-btn" data-id="${track.id}">Delete</button>
                </div>
            </div>
        `;
    }

    renderTrackInputsForRelease(program, existingTracks = []) {
        if (!program) {
            return '';
        }

        // Create a map of existing tracks by type for quick lookup
        const tracksByType = {};
        existingTracks.forEach(track => {
            tracksByType[track.trackType] = track;
        });

        const trackInputRows = program.trackTypes.map(trackType => {
            const escapedType = this.escapeHtml(trackType);
            const existingTrack = tracksByType[trackType];
            const escapedTitle = existingTrack ? this.escapeHtml(existingTrack.songTitle) : '';
            const escapedArtist = existingTrack ? this.escapeHtml(existingTrack.artist || '') : '';

            return `
                <div class="track-input-row" data-track-type="${this.escapeHtml(trackType)}">
                    <label class="track-type-label">${escapedType}</label>
                    <input
                        type="text"
                        class="track-title-input"
                        data-track-type="${this.escapeHtml(trackType)}"
                        placeholder="Song Title"
                        maxlength="200"
                        value="${escapedTitle}"
                    >
                    <input
                        type="text"
                        class="track-artist-input"
                        data-track-type="${this.escapeHtml(trackType)}"
                        placeholder="Artist (optional)"
                        maxlength="200"
                        value="${escapedArtist}"
                    >
                </div>
            `;
        }).join('');

        return `
            <div class="track-inputs-container">
                <p class="track-inputs-hint">Optional: Fill in tracks now or add them later</p>
                <div class="track-inputs-scroll">
                    ${trackInputRows}
                </div>
            </div>
        `;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    attachEventListeners() {
        // Program modal handlers
        const addProgramBtn = document.getElementById('add-program-btn');
        const cancelProgramBtn = document.getElementById('cancel-program-btn');
        const programForm = document.getElementById('program-form');
        const programModal = document.getElementById('program-form-modal');

        const openProgramModalHandler = () => {
            programModal.classList.remove('hidden');
            const programNameInput = document.getElementById('program-name');
            if (programNameInput) {
                programNameInput.focus();
            }
        };

        const closeProgramModalHandler = () => {
            programModal.classList.add('hidden');
            programForm.reset();
            this.clearError();
        };

        const submitProgramHandler = async (e) => {
            e.preventDefault();
            await this.handleAddProgram();
        };

        this.addEventListener(addProgramBtn, 'click', openProgramModalHandler);
        this.addEventListener(cancelProgramBtn, 'click', closeProgramModalHandler);
        this.addEventListener(programForm, 'submit', submitProgramHandler);

        // Release modal handlers
        const cancelReleaseBtn = document.getElementById('cancel-release-btn');
        const releaseForm = document.getElementById('release-form');
        const releaseModal = document.getElementById('release-form-modal');

        const closeReleaseModalHandler = () => {
            releaseModal.classList.add('hidden');
            releaseForm.reset();
            this.clearError();
        };

        const submitReleaseHandler = async (e) => {
            e.preventDefault();
            await this.handleAddRelease();
        };

        this.addEventListener(cancelReleaseBtn, 'click', closeReleaseModalHandler);
        this.addEventListener(releaseForm, 'submit', submitReleaseHandler);

        // Expand/collapse program handlers
        const expandButtons = document.querySelectorAll('.expand-program');
        expandButtons.forEach(btn => {
            const expandHandler = async (e) => {
                e.preventDefault();
                const programId = parseInt(btn.dataset.id);

                if (this.expandedPrograms.has(programId)) {
                    this.expandedPrograms.delete(programId);
                } else {
                    this.expandedPrograms.add(programId);
                }

                await this.render();
            };

            this.addEventListener(btn, 'click', expandHandler);
        });

        // Add release button handlers
        const addReleaseButtons = document.querySelectorAll('.add-release-btn');
        addReleaseButtons.forEach(btn => {
            const addReleaseHandler = async () => {
                this.currentProgramId = parseInt(btn.dataset.programId);
                this.currentProgram = await db.programs.get(this.currentProgramId);

                // Populate track inputs placeholder
                const placeholder = document.getElementById('track-inputs-placeholder');
                if (placeholder && this.currentProgram) {
                    placeholder.innerHTML = this.renderTrackInputsForRelease(this.currentProgram);
                }

                releaseModal.classList.remove('hidden');
                const releaseNumberInput = document.getElementById('release-number');
                if (releaseNumberInput) {
                    releaseNumberInput.focus();
                }
            };

            this.addEventListener(btn, 'click', addReleaseHandler);
        });

        // Track modal handlers
        const cancelTrackBtn = document.getElementById('cancel-track-btn');
        const trackForm = document.getElementById('track-form');
        const trackModal = document.getElementById('track-form-modal');

        const closeTrackModalHandler = () => {
            trackModal.classList.add('hidden');
            trackForm.reset();
            this.clearError();
        };

        const submitTrackHandler = async (e) => {
            e.preventDefault();
            await this.handleAddTrack();
        };

        this.addEventListener(cancelTrackBtn, 'click', closeTrackModalHandler);
        this.addEventListener(trackForm, 'submit', submitTrackHandler);

        // Add track button handlers
        const addTrackButtons = document.querySelectorAll('.add-track-btn');
        addTrackButtons.forEach(btn => {
            const addTrackHandler = async () => {
                this.currentReleaseId = parseInt(btn.dataset.releaseId);

                // Populate track type dropdown
                const trackTypeSelect = document.getElementById('track-type');
                if (trackTypeSelect && this.currentProgram) {
                    trackTypeSelect.innerHTML = this.currentProgram.trackTypes
                        .map(type => {
                            const escapedType = this.escapeHtml(type);
                            return `<option value="${escapedType}">${escapedType}</option>`;
                        })
                        .join('');
                }

                trackModal.classList.remove('hidden');
                const songTitleInput = document.getElementById('song-title');
                if (songTitleInput) {
                    songTitleInput.focus();
                }
            };

            this.addEventListener(btn, 'click', addTrackHandler);
        });

        // Edit program button handlers
        const editProgramButtons = document.querySelectorAll('.edit-program-btn');
        editProgramButtons.forEach(btn => {
            const editProgramHandler = async () => {
                const programId = parseInt(btn.dataset.id);
                await this.handleEditProgram(programId);
            };
            this.addEventListener(btn, 'click', editProgramHandler);
        });

        // Delete program button handlers
        const deleteProgramButtons = document.querySelectorAll('.delete-program-btn');
        deleteProgramButtons.forEach(btn => {
            const deleteProgramHandler = async () => {
                const programId = parseInt(btn.dataset.id);
                await this.handleDeleteProgram(programId);
            };
            this.addEventListener(btn, 'click', deleteProgramHandler);
        });

        // Edit release button handlers
        const editReleaseButtons = document.querySelectorAll('.edit-release-btn');
        editReleaseButtons.forEach(btn => {
            const editReleaseHandler = async () => {
                const releaseId = parseInt(btn.dataset.id);
                await this.handleEditRelease(releaseId);
            };
            this.addEventListener(btn, 'click', editReleaseHandler);
        });

        // Delete release button handlers
        const deleteReleaseButtons = document.querySelectorAll('.delete-release-btn');
        deleteReleaseButtons.forEach(btn => {
            const deleteReleaseHandler = async () => {
                const releaseId = parseInt(btn.dataset.id);
                await this.handleDeleteRelease(releaseId);
            };
            this.addEventListener(btn, 'click', deleteReleaseHandler);
        });

        // Edit track button handlers
        const editTrackButtons = document.querySelectorAll('.edit-track-btn');
        editTrackButtons.forEach(btn => {
            const editTrackHandler = async () => {
                const trackId = parseInt(btn.dataset.id);
                await this.handleEditTrack(trackId);
            };
            this.addEventListener(btn, 'click', editTrackHandler);
        });

        // Delete track button handlers
        const deleteTrackButtons = document.querySelectorAll('.delete-track-btn');
        deleteTrackButtons.forEach(btn => {
            const deleteTrackHandler = async () => {
                const trackId = parseInt(btn.dataset.id);
                await this.handleDeleteTrack(trackId);
            };
            this.addEventListener(btn, 'click', deleteTrackHandler);
        });

        // Keyboard navigation
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                if (!programModal.classList.contains('hidden')) {
                    closeProgramModalHandler();
                }
                if (!releaseModal.classList.contains('hidden')) {
                    closeReleaseModalHandler();
                }
                if (!trackModal.classList.contains('hidden')) {
                    closeTrackModalHandler();
                }
            }
        };

        this.addEventListener(document, 'keydown', handleKeyDown);
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

    async handleAddProgram() {
        const nameInput = document.getElementById('program-name');
        const trackTypesInput = document.getElementById('track-types');
        const modal = document.getElementById('program-form-modal');
        const form = document.getElementById('program-form');

        const name = nameInput.value.trim();
        const trackTypesText = trackTypesInput.value;
        const trackTypes = trackTypesText.split('\n').map(t => t.trim()).filter(t => t);

        if (!this.validateProgramName(name)) {
            return;
        }

        try {
            this.showLoading(true);

            const existingProgram = await db.programs.where('name').equals(name).first();
            if (existingProgram) {
                this.showValidationError('program-name-error', 'A program with this name already exists.');
                this.showLoading(false);
                return;
            }

            await db.programs.add(new Program(name, trackTypes));

            modal.classList.add('hidden');
            form.reset();
            this.clearError();

            await this.render();
        } catch (error) {
            this.showError('Failed to add program. Please try again.');
            console.error('Error adding program:', error);
        } finally {
            this.showLoading(false);
        }
    }

    async handleAddRelease() {
        const releaseNumberInput = document.getElementById('release-number');
        const modal = document.getElementById('release-form-modal');
        const form = document.getElementById('release-form');

        const releaseNumberStr = releaseNumberInput.value.trim();

        if (!this.validateReleaseNumber(releaseNumberStr)) {
            return;
        }

        const releaseNumber = parseInt(releaseNumberStr);

        try {
            this.showLoading(true);

            const existingRelease = await db.releases
                .where('[programId+releaseNumber]')
                .equals([this.currentProgramId, releaseNumber])
                .first();

            if (existingRelease) {
                this.showValidationError('release-number-error', 'A release with this number already exists for this program.');
                this.showLoading(false);
                return;
            }

            const releaseId = await db.releases.add(new Release(this.currentProgramId, releaseNumber));

            // Process inline track inputs
            if (this.currentProgram && this.currentProgram.trackTypes) {
                for (const trackType of this.currentProgram.trackTypes) {
                    const titleInput = document.querySelector(`.track-title-input[data-track-type="${trackType}"]`);
                    const artistInput = document.querySelector(`.track-artist-input[data-track-type="${trackType}"]`);

                    if (titleInput && titleInput.value.trim()) {
                        const songTitle = titleInput.value.trim();
                        const artist = artistInput ? artistInput.value.trim() : '';

                        // Validate track
                        if (!this.validateTrack(trackType, songTitle, artist)) {
                            // If validation fails, delete the release and return
                            await db.releases.delete(releaseId);
                            this.showLoading(false);
                            return;
                        }

                        // Create track
                        await db.tracks.add(new Track(releaseId, trackType, songTitle, artist));
                    }
                }
            }

            modal.classList.add('hidden');
            form.reset();
            this.clearError();

            await this.render();
        } catch (error) {
            this.showError('Failed to add release. Please try again.');
            console.error('Error adding release:', error);
        } finally {
            this.showLoading(false);
        }
    }

    async handleAddTrack() {
        const trackTypeInput = document.getElementById('track-type');
        const songTitleInput = document.getElementById('song-title');
        const artistInput = document.getElementById('artist');
        const modal = document.getElementById('track-form-modal');
        const form = document.getElementById('track-form');

        const trackType = trackTypeInput.value.trim();
        const songTitle = songTitleInput.value.trim();
        const artist = artistInput.value.trim();

        if (!this.validateTrack(trackType, songTitle, artist)) {
            return;
        }

        try {
            this.showLoading(true);

            await db.tracks.add(new Track(this.currentReleaseId, trackType, songTitle, artist));

            modal.classList.add('hidden');
            form.reset();
            this.clearError();

            await this.render();
        } catch (error) {
            this.showError('Failed to add track. Please try again.');
            console.error('Error adding track:', error);
        } finally {
            this.showLoading(false);
        }
    }

    validateProgramName(name) {
        const errorElement = document.getElementById('program-name-error');

        if (!name) {
            this.showValidationError('program-name-error', 'Program name is required.');
            return false;
        }

        if (name.length > 100) {
            this.showValidationError('program-name-error', 'Program name must be 100 characters or less.');
            return false;
        }

        this.clearValidationError('program-name-error');
        return true;
    }

    validateReleaseNumber(releaseNumber) {
        if (!releaseNumber) {
            this.showValidationError('release-number-error', 'Release number is required.');
            return false;
        }

        if (releaseNumber.includes('.')) {
            this.showValidationError('release-number-error', 'Release number must be a positive integer.');
            return false;
        }

        const num = parseInt(releaseNumber);
        if (isNaN(num) || num <= 0 || !Number.isInteger(num)) {
            this.showValidationError('release-number-error', 'Release number must be a positive integer.');
            return false;
        }

        this.clearValidationError('release-number-error');
        return true;
    }

    validateTrack(trackType, songTitle, artist) {
        let isValid = true;

        if (!trackType) {
            this.showValidationError('track-type-error', 'Track type is required.');
            isValid = false;
        } else {
            this.clearValidationError('track-type-error');
        }

        if (!songTitle) {
            this.showValidationError('song-title-error', 'Song title is required.');
            isValid = false;
        } else if (songTitle.length > 200) {
            this.showValidationError('song-title-error', 'Song title must be 200 characters or less.');
            isValid = false;
        } else {
            this.clearValidationError('song-title-error');
        }

        if (artist.length > 200) {
            this.showValidationError('artist-error', 'Artist must be 200 characters or less.');
            isValid = false;
        } else {
            this.clearValidationError('artist-error');
        }

        return isValid;
    }

    showValidationError(elementId, message) {
        const errorElement = document.getElementById(elementId);
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
        }
    }

    clearValidationError(elementId) {
        const errorElement = document.getElementById(elementId);
        if (errorElement) {
            errorElement.textContent = '';
            errorElement.style.display = 'none';
        }
    }

    showLoading(show) {
        this.isLoading = show;
        const loadingIndicator = document.getElementById('loading-indicator');
        const saveProgramBtn = document.getElementById('save-program-btn');
        const saveReleaseBtn = document.getElementById('save-release-btn');
        const saveTrackBtn = document.getElementById('save-track-btn');

        if (loadingIndicator) {
            if (show) {
                loadingIndicator.classList.remove('hidden');
            } else {
                loadingIndicator.classList.add('hidden');
            }
        }

        if (saveProgramBtn) {
            saveProgramBtn.disabled = show;
        }

        if (saveReleaseBtn) {
            saveReleaseBtn.disabled = show;
        }

        if (saveTrackBtn) {
            saveTrackBtn.disabled = show;
        }
    }

    showError(message) {
        const errorBanner = document.getElementById('error-message');
        if (errorBanner) {
            errorBanner.textContent = message;
            errorBanner.classList.remove('hidden');
            setTimeout(() => {
                errorBanner.classList.add('hidden');
            }, 5000);
        }
    }

    clearError() {
        this.clearValidationError('program-name-error');
        this.clearValidationError('release-number-error');
        this.clearValidationError('track-type-error');
        this.clearValidationError('song-title-error');
        this.clearValidationError('artist-error');
        const errorBanner = document.getElementById('error-message');
        if (errorBanner) {
            errorBanner.classList.add('hidden');
        }
    }

    async handleEditProgram(programId) {
        try {
            const program = await db.programs.get(programId);
            if (!program) {
                this.showError('Program not found.');
                return;
            }

            this.editingProgramId = programId;

            // Pre-fill the form
            const nameInput = document.getElementById('program-name');
            const trackTypesInput = document.getElementById('track-types');
            const modal = document.getElementById('program-form-modal');
            const form = document.getElementById('program-form');

            nameInput.value = program.name;
            trackTypesInput.value = program.trackTypes.join('\n');

            // Change form submit handler to update instead of add
            const newSubmitHandler = async (e) => {
                e.preventDefault();
                await this.handleUpdateProgram();
            };

            // Remove old handler and add new one
            form.removeEventListener('submit', newSubmitHandler);
            form.addEventListener('submit', newSubmitHandler);

            modal.classList.remove('hidden');
            nameInput.focus();
        } catch (error) {
            this.showError('Failed to load program. Please try again.');
            console.error('Error editing program:', error);
        }
    }

    async handleUpdateProgram() {
        const nameInput = document.getElementById('program-name');
        const trackTypesInput = document.getElementById('track-types');
        const modal = document.getElementById('program-form-modal');
        const form = document.getElementById('program-form');

        const name = nameInput.value.trim();
        const trackTypesText = trackTypesInput.value;
        const trackTypes = trackTypesText.split('\n').map(t => t.trim()).filter(t => t);

        if (!this.validateProgramName(name)) {
            return;
        }

        try {
            this.showLoading(true);

            const existingProgram = await db.programs.where('name').equals(name).first();
            if (existingProgram && existingProgram.id !== this.editingProgramId) {
                this.showValidationError('program-name-error', 'A program with this name already exists.');
                this.showLoading(false);
                return;
            }

            const program = await db.programs.get(this.editingProgramId);
            program.name = name;
            program.trackTypes = trackTypes;
            await db.programs.put(program);

            this.editingProgramId = null;
            modal.classList.add('hidden');
            form.reset();
            this.clearError();

            await this.render();
        } catch (error) {
            this.showError('Failed to update program. Please try again.');
            console.error('Error updating program:', error);
        } finally {
            this.showLoading(false);
        }
    }

    async handleDeleteProgram(programId) {
        if (!confirm('Are you sure you want to delete this program? This will also delete all releases and tracks in this program.')) {
            return;
        }

        try {
            this.showLoading(true);

            // Delete all tracks in all releases for this program
            const releases = await db.releases.where('programId').equals(programId).toArray();
            for (const release of releases) {
                await db.tracks.where('releaseId').equals(release.id).delete();
            }

            // Delete all releases for this program
            await db.releases.where('programId').equals(programId).delete();

            // Delete the program
            await db.programs.delete(programId);

            await this.render();
        } catch (error) {
            this.showError('Failed to delete program. Please try again.');
            console.error('Error deleting program:', error);
        } finally {
            this.showLoading(false);
        }
    }

    async handleEditRelease(releaseId) {
        try {
            const release = await db.releases.get(releaseId);
            if (!release) {
                this.showError('Release not found.');
                return;
            }

            this.editingReleaseId = releaseId;
            this.currentProgramId = release.programId;

            // Load program and existing tracks
            this.currentProgram = await db.programs.get(this.currentProgramId);
            const tracks = await db.tracks.where('releaseId').equals(releaseId).toArray();

            // Pre-fill the form
            const releaseNumberInput = document.getElementById('release-number');
            const modal = document.getElementById('release-form-modal');
            const form = document.getElementById('release-form');

            releaseNumberInput.value = release.releaseNumber;

            // Populate track inputs with existing tracks
            const placeholder = document.getElementById('track-inputs-placeholder');
            if (placeholder && this.currentProgram) {
                placeholder.innerHTML = this.renderTrackInputsForRelease(this.currentProgram, tracks);
            }

            // Change form submit handler to update instead of add
            const newSubmitHandler = async (e) => {
                e.preventDefault();
                await this.handleUpdateRelease();
            };

            // Remove old handler and add new one
            form.removeEventListener('submit', newSubmitHandler);
            form.addEventListener('submit', newSubmitHandler);

            modal.classList.remove('hidden');
            releaseNumberInput.focus();
        } catch (error) {
            this.showError('Failed to load release. Please try again.');
            console.error('Error editing release:', error);
        }
    }

    async handleUpdateRelease() {
        const releaseNumberInput = document.getElementById('release-number');
        const modal = document.getElementById('release-form-modal');
        const form = document.getElementById('release-form');

        const releaseNumberStr = releaseNumberInput.value.trim();

        if (!this.validateReleaseNumber(releaseNumberStr)) {
            return;
        }

        const releaseNumber = parseInt(releaseNumberStr);

        try {
            this.showLoading(true);

            const existingRelease = await db.releases
                .where('[programId+releaseNumber]')
                .equals([this.currentProgramId, releaseNumber])
                .first();

            if (existingRelease && existingRelease.id !== this.editingReleaseId) {
                this.showValidationError('release-number-error', 'A release with this number already exists for this program.');
                this.showLoading(false);
                return;
            }

            const release = await db.releases.get(this.editingReleaseId);
            release.releaseNumber = releaseNumber;
            await db.releases.put(release);

            // Process inline track inputs for new tracks only
            if (this.currentProgram && this.currentProgram.trackTypes) {
                for (const trackType of this.currentProgram.trackTypes) {
                    // Check if track already exists
                    const existingTrack = await db.tracks
                        .where({ releaseId: this.editingReleaseId, trackType: trackType })
                        .first();

                    // Only create new track if it doesn't exist and has a title
                    if (!existingTrack) {
                        const titleInput = document.querySelector(`.track-title-input[data-track-type="${trackType}"]`);
                        const artistInput = document.querySelector(`.track-artist-input[data-track-type="${trackType}"]`);

                        if (titleInput && titleInput.value.trim()) {
                            const songTitle = titleInput.value.trim();
                            const artist = artistInput ? artistInput.value.trim() : '';

                            // Validate track
                            if (!this.validateTrack(trackType, songTitle, artist)) {
                                this.showLoading(false);
                                return;
                            }

                            // Create new track
                            await db.tracks.add(new Track(this.editingReleaseId, trackType, songTitle, artist));
                        }
                    }
                }
            }

            this.editingReleaseId = null;
            modal.classList.add('hidden');
            form.reset();
            this.clearError();

            await this.render();
        } catch (error) {
            this.showError('Failed to update release. Please try again.');
            console.error('Error updating release:', error);
        } finally {
            this.showLoading(false);
        }
    }

    async handleDeleteRelease(releaseId) {
        if (!confirm('Are you sure you want to delete this release? This will also delete all tracks in this release.')) {
            return;
        }

        try {
            this.showLoading(true);

            // Delete all tracks in this release
            await db.tracks.where('releaseId').equals(releaseId).delete();

            // Delete the release
            await db.releases.delete(releaseId);

            await this.render();
        } catch (error) {
            this.showError('Failed to delete release. Please try again.');
            console.error('Error deleting release:', error);
        } finally {
            this.showLoading(false);
        }
    }

    async handleEditTrack(trackId) {
        try {
            const track = await db.tracks.get(trackId);
            if (!track) {
                this.showError('Track not found.');
                return;
            }

            this.editingTrackId = trackId;
            this.currentReleaseId = track.releaseId;

            // Populate track type dropdown
            const trackTypeSelect = document.getElementById('track-type');
            if (trackTypeSelect && this.currentProgram) {
                trackTypeSelect.innerHTML = this.currentProgram.trackTypes
                    .map(type => {
                        const escapedType = this.escapeHtml(type);
                        return `<option value="${escapedType}">${escapedType}</option>`;
                    })
                    .join('');
            }

            // Pre-fill the form
            const trackTypeInput = document.getElementById('track-type');
            const songTitleInput = document.getElementById('song-title');
            const artistInput = document.getElementById('artist');
            const modal = document.getElementById('track-form-modal');
            const form = document.getElementById('track-form');

            trackTypeInput.value = track.trackType;
            songTitleInput.value = track.songTitle;
            artistInput.value = track.artist || '';

            // Change form submit handler to update instead of add
            const newSubmitHandler = async (e) => {
                e.preventDefault();
                await this.handleUpdateTrack();
            };

            // Remove old handler and add new one
            form.removeEventListener('submit', newSubmitHandler);
            form.addEventListener('submit', newSubmitHandler);

            modal.classList.remove('hidden');
            songTitleInput.focus();
        } catch (error) {
            this.showError('Failed to load track. Please try again.');
            console.error('Error editing track:', error);
        }
    }

    async handleUpdateTrack() {
        const trackTypeInput = document.getElementById('track-type');
        const songTitleInput = document.getElementById('song-title');
        const artistInput = document.getElementById('artist');
        const modal = document.getElementById('track-form-modal');
        const form = document.getElementById('track-form');

        const trackType = trackTypeInput.value.trim();
        const songTitle = songTitleInput.value.trim();
        const artist = artistInput.value.trim();

        if (!this.validateTrack(trackType, songTitle, artist)) {
            return;
        }

        try {
            this.showLoading(true);

            const track = await db.tracks.get(this.editingTrackId);
            track.trackType = trackType;
            track.songTitle = songTitle;
            track.artist = artist;
            await db.tracks.put(track);

            this.editingTrackId = null;
            modal.classList.add('hidden');
            form.reset();
            this.clearError();

            await this.render();
        } catch (error) {
            this.showError('Failed to update track. Please try again.');
            console.error('Error updating track:', error);
        } finally {
            this.showLoading(false);
        }
    }

    async handleDeleteTrack(trackId) {
        if (!confirm('Are you sure you want to delete this track?')) {
            return;
        }

        try {
            this.showLoading(true);

            // Delete the track
            await db.tracks.delete(trackId);

            await this.render();
        } catch (error) {
            this.showError('Failed to delete track. Please try again.');
            console.error('Error deleting track:', error);
        } finally {
            this.showLoading(false);
        }
    }
}
