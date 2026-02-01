// ABOUTME: Sync service that bridges IndexedDB and Firestore
// ABOUTME: Handles bidirectional real-time sync with conflict resolution

export class SyncService {
    constructor(db, firestore, userId) {
        this.db = db;
        this.firestore = firestore;
        this.userId = userId;
        this.listeners = [];
        this.syncInProgress = false;
        this.skipSync = false;
    }

    getCollectionPath(tableName) {
        return `users/${this.userId}/${tableName}`;
    }

    // Remove undefined values from object (Firestore doesn't accept undefined)
    removeUndefined(obj) {
        const cleaned = {};
        for (const key in obj) {
            if (obj[key] !== undefined) {
                cleaned[key] = obj[key];
            }
        }
        return cleaned;
    }

    async initialize() {
        console.log('Initializing sync service for user:', this.userId);

        // Set up Firestore listeners for all collections
        await this.setupFirestoreListeners();

        // Set up Dexie hooks for all tables
        this.setupDexieHooks();

        console.log('Sync service initialized successfully');
    }

    async setupFirestoreListeners() {
        const tables = ['programs', 'releases', 'tracks', 'workouts'];

        for (const tableName of tables) {
            const collectionPath = this.getCollectionPath(tableName);
            const unsubscribe = this.firestore
                .collection(collectionPath)
                .onSnapshot((snapshot) => {
                    this.handleFirestoreSnapshot(tableName, snapshot);
                }, (error) => {
                    console.error(`Firestore listener error for ${tableName}:`, error);
                });

            this.listeners.push(unsubscribe);
        }
    }

    async handleFirestoreSnapshot(tableName, snapshot) {
        if (this.skipSync) return;

        this.skipSync = true; // Prevent sync loop

        try {
            for (const change of snapshot.docChanges()) {
                const docData = change.doc.data();
                const docId = parseInt(change.doc.id, 10);

                // Validate that docId is a valid number
                if (isNaN(docId)) {
                    console.error(`Invalid document ID in Firestore ${tableName}/${change.doc.id}: cannot parse as number`);
                    continue; // Skip this document
                }

                if (change.type === 'added' || change.type === 'modified') {
                    // Update or add to IndexedDB
                    await this.db[tableName].put({
                        ...docData,
                        id: docId
                    });
                } else if (change.type === 'removed') {
                    // Delete from IndexedDB
                    await this.db[tableName].delete(docId);
                }
            }
        } catch (error) {
            console.error(`Error handling Firestore snapshot for ${tableName}:`, error);
        } finally {
            this.skipSync = false;
        }
    }

    setupDexieHooks() {
        const tables = ['programs', 'releases', 'tracks', 'workouts'];

        for (const tableName of tables) {
            // Hook: creating
            // For auto-increment keys, primKey is undefined initially
            // We use transaction.on('complete') to sync after the ID is assigned
            this.db[tableName].hook('creating', (primKey, obj, transaction) => {
                if (!this.skipSync) {
                    // For auto-increment tables, primKey is undefined
                    // Use transaction.on('complete') to sync after ID is assigned
                    transaction.on('complete', async () => {
                        // Query for the newly created record
                        // We need to use indexed fields to find the record efficiently
                        let record;

                        if (tableName === 'tracks') {
                            // For tracks, use releaseId and trackType (unique together)
                            record = await this.db.tracks
                                .where({ releaseId: obj.releaseId, trackType: obj.trackType })
                                .first();
                        } else if (tableName === 'releases') {
                            // For releases, use programId and releaseNumber (unique together)
                            record = await this.db.releases
                                .where({ programId: obj.programId, releaseNumber: obj.releaseNumber })
                                .first();
                        } else if (tableName === 'workouts') {
                            // For workouts, use date (unique)
                            record = await this.db.workouts
                                .where('date').equals(obj.date)
                                .first();
                        } else {
                            // For programs, query by all properties (programs are simple)
                            const records = await this.db[tableName].where(obj).toArray();
                            record = records.length > 0 ? records[0] : null;
                        }

                        if (record) {
                            console.log(`Syncing new ${tableName}/${record.id} to Firestore`);
                            await this.syncToFirestore(tableName, 'add', record);
                        } else {
                            console.warn(`Created ${tableName} but could not find record to sync`, obj);
                        }
                    });
                }
            });

            // Hook: updating
            this.db[tableName].hook('updating', (modifications, primKey, obj, transaction) => {
                if (!this.skipSync) {
                    const updated = { ...obj, ...modifications, id: primKey };
                    this.syncToFirestore(tableName, 'update', updated);
                }
            });

            // Hook: deleting
            this.db[tableName].hook('deleting', (primKey, obj, transaction) => {
                if (!this.skipSync) {
                    this.syncToFirestore(tableName, 'delete', { id: primKey });
                }
            });
        }
    }

    // Manual sync method for newly created records (call after .add())
    async syncNewRecord(tableName, id) {
        const record = await this.db[tableName].get(id);
        if (record) {
            console.log(`Syncing new ${tableName} with id:`, id);
            await this.syncToFirestore(tableName, 'add', record);
        }
    }

    async syncToFirestore(tableName, operation, data) {
        try {
            // Validate that data.id exists and is valid
            if (data.id === undefined || data.id === null) {
                console.error(`Cannot sync to Firestore: invalid ID for ${tableName}`, {
                    operation,
                    data,
                    idValue: data.id,
                    idType: typeof data.id
                });
                return; // Skip sync for records without valid IDs
            }

            const collectionPath = this.getCollectionPath(tableName);
            const docId = String(data.id);
            const docRef = this.firestore.collection(collectionPath).doc(docId);

            if (operation === 'delete') {
                await docRef.delete();
                console.log(`Deleted ${tableName}/${docId} from Firestore`);
            } else {
                // Remove undefined values (Firestore doesn't accept them)
                const cleanedData = this.removeUndefined(data);
                const firestoreData = {
                    ...cleanedData,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                };

                // Use .set() for both add and update (upsert behavior)
                // This works even if the document doesn't exist yet in Firestore
                await docRef.set(firestoreData);
                console.log(`${operation === 'add' ? 'Added' : 'Updated'} ${tableName}/${docId} in Firestore`);
            }
        } catch (error) {
            console.error(`Error syncing to Firestore (${operation} ${tableName}):`, error);
        }
    }

    destroy() {
        // Unsubscribe from all Firestore listeners
        this.listeners.forEach(unsubscribe => unsubscribe());
        this.listeners = [];

        // Note: Dexie hooks are automatically cleaned up
        console.log('Sync service destroyed');
    }
}
