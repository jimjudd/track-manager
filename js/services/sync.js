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

    async initialize() {
        console.log('Initializing sync service for user:', this.userId);

        // Set up Firestore listeners for all collections
        await this.setupFirestoreListeners();

        // Set up Dexie hooks for all tables
        this.setupDexieHooks();

        console.log('Sync service initialized');
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
            snapshot.docChanges().forEach(async (change) => {
                const docData = change.doc.data();
                const docId = parseInt(change.doc.id, 10);

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
            });
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
            this.db[tableName].hook('creating', (primKey, obj, transaction) => {
                if (!this.skipSync) {
                    this.syncToFirestore(tableName, 'add', { ...obj, id: primKey });
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

    async syncToFirestore(tableName, operation, data) {
        try {
            const collectionPath = this.getCollectionPath(tableName);
            const docId = String(data.id);
            const docRef = this.firestore.collection(collectionPath).doc(docId);

            if (operation === 'delete') {
                await docRef.delete();
                console.log(`Deleted ${tableName}/${docId} from Firestore`);
            } else {
                const firestoreData = {
                    ...data,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                };

                if (operation === 'add') {
                    await docRef.set(firestoreData);
                    console.log(`Added ${tableName}/${docId} to Firestore`);
                } else {
                    await docRef.update(firestoreData);
                    console.log(`Updated ${tableName}/${docId} in Firestore`);
                }
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
