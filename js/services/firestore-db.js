// ABOUTME: Firestore data access layer with Dexie-like API
// ABOUTME: Provides consistent interface for Firestore operations to minimize view changes

import { Program } from '../models/Program.js';
import { Release } from '../models/Release.js';
import { Track } from '../models/Track.js';
import { Workout } from '../models/Workout.js';

/**
 * Main database class that provides access to all collections
 */
export class FirestoreDB {
    constructor(firestore, userId) {
        if (!firestore) {
            throw new Error('Firestore instance is required');
        }
        if (!userId) {
            throw new Error('User ID is required');
        }

        this.firestore = firestore;
        this.userId = userId;

        // Initialize collections with their model classes
        this.programs = new FirestoreCollection(firestore, userId, 'programs', Program);
        this.releases = new FirestoreCollection(firestore, userId, 'releases', Release);
        this.tracks = new FirestoreCollection(firestore, userId, 'tracks', Track);
        this.workouts = new FirestoreCollection(firestore, userId, 'workouts', Workout);
    }
}

/**
 * Collection wrapper that provides Dexie-like API for Firestore
 */
class FirestoreCollection {
    constructor(firestore, userId, collectionName, ModelClass) {
        this.firestore = firestore;
        this.userId = userId;
        this.collectionName = collectionName;
        this.ModelClass = ModelClass;
        this.collectionPath = `users/${userId}/${collectionName}`;
    }

    /**
     * Get reference to the Firestore collection
     */
    getCollectionRef() {
        return this.firestore.collection(this.collectionPath);
    }

    /**
     * Get all documents as an array
     */
    async toArray() {
        try {
            const snapshot = await this.getCollectionRef().get();
            return snapshot.docs.map(doc => this.ModelClass.fromFirestore(doc));
        } catch (error) {
            throw this.handleError(error);
        }
    }

    /**
     * Get a single document by ID
     */
    async get(id) {
        if (!id) {
            return undefined;
        }

        // Ensure ID is a string (Firestore requires string IDs)
        const stringId = String(id);

        try {
            const docRef = this.getCollectionRef().doc(stringId);
            const doc = await docRef.get();

            if (!doc.exists) {
                return undefined;
            }

            return this.ModelClass.fromFirestore(doc);
        } catch (error) {
            throw this.handleError(error);
        }
    }

    /**
     * Add a new document with auto-generated ID
     */
    async add(obj) {
        try {
            // Convert model instance to plain object for Firestore
            const data = obj.toFirestore ? obj.toFirestore() : { ...obj };

            // Remove any id field
            delete data.id;

            const docRef = await this.getCollectionRef().add(data);
            return docRef.id;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    /**
     * Update or create a document (upsert)
     * If obj has an id, updates that document
     * If obj has no id, creates a new document
     */
    async put(obj) {
        try {
            const data = obj.toFirestore ? obj.toFirestore() : { ...obj };

            if (obj.id) {
                // Update existing document
                const docRef = this.getCollectionRef().doc(obj.id);
                await docRef.set(data, { merge: true });
                return obj.id;
            } else {
                // Create new document
                const docRef = await this.getCollectionRef().add(data);
                return docRef.id;
            }
        } catch (error) {
            throw this.handleError(error);
        }
    }

    /**
     * Delete a document by ID
     */
    async delete(id) {
        if (!id) {
            return;
        }

        try {
            const docRef = this.getCollectionRef().doc(id);
            await docRef.delete();
        } catch (error) {
            throw this.handleError(error);
        }
    }

    /**
     * Delete multiple documents by IDs
     */
    async bulkDelete(ids) {
        if (!ids || ids.length === 0) {
            return;
        }

        try {
            const batch = this.firestore.batch();

            for (const id of ids) {
                const docRef = this.getCollectionRef().doc(id);
                batch.delete(docRef);
            }

            await batch.commit();
        } catch (error) {
            throw this.handleError(error);
        }
    }

    /**
     * Start a where query
     */
    where(field) {
        return new WhereClause(this, field);
    }

    /**
     * Start an orderBy query
     */
    orderBy(field, direction = 'asc') {
        return new OrderByClause(this, field, direction);
    }

    /**
     * Handle Firestore errors with user-friendly messages
     */
    handleError(error) {
        console.error('Firestore error:', error);

        if (error.code === 'unavailable') {
            return new Error('Unable to connect. Check your internet connection.');
        } else if (error.code === 'permission-denied') {
            return new Error('You must be signed in to access data.');
        } else if (error.code === 'unauthenticated') {
            return new Error('Your session has expired. Please sign in again.');
        } else {
            return new Error('An error occurred. Please try again.');
        }
    }
}

/**
 * Where clause builder for filtering queries
 */
class WhereClause {
    constructor(collection, field) {
        this.collection = collection;
        this.field = field;
        this.queries = [];
    }

    /**
     * Add equals filter
     */
    equals(value) {
        this.queries.push({ field: this.field, op: '==', value });
        return this;
    }

    /**
     * Add another where clause (for compound queries)
     */
    where(field) {
        const newClause = new WhereClause(this.collection, field);
        newClause.queries = [...this.queries];
        return newClause;
    }

    /**
     * Execute query and return first result
     */
    async first() {
        const results = await this.toArray();
        return results.length > 0 ? results[0] : undefined;
    }

    /**
     * Execute query and return all results
     */
    async toArray() {
        try {
            let query = this.collection.getCollectionRef();

            // Apply all where clauses
            for (const { field, op, value } of this.queries) {
                query = query.where(field, op, value);
            }

            const snapshot = await query.get();
            return snapshot.docs.map(doc => this.collection.ModelClass.fromFirestore(doc));
        } catch (error) {
            throw this.collection.handleError(error);
        }
    }

    /**
     * Delete all documents matching the query
     */
    async delete() {
        const results = await this.toArray();
        const ids = results.map(item => item.id);
        await this.collection.bulkDelete(ids);
    }
}

/**
 * OrderBy clause builder for sorting queries
 */
class OrderByClause {
    constructor(collection, field, direction = 'asc') {
        this.collection = collection;
        this.field = field;
        this.direction = direction;
    }

    /**
     * Reverse the sort order (for Dexie compatibility)
     */
    reverse() {
        this.direction = this.direction === 'asc' ? 'desc' : 'asc';
        return this;
    }

    /**
     * Execute query and return all results
     */
    async toArray() {
        try {
            const query = this.collection
                .getCollectionRef()
                .orderBy(this.field, this.direction);

            const snapshot = await query.get();
            return snapshot.docs.map(doc => this.collection.ModelClass.fromFirestore(doc));
        } catch (error) {
            throw this.collection.handleError(error);
        }
    }
}
