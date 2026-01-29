// ABOUTME: Workouts view for listing and managing workout history
// ABOUTME: Displays past workouts with program, date, and track summary

import { db } from '../db.js';

export class WorkoutsView {
    constructor(container) {
        this.container = container;
        this.eventListeners = [];
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
    }

    handleNewWorkout() {
        // Placeholder for new workout functionality
        console.log('New workout button clicked');
        alert('New workout functionality coming soon!');
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
