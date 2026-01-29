// ABOUTME: Workout model representing a class taught on a specific date
// ABOUTME: Contains program ID, date, and array of track IDs

export class Workout {
    constructor(programId, date, trackIds) {
        this.programId = programId;
        this.date = date || new Date().toISOString().split('T')[0];
        this.trackIds = trackIds || [];
    }
}
