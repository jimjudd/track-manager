// ABOUTME: Workouts view for listing and managing workout history
// ABOUTME: Displays past workouts with program, date, and track summary

import { db } from '../db.js';

export class WorkoutsView {
    constructor(container) {
        this.container = container;
        this.eventListeners = [];
        this.selectedProgramId = null;
        this.selectedTracks = {}; // trackType -> trackId mapping
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

        return `
            <div class="workout-item" data-id="${workout.id}">
                <div class="workout-header">
                    <h3>${this.escapeHtml(workout.programName)}</h3>
                    <span class="workout-date">${formattedDate}</span>
                </div>
                <div class="workout-details">
                    <p class="tracks-count">${workout.tracksCount} tracks</p>
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

    attachEventListeners() {
        const newWorkoutBtn = document.getElementById('new-workout-btn');

        if (newWorkoutBtn) {
            const handler = () => this.handleNewWorkout();
            newWorkoutBtn.addEventListener('click', handler);
            this.eventListeners.push({ element: newWorkoutBtn, event: 'click', handler });
        }

        // Add click handlers for workout items
        const workoutItems = this.container.querySelectorAll('.workout-item');
        workoutItems.forEach(item => {
            const handler = () => this.handleWorkoutClick(parseInt(item.dataset.id));
            item.addEventListener('click', handler);
            this.eventListeners.push({ element: item, event: 'click', handler });
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

        // Show modal
        const modal = document.getElementById('workout-editor-modal');
        modal.classList.remove('hidden');

        // Hide track slots until program is selected
        const trackSlots = document.getElementById('track-slots');
        trackSlots.classList.add('hidden');

        // Disable save button
        document.getElementById('save-workout-btn').disabled = true;
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
            // Create workout
            const today = new Date().toISOString().split('T')[0];
            const trackIds = Object.values(this.selectedTracks);

            await db.workouts.add({
                programId: this.selectedProgramId,
                date: today,
                trackIds: trackIds
            });

            // Close modal and refresh
            this.closeWorkoutModal();
            await this.render();
        } catch (error) {
            console.error('Error saving workout:', error);
            alert('Error saving workout. Please try again.');
        }
    }

    closeWorkoutModal() {
        const modal = document.getElementById('workout-editor-modal');
        modal.classList.add('hidden');
        this.selectedProgramId = null;
        this.selectedTracks = {};
    }

    handleWorkoutClick(workoutId) {
        // Placeholder for workout detail view
        console.log('Workout clicked:', workoutId);
        alert(`Workout detail view for ID ${workoutId} coming soon!`);
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
