// ABOUTME: Release model representing a quarterly Les Mills release
// ABOUTME: Belongs to a program and contains multiple tracks

export class Release {
    constructor(programId, releaseNumber) {
        if (programId === null || programId === undefined) {
            throw new Error('programId is required');
        }
        if (releaseNumber === null || releaseNumber === undefined) {
            throw new Error('releaseNumber is required');
        }
        this.programId = programId;
        this.releaseNumber = releaseNumber;
    }

    /**
     * Convert to plain object for Firestore storage
     */
    toFirestore() {
        return {
            programId: this.programId,
            releaseNumber: this.releaseNumber
        };
    }

    /**
     * Create Release instance from Firestore document
     */
    static fromFirestore(snapshot) {
        const data = snapshot.data();
        const release = new Release(data.programId, data.releaseNumber);
        release.id = snapshot.id;
        return release;
    }
}
