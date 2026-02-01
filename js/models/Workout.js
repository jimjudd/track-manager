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

    /**
     * Convert to plain object for Firestore storage
     */
    toFirestore() {
        return {
            programId: this.programId,
            date: this.date,
            trackIds: this.trackIds,
            clonedFrom: this.clonedFrom
        };
    }

    /**
     * Create Workout instance from Firestore document
     */
    static fromFirestore(snapshot) {
        const data = snapshot.data();
        const workout = new Workout(data.programId, data.date, data.trackIds, data.clonedFrom);
        workout.id = snapshot.id;
        return workout;
    }
}
