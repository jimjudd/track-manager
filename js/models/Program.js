// ABOUTME: Program model representing a Les Mills program (e.g., BodyPump, BodyAttack)
// ABOUTME: Contains program name and ordered list of track types

export class Program {
    constructor(name, trackTypes) {
        if (name === null || name === undefined || name === '' || name === 0) {
            throw new Error('name is required');
        }
        this.name = name;
        this.trackTypes = trackTypes || [];
    }

    /**
     * Convert to plain object for Firestore storage
     */
    toFirestore() {
        return {
            name: this.name,
            trackTypes: this.trackTypes
        };
    }

    /**
     * Create Program instance from Firestore document
     */
    static fromFirestore(snapshot) {
        const data = snapshot.data();
        const program = new Program(data.name, data.trackTypes);
        program.id = snapshot.id;
        return program;
    }
}
