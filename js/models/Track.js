// ABOUTME: Track model representing an individual song in a release
// ABOUTME: Contains song details, rating, and last used timestamp

export class Track {
    constructor(releaseId, trackType, songTitle, artist) {
        this.releaseId = releaseId;
        this.trackType = trackType;
        this.songTitle = songTitle;
        this.artist = artist;
        this.rating = 0;
        this.lastUsed = null;
    }

    updateLastUsed() {
        this.lastUsed = new Date().toISOString();
    }

    setRating(rating) {
        if (rating >= 0 && rating <= 5) {
            this.rating = rating;
        }
    }
}
