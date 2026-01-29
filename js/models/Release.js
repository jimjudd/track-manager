// ABOUTME: Release model representing a quarterly Les Mills release
// ABOUTME: Belongs to a program and contains multiple tracks

export class Release {
    constructor(programId, releaseNumber) {
        if (!programId) {
            throw new Error('programId is required');
        }
        if (!releaseNumber) {
            throw new Error('releaseNumber is required');
        }
        this.programId = programId;
        this.releaseNumber = releaseNumber;
    }
}
