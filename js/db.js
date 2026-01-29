// ABOUTME: Database configuration and schema definition using Dexie.js
// ABOUTME: Defines the IndexedDB structure for programs, releases, tracks, and workouts

import { Program } from './models/Program.js';
import { Release } from './models/Release.js';
import { Track } from './models/Track.js';
import { Workout } from './models/Workout.js';

const db = new Dexie('TrackManagerDB');

try {
    db.version(1).stores({
        programs: '++id, name',
        releases: '++id, programId, releaseNumber, [programId+releaseNumber]',
        tracks: '++id, releaseId, trackType, songTitle, lastUsed, rating',
        workouts: '++id, programId, date'
    });

    // Add model classes to tables
    db.programs.mapToClass(Program);
    db.releases.mapToClass(Release);
    db.tracks.mapToClass(Track);
    db.workouts.mapToClass(Workout);
} catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
}

export { db };
