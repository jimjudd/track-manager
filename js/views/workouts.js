// ABOUTME: Workouts view for listing and managing workout history
// ABOUTME: Displays past workouts with program, date, and track summary

import { db } from '../db.js';

export class WorkoutsView {
    constructor(container) {
        this.container = container;
        this.eventListeners = [];
        this.selectedProgramId = null;
        this.selectedTracks = {}; // trackType -> trackId mapping
        this.editingWorkoutId = null; // For edit mode
        this.cloneSourceId = null; // For clone mode
    }

    async render() {
        this.cleanup();

        try {
            const workouts = await this.loadWorkouts();

            this.container.innerHTML = `
                <div class="workouts-view">
                    <div class="workouts-header">
                        <h1>Workouts</h1>
                        <button class="btn-primary" id="new-workout-btn">+ New Workout</button>
                    </div>

                    <div class="workouts-list">
                        ${workouts.length === 0
                            ? '<p class="empty-state">No workouts yet. Create your first workout to get started!</p>'
                            : workouts.map(w => this.renderWorkoutItem(w)).join('')
                        }
                    </div>

                    <!-- Workout Editor Modal -->
                    <div id="workout-editor-modal" class="modal hidden" role="dialog" aria-labelledby="workout-modal-title" aria-modal="true">
                        <div class="modal-content modal-large">
                            <h2 id="workout-modal-title">Create Workout</h2>
                            <div id="workout-editor-content">
                                <div class="form-group">
                                    <label for="workout-date">Date</label>
                                    <input type="date" id="workout-date" required />
                                </div>
                                <div class="form-group">
                                    <label for="workout-program-select">Select Program</label>
                                    <select id="workout-program-select">
                                        <option value="">-- Choose a Program --</option>
                                    </select>
                                </div>
                                <div id="track-slots" class="track-slots hidden">
                                    <!-- Track slots will be generated here -->
                                </div>
                            </div>
                            <div class="form-actions">
                                <button type="button" class="btn-secondary" id="cancel-workout-btn">Cancel</button>
                                <button type="button" class="btn-primary" id="save-workout-btn" disabled>Save Workout</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            this.attachEventListeners();
        } catch (error) {
            console.error('Error rendering workouts view:', error);
            this.container.innerHTML = `
                <div class="error-message">
                    <p>Error loading workouts. Please try again.</p>
                </div>
            `;
        }
    }

    async loadWorkouts() {
        // Get all workouts sorted by date (newest first)
        const workouts = await db.workouts.orderBy('date').reverse().toArray();

        // Enrich each workout with program and track details
        const enrichedWorkouts = await Promise.all(
            workouts.map(async (workout) => {
                const program = await db.programs.get(workout.programId);
                const tracks = await Promise.all(
                    workout.trackIds.map(id => db.tracks.get(id))
                );

                return {
                    ...workout,
                    programName: program ? program.name : 'Unknown Program',
                    tracksCount: tracks.filter(t => t).length,
                    tracks: tracks.filter(t => t)
                };
            })
        );

        return enrichedWorkouts;
    }

    renderWorkoutItem(workout) {
        const formattedDate = this.formatDate(workout.date);
        const clonedBadge = workout.clonedFrom
            ? `<span class="cloned-badge">Cloned</span>`
            : '';

        return `
            <div class="workout-item" data-id="${workout.id}">
                <div class="workout-header">
                    <button class="expand-workout-btn" data-workout-id="${workout.id}" aria-label="Expand workout">
                        <span class="expand-icon">▶</span>
                    </button>
                    <div class="workout-header-info">
                        <h3>${this.escapeHtml(workout.programName)}</h3>
                        <span class="workout-date">${formattedDate}</span>
                    </div>
                </div>
                <div class="workout-details">
                    <p class="tracks-count">${workout.tracksCount} tracks ${clonedBadge}</p>
                </div>
                <div class="workout-playlist hidden" data-workout-id="${workout.id}">
                    <!-- Playlist content loaded dynamically -->
                </div>
                <div class="workout-actions">
                    <button class="btn-secondary clone-workout-btn" data-workout-id="${workout.id}">Clone</button>
                    <button class="btn-secondary edit-workout-btn" data-workout-id="${workout.id}">Edit</button>
                </div>
            </div>
        `;
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        // Reset times to midnight for comparison
        today.setHours(0, 0, 0, 0);
        yesterday.setHours(0, 0, 0, 0);
        const compareDate = new Date(date);
        compareDate.setHours(0, 0, 0, 0);

        if (compareDate.getTime() === today.getTime()) {
            return 'Today';
        } else if (compareDate.getTime() === yesterday.getTime()) {
            return 'Yesterday';
        } else {
            return date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            });
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    async handleExpandWorkout(workoutId) {
        const workout = await db.workouts.get(workoutId);
        if (!workout) return;

        const playlistContainer = this.container.querySelector(`.workout-playlist[data-workout-id="${workoutId}"]`);
        const expandBtn = this.container.querySelector(`.expand-workout-btn[data-workout-id="${workoutId}"]`);
        const expandIcon = expandBtn.querySelector('.expand-icon');

        // Toggle visibility
        const isHidden = playlistContainer.classList.contains('hidden');

        if (isHidden) {
            // Load and show playlist
            const tracks = await this.loadWorkoutTracks(workout.trackIds);
            const program = await db.programs.get(workout.programId);

            playlistContainer.innerHTML = this.renderPlaylist(tracks, program.trackTypes);
            playlistContainer.classList.remove('hidden');
            expandIcon.textContent = '▼';

            // Attach rating handlers
            this.attachPlaylistRatingHandlers(playlistContainer);
        } else {
            // Hide playlist
            playlistContainer.classList.add('hidden');
            expandIcon.textContent = '▶';
        }
    }

    async loadWorkoutTracks(trackIds) {
        const tracks = [];
        for (const trackId of trackIds) {
            const track = await db.tracks.get(trackId);
            if (track) {
                const release = await db.releases.get(track.releaseId);
                track.releaseNumber = release.releaseNumber;
                tracks.push(track);
            }
        }
        return tracks;
    }

    renderPlaylist(tracks, trackTypes) {
        // Order tracks by track type order in program
        const orderedTracks = trackTypes.map(type =>
            tracks.find(t => t.trackType === type)
        ).filter(Boolean);

        return `
            <div class="playlist-tracks">
                ${orderedTracks.map(track => this.renderPlaylistTrack(track)).join('')}
            </div>
        `;
    }

    renderPlaylistTrack(track) {
        const stars = [1, 2, 3, 4, 5].map(rating => {
            const filled = rating <= (track.rating || 0);
            return `<button class="star ${filled ? 'filled' : ''}" data-rating="${rating}" aria-label="Rate ${rating} stars">${filled ? '★' : '☆'}</button>`;
        }).join('');

        return `
            <div class="playlist-track-item" data-track-id="${track.id}">
                <div class="playlist-track-info">
                    <span class="playlist-track-type">${this.escapeHtml(track.trackType)}</span>
                    <span class="playlist-track-title">${this.escapeHtml(track.songTitle)}</span>
                    <span class="playlist-track-release">Release ${track.releaseNumber}</span>
                </div>
                <div class="playlist-track-rating" data-track-id="${track.id}">
                    ${stars}
                </div>
            </div>
        `;
    }

    attachPlaylistRatingHandlers(playlistContainer) {
        const ratingContainers = playlistContainer.querySelectorAll('.playlist-track-rating');

        ratingContainers.forEach(container => {
            const trackId = parseInt(container.dataset.trackId);
            const stars = container.querySelectorAll('.star');

            stars.forEach(star => {
                star.addEventListener('click', async () => {
                    const rating = parseInt(star.dataset.rating);
                    await this.handleTrackRating(trackId, rating);

                    // Update stars display
                    stars.forEach((s, idx) => {
                        if (idx < rating) {
                            s.classList.add('filled');
                            s.textContent = '★';
                        } else {
                            s.classList.remove('filled');
                            s.textContent = '☆';
                        }
                    });
                });
            });
        });
    }

    async handleTrackRating(trackId, rating) {
        await db.tracks.update(trackId, { rating });
    }

    attachEventListeners() {
        const newWorkoutBtn = document.getElementById('new-workout-btn');

        if (newWorkoutBtn) {
            const handler = () => this.handleNewWorkout();
            newWorkoutBtn.addEventListener('click', handler);
            this.eventListeners.push({ element: newWorkoutBtn, event: 'click', handler });
        }

        // Add click handlers for clone buttons
        const cloneBtns = this.container.querySelectorAll('.clone-workout-btn');
        cloneBtns.forEach(btn => {
            const handler = (e) => {
                e.stopPropagation();
                this.handleCloneWorkout(parseInt(btn.dataset.workoutId));
            };
            btn.addEventListener('click', handler);
            this.eventListeners.push({ element: btn, event: 'click', handler });
        });

        // Add click handlers for edit buttons
        const editBtns = this.container.querySelectorAll('.edit-workout-btn');
        editBtns.forEach(btn => {
            const handler = (e) => {
                e.stopPropagation();
                this.handleEditWorkout(parseInt(btn.dataset.workoutId));
            };
            btn.addEventListener('click', handler);
            this.eventListeners.push({ element: btn, event: 'click', handler });
        });

        // Add click handlers for expand buttons
        const expandBtns = this.container.querySelectorAll('.expand-workout-btn');
        expandBtns.forEach(btn => {
            const handler = (e) => {
                e.stopPropagation();
                this.handleExpandWorkout(parseInt(btn.dataset.workoutId));
            };
            btn.addEventListener('click', handler);
            this.eventListeners.push({ element: btn, event: 'click', handler });
        });

        // Modal event listeners
        const cancelBtn = document.getElementById('cancel-workout-btn');
        const saveBtn = document.getElementById('save-workout-btn');
        const programSelect = document.getElementById('workout-program-select');

        if (cancelBtn) {
            const handler = () => this.closeWorkoutModal();
            cancelBtn.addEventListener('click', handler);
            this.eventListeners.push({ element: cancelBtn, event: 'click', handler });
        }

        if (saveBtn) {
            const handler = () => this.handleSaveWorkout();
            saveBtn.addEventListener('click', handler);
            this.eventListeners.push({ element: saveBtn, event: 'click', handler });
        }

        if (programSelect) {
            const handler = () => this.handleProgramChange();
            programSelect.addEventListener('change', handler);
            this.eventListeners.push({ element: programSelect, event: 'change', handler });
        }
    }

    async handleNewWorkout() {
        // Load programs for selection
        const programs = await db.programs.toArray();
        const programSelect = document.getElementById('workout-program-select');

        // Populate program dropdown
        programSelect.innerHTML = '<option value="">-- Choose a Program --</option>' +
            programs.map(p => `<option value="${p.id}">${this.escapeHtml(p.name)}</option>`).join('');

        // Reset state
        this.selectedProgramId = null;
        this.selectedTracks = {};
        this.editingWorkoutId = null;
        this.cloneSourceId = null;

        // Set date to today
        const dateInput = this.container.querySelector('#workout-date');
        const today = new Date().toISOString().split('T')[0];
        dateInput.value = today;
        dateInput.readOnly = false;
        dateInput.classList.remove('read-only');

        // Update modal title
        this.container.querySelector('#workout-modal-title').textContent = 'Create Workout';

        // Show modal
        const modal = this.container.querySelector('#workout-editor-modal');
        modal.classList.remove('hidden');

        // Hide track slots until program is selected
        const trackSlots = this.container.querySelector('#track-slots');
        trackSlots.classList.add('hidden');

        // Disable save button
        this.container.querySelector('#save-workout-btn').disabled = true;
    }

    async handleCloneWorkout(workoutId) {
        const workout = await db.workouts.get(workoutId);
        if (!workout) return;

        const program = await db.programs.get(workout.programId);
        if (!program) return;

        // Set clone mode
        this.cloneSourceId = workoutId;
        this.editingWorkoutId = null;

        // Update modal title
        this.container.querySelector('#workout-modal-title').textContent = 'Clone Workout';

        // Set date to today (user can change)
        const today = new Date().toISOString().split('T')[0];
        const dateInput = this.container.querySelector('#workout-date');
        dateInput.value = today;
        dateInput.readOnly = false;
        dateInput.classList.remove('read-only');

        // Load programs for selection
        const programs = await db.programs.toArray();
        const programSelect = this.container.querySelector('#workout-program-select');

        // Populate program dropdown
        programSelect.innerHTML = '<option value="">-- Choose a Program --</option>' +
            programs.map(p => `<option value="${p.id}">${this.escapeHtml(p.name)}</option>`).join('');

        // Set the program
        this.selectedProgramId = workout.programId;
        programSelect.value = workout.programId;

        // Show modal
        const modal = this.container.querySelector('#workout-editor-modal');
        modal.classList.remove('hidden');

        // Render track slots and pre-select tracks
        await this.renderTrackSlots(program);
        await this.preselectTracks(workout.trackIds);

        this.updateSaveButtonState();
    }

    async handleEditWorkout(workoutId) {
        const workout = await db.workouts.get(workoutId);
        if (!workout) return;

        const program = await db.programs.get(workout.programId);
        if (!program) return;

        // Set edit mode
        this.editingWorkoutId = workoutId;
        this.cloneSourceId = null;

        // Update modal title
        this.container.querySelector('#workout-modal-title').textContent = 'Edit Workout';

        // Set date to original date (read-only)
        const dateInput = this.container.querySelector('#workout-date');
        dateInput.value = workout.date;
        dateInput.readOnly = true;
        dateInput.classList.add('read-only');

        // Load programs for selection
        const programs = await db.programs.toArray();
        const programSelect = this.container.querySelector('#workout-program-select');

        // Populate program dropdown and select the program (disabled since can't change)
        programSelect.innerHTML = '<option value="">-- Choose a Program --</option>' +
            programs.map(p => `<option value="${p.id}">${this.escapeHtml(p.name)}</option>`).join('');

        this.selectedProgramId = workout.programId;
        programSelect.value = workout.programId;
        programSelect.disabled = true;

        // Show modal
        const modal = this.container.querySelector('#workout-editor-modal');
        modal.classList.remove('hidden');

        // Render track slots and pre-select current tracks
        await this.renderTrackSlots(program);
        await this.preselectTracks(workout.trackIds);

        this.updateSaveButtonState();
    }

    async preselectTracks(trackIds) {
        const tracks = await Promise.all(trackIds.map(id => db.tracks.get(id)));
        tracks.forEach(track => {
            if (track) {
                const select = this.container.querySelector(`[data-track-type="${track.trackType}"]`);
                if (select) {
                    select.value = track.id;
                    this.selectedTracks[track.trackType] = track.id;
                }
            }
        });
    }

    async updateTracksLastUsed(trackIds, workoutDate) {
        // Update each track's lastUsed if the workout date is more recent
        for (const trackId of trackIds) {
            const track = await db.tracks.get(trackId);
            if (!track) continue;

            // Update if never used OR if this workout is more recent
            if (!track.lastUsed || workoutDate > track.lastUsed) {
                await db.tracks.update(trackId, { lastUsed: workoutDate });
            }
        }
    }

    async handleProgramChange() {
        const programSelect = document.getElementById('workout-program-select');
        this.selectedProgramId = parseInt(programSelect.value);

        if (!this.selectedProgramId) {
            document.getElementById('track-slots').classList.add('hidden');
            document.getElementById('save-workout-btn').disabled = true;
            return;
        }

        // Load program and create track slots
        const program = await db.programs.get(this.selectedProgramId);
        await this.renderTrackSlots(program);
    }

    async renderTrackSlots(program) {
        const trackSlots = document.getElementById('track-slots');
        this.selectedTracks = {};

        // Get all tracks for this program
        const releases = await db.releases.where('programId').equals(program.id).toArray();
        const releaseIds = releases.map(r => r.id);
        const allTracks = await db.tracks.where('releaseId').anyOf(releaseIds).toArray();

        // Create a map of release ID to release number
        const releaseMap = {};
        releases.forEach(r => {
            releaseMap[r.id] = r.releaseNumber;
        });

        // Add release number to each track
        allTracks.forEach(track => {
            track.releaseNumber = releaseMap[track.releaseId];
        });

        // Group tracks by type
        const tracksByType = {};
        allTracks.forEach(track => {
            if (!tracksByType[track.trackType]) {
                tracksByType[track.trackType] = [];
            }
            tracksByType[track.trackType].push(track);
        });

        // Create a slot for each track type
        const slotsHtml = program.trackTypes.map(trackType => {
            const tracksForType = tracksByType[trackType] || [];

            return `
                <div class="track-slot" data-track-type="${this.escapeHtml(trackType)}">
                    <label for="track-select-${this.escapeHtml(trackType)}">${this.escapeHtml(trackType)}</label>
                    <select id="track-select-${this.escapeHtml(trackType)}" class="track-select" data-track-type="${this.escapeHtml(trackType)}">
                        <option value="">-- Select ${this.escapeHtml(trackType)} Track --</option>
                        ${tracksForType.map(track => `
                            <option value="${track.id}">
                                ${this.escapeHtml(track.songTitle)}${track.artist ? ' - ' + this.escapeHtml(track.artist) : ''}
                                (Release ${track.releaseNumber || ''})
                            </option>
                        `).join('')}
                    </select>
                </div>
            `;
        }).join('');

        trackSlots.innerHTML = slotsHtml;
        trackSlots.classList.remove('hidden');

        // Add event listeners to track selects
        const trackSelects = trackSlots.querySelectorAll('.track-select');
        trackSelects.forEach(select => {
            const handler = () => this.handleTrackSelection(select);
            select.addEventListener('change', handler);
            this.eventListeners.push({ element: select, event: 'change', handler });
        });

        // Check if save button should be enabled
        this.updateSaveButtonState();
    }

    handleTrackSelection(selectElement) {
        const trackType = selectElement.dataset.trackType;
        const trackId = parseInt(selectElement.value);

        if (trackId) {
            this.selectedTracks[trackType] = trackId;
        } else {
            delete this.selectedTracks[trackType];
        }

        this.updateSaveButtonState();
    }

    async updateSaveButtonState() {
        const program = await db.programs.get(this.selectedProgramId);
        const saveBtn = document.getElementById('save-workout-btn');

        // Enable save button only if all track types have a selected track
        const allSelected = program.trackTypes.every(type => this.selectedTracks[type]);
        saveBtn.disabled = !allSelected;
    }

    async handleSaveWorkout() {
        if (!this.selectedProgramId || Object.keys(this.selectedTracks).length === 0) {
            return;
        }

        try {
            const date = this.container.querySelector('#workout-date').value;
            const trackIds = Object.values(this.selectedTracks);

            if (this.editingWorkoutId) {
                // Edit existing workout
                await db.workouts.update(this.editingWorkoutId, {
                    trackIds: trackIds
                });
            } else {
                // Create new workout
                await db.workouts.add({
                    programId: this.selectedProgramId,
                    date: date,
                    trackIds: trackIds,
                    clonedFrom: this.cloneSourceId // null if not cloning
                });
            }

            // Update lastUsed dates for all tracks in this workout
            await this.updateTracksLastUsed(trackIds, date);

            // Close modal and refresh
            this.closeWorkoutModal();
            await this.render();
        } catch (error) {
            console.error('Error saving workout:', error);
            alert('Error saving workout. Please try again.');
        }
    }

    closeWorkoutModal() {
        const modal = this.container.querySelector('#workout-editor-modal');
        modal.classList.add('hidden');

        // Reset all state
        this.selectedProgramId = null;
        this.selectedTracks = {};
        this.editingWorkoutId = null;
        this.cloneSourceId = null;

        // Reset form controls
        const dateInput = this.container.querySelector('#workout-date');
        if (dateInput) {
            dateInput.readOnly = false;
            dateInput.classList.remove('read-only');
        }

        const programSelect = this.container.querySelector('#workout-program-select');
        if (programSelect) {
            programSelect.disabled = false;
        }
    }

    cleanup() {
        // Remove event listeners to prevent memory leaks
        this.eventListeners.forEach(({ element, event, handler }) => {
            element.removeEventListener(event, handler);
        });
        this.eventListeners = [];
    }

    destroy() {
        this.cleanup();
    }
}
