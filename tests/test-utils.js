// ABOUTME: Shared test utilities for mocking Firestore SDK
// ABOUTME: Provides MockFirestore class and test helper functions

import { Program } from '../js/models/Program.js';
import { Release } from '../js/models/Release.js';
import { Track } from '../js/models/Track.js';
import { Workout } from '../js/models/Workout.js';

// Mock Firestore SDK classes
export class MockDocSnapshot {
    constructor(id, data, exists = true) {
        this.id = id;
        this._data = data;
        this.exists = exists;
    }

    data() {
        return this._data;
    }
}

export class MockQuerySnapshot {
    constructor(docs) {
        this.docs = docs;
    }
}

export class MockDocumentReference {
    constructor(id, collection) {
        this.id = id;
        this.collection = collection;
    }

    get() {
        const data = this.collection._mockData.get(this.id);
        if (!data) {
            return Promise.resolve(new MockDocSnapshot(this.id, null, false));
        }
        return Promise.resolve(new MockDocSnapshot(this.id, data, true));
    }

    set(data, options = {}) {
        this.collection._mockData.set(this.id, data);
        return Promise.resolve();
    }

    delete() {
        this.collection._mockData.delete(this.id);
        return Promise.resolve();
    }
}

export class MockCollectionReference {
    constructor(path) {
        this.path = path;
        this._mockData = new Map();
        this._nextId = 1;
        this._whereField = null;
        this._whereOp = null;
        this._whereValue = null;
        this._orderByField = null;
        this._orderByDirection = 'asc';
    }

    doc(id) {
        return new MockDocumentReference(id, this);
    }

    add(data) {
        const id = `mock_${this._nextId++}`;
        this._mockData.set(id, data);
        return Promise.resolve(new MockDocumentReference(id, this));
    }

    where(field, op, value) {
        const newRef = new MockCollectionReference(this.path);
        newRef._mockData = this._mockData;
        newRef._nextId = this._nextId;
        newRef._whereField = field;
        newRef._whereOp = op;
        newRef._whereValue = value;
        newRef._orderByField = this._orderByField;
        newRef._orderByDirection = this._orderByDirection;
        return newRef;
    }

    orderBy(field, direction = 'asc') {
        const newRef = new MockCollectionReference(this.path);
        newRef._mockData = this._mockData;
        newRef._nextId = this._nextId;
        newRef._whereField = this._whereField;
        newRef._whereOp = this._whereOp;
        newRef._whereValue = this._whereValue;
        newRef._orderByField = field;
        newRef._orderByDirection = direction;
        return newRef;
    }

    get() {
        let docs = Array.from(this._mockData.entries()).map(([id, data]) =>
            new MockDocSnapshot(id, data)
        );

        // Apply where filter
        if (this._whereField && this._whereOp === '==') {
            docs = docs.filter(doc => doc.data()[this._whereField] === this._whereValue);
        }

        // Apply orderBy
        if (this._orderByField) {
            docs.sort((a, b) => {
                const aVal = a.data()[this._orderByField];
                const bVal = b.data()[this._orderByField];
                const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
                return this._orderByDirection === 'desc' ? -comparison : comparison;
            });
        }

        return Promise.resolve(new MockQuerySnapshot(docs));
    }
}

export class MockFirestore {
    constructor() {
        this._collections = new Map();
    }

    collection(path) {
        if (!this._collections.has(path)) {
            this._collections.set(path, new MockCollectionReference(path));
        }
        return this._collections.get(path);
    }

    batch() {
        const operations = [];
        return {
            delete: (docRef) => {
                operations.push({ type: 'delete', docRef });
            },
            commit: () => {
                const promises = operations.map(op => {
                    if (op.type === 'delete') {
                        return op.docRef.delete();
                    }
                    return Promise.resolve();
                });
                return Promise.all(promises);
            }
        };
    }
}

// Test assertion helpers
export function assert(condition, message) {
    if (!condition) {
        throw new Error(message || 'Assertion failed');
    }
}

export function assertEquals(actual, expected, message) {
    if (actual !== expected) {
        throw new Error(message || `Expected ${expected} but got ${actual}`);
    }
}

export function assertDeepEquals(actual, expected, message) {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(message || `Expected ${JSON.stringify(expected)} but got ${JSON.stringify(actual)}`);
    }
}

export function assertThrows(fn, message) {
    try {
        fn();
        throw new Error(message || 'Expected function to throw but it did not');
    } catch (error) {
        // Expected
    }
}

// Setup global db for tests
export function setupTestDB(firestore, userId = 'test-user') {
    const { FirestoreDB } = window;
    if (!FirestoreDB) {
        throw new Error('FirestoreDB not loaded. Make sure to import it before calling setupTestDB');
    }
    const db = new FirestoreDB(firestore, userId);
    window.db = db;
    return db;
}

// Cleanup after tests
export function cleanupTestDB() {
    window.db = null;
}
