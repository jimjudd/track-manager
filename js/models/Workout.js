// ABOUTME: Workout model representing a class taught on a specific date
// ABOUTME: Contains program ID, date, and array of track IDs

export class Workout {
    constructor(programId, date, trackIds, clonedFrom = null) {
        if (programId === null || programId === undefined) {
            throw new Error('programId is required');
        }
        this.programId = programId;
        this.date = date || new Date().toISOString().split('T')[0];
        this.trackIds = trackIds || [];
        this.clonedFrom = clonedFrom; // ID of source workout if cloned
    }
}
