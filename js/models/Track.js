// ABOUTME: Track model representing an individual song in a release
// ABOUTME: Contains song details, rating, and last used timestamp

export class Track {
    constructor(releaseId, trackType, songTitle, artist) {
        if (releaseId === null || releaseId === undefined) {
            throw new Error('releaseId is required');
        }
        if (trackType === null || trackType === undefined || trackType === '') {
            throw new Error('trackType is required');
        }
        if (songTitle === null || songTitle === undefined || songTitle === '') {
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
        if (typeof rating !== 'number') {
            throw new Error('Rating must be a number');
        }
        if (rating < 0 || rating > 5) {
            throw new Error('Rating must be between 0 and 5');
        }
        this.rating = rating;
    }

    /**
     * Convert to plain object for Firestore storage
     */
    toFirestore() {
        return {
            releaseId: this.releaseId,
            trackType: this.trackType,
            songTitle: this.songTitle,
            artist: this.artist,
            rating: this.rating,
            lastUsed: this.lastUsed
        };
    }

    /**
     * Create Track instance from Firestore document
     */
    static fromFirestore(snapshot) {
        const data = snapshot.data();
        const track = new Track(data.releaseId, data.trackType, data.songTitle, data.artist);
        track.rating = data.rating || 0;
        track.lastUsed = data.lastUsed || null;
        track.id = snapshot.id;
        return track;
    }
}
