// ABOUTME: Track model representing an individual song in a release
// ABOUTME: Contains song details, rating, and last used timestamp

export class Track {
    constructor(releaseId, trackType, songTitle, artist) {
        if (!releaseId) {
            throw new Error('releaseId is required');
        }
        if (!trackType) {
            throw new Error('trackType is required');
        }
        if (!songTitle) {
            throw new Error('songTitle is required');
        }
        this.releaseId = releaseId;
        this.trackType = trackType;
        this.songTitle = songTitle;
        this.artist = artist || '';
        this.rating = 0;
        this.lastUsed = null;
    }

    updateLastUsed() {
        this.lastUsed = new Date().toISOString();
    }

    setRating(rating) {
        if (rating < 0 || rating > 5) {
            throw new Error('Rating must be between 0 and 5');
        }
        this.rating = rating;
    }
}
