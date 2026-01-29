// ABOUTME: Release model representing a quarterly Les Mills release
// ABOUTME: Belongs to a program and contains multiple tracks

export class Release {
    constructor(programId, releaseNumber) {
        this.programId = programId;
        this.releaseNumber = releaseNumber;
    }
}
