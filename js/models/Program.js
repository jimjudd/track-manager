// ABOUTME: Program model representing a Les Mills program (e.g., BodyPump, BodyAttack)
// ABOUTME: Contains program name and ordered list of track types

export class Program {
    constructor(name, trackTypes) {
        this.name = name;
        this.trackTypes = trackTypes || [];
    }
}
