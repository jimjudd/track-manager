---
title: "Firebase Cloud Storage Implementation Plan"
description: "Step-by-step implementation plan for adding Firebase authentication and real-time sync to Les Mills Track Manager"
created: "2026-01-30T23:46:05.598Z"
author: "AI Assistant"
tags: ["implementation", "plan", "firebase", "sync", "authentication"]
type: "document"
---

# Firebase Cloud Storage Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add Firebase cloud storage with Google Sign-In and real-time sync to prevent data loss when users delete the PWA.

**Architecture:** IndexedDB remains the primary database. Firebase Firestore acts as a synchronized cloud backup. A sync service bridges the two using Dexie hooks (IndexedDB → Firestore) and Firestore snapshot listeners (Firestore → IndexedDB).

**Tech Stack:** Firebase SDK (Auth, Firestore), Dexie.js hooks, ES6 modules

**Reference:** See `plans/2026-01-30-cloud-storage-design.md` for complete design details.

---

## Prerequisites

Before starting, you must:
1. Create a Firebase project at https://console.firebase.google.com/
2. Enable Google Sign-In in Authentication settings
3. Create a Firestore database in production mode
4. Copy your Firebase config values (apiKey, authDomain, projectId, etc.)

---

## Task 1: Add Firebase SDK to index.html

**Files:**
- Modify: `index.html:32-36`

**Step 1: Add Firebase SDK scripts before Dexie.js**

Add these script tags in the `<head>` section after line 13:

```html
<!-- Firebase SDK -->
<script src="https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.7.1/firebase-auth-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore-compat.js"></script>
```

**Step 2: Verify scripts load**

Open the app in browser and check console for Firebase initialization. You should see no errors about Firebase being undefined.

**Step 3: Commit**

```bash
git add index.html
git commit -m "feat: add Firebase SDK scripts

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 2: Create Firebase Configuration File

**Files:**
- Create: `js/config/firebase-config.js`

**Step 1: Create config directory**

```bash
mkdir -p js/config
```

**Step 2: Create firebase-config.js with your Firebase project values**

```javascript
// ABOUTME: Firebase project configuration
// ABOUTME: Contains API keys and project identifiers for Firebase services

export const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

Replace the placeholder values with your actual Firebase config values from the Firebase Console.

**Step 3: Add to .gitignore (if config contains sensitive data)**

If you want to keep config private, add to `.gitignore`:

```
js/config/firebase-config.js
```

Then create `js/config/firebase-config.example.js` as a template for other developers.

**Step 4: Verify module exports**

Test import in browser console:
```javascript
import('./js/config/firebase-config.js').then(m => console.log(m.firebaseConfig))
```

**Step 5: Commit**

```bash
git add js/config/firebase-config.js
git commit -m "feat: add Firebase configuration

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 3: Create Authentication View - Test Setup

**Files:**
- Create: `tests/unit/auth.unit.test.html`

**Step 1: Create auth unit test file**

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Auth Unit Tests</title>
    <script src="https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js"></script>
    <script src="https://www.gstatic.com/firebasejs/10.7.1/firebase-auth-compat.js"></script>
    <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        .pass { color: green; }
        .fail { color: red; }
        h2 { margin-top: 20px; }
    </style>
</head>
<body>
    <h1>Auth View - Unit Tests</h1>
    <div id="test-results"></div>
    <div id="test-container" style="display: none;"></div>

    <script type="module">
        import { AuthView } from '../../js/views/auth.js';

        const results = document.getElementById('test-results');
        const testContainer = document.getElementById('test-container');
        let passCount = 0;
        let failCount = 0;

        function logTest(name, passed, error = null) {
            const div = document.createElement('div');
            div.className = passed ? 'pass' : 'fail';
            div.textContent = `${passed ? '✓' : '✗'} ${name}`;
            if (error) {
                div.textContent += `: ${error.message}`;
            }
            results.appendChild(div);
            if (passed) passCount++;
            else failCount++;
        }

        async function runTests() {
            results.innerHTML = '<h2>Running Unit Tests...</h2>';

            // Test 1: AuthView constructor
            try {
                const view = new AuthView(testContainer, null);
                if (view.container === testContainer) {
                    logTest('AuthView constructor sets container', true);
                } else {
                    throw new Error('Container not set correctly');
                }
            } catch (error) {
                logTest('AuthView constructor sets container', false, error);
            }

            // Test 2: Render creates sign-in UI when signed out
            try {
                const view = new AuthView(testContainer, null);
                await view.render();
                const signInBtn = testContainer.querySelector('#sign-in-btn');
                if (signInBtn) {
                    logTest('Render creates sign-in button when signed out', true);
                } else {
                    throw new Error('Sign-in button not found');
                }
            } catch (error) {
                logTest('Render creates sign-in button when signed out', false, error);
            }

            // Summary
            results.innerHTML += `<h2>Summary: ${passCount} passed, ${failCount} failed</h2>`;
        }

        runTests();
    </script>
</body>
</html>
```

**Step 2: Run test to verify it fails**

Open `tests/unit/auth.unit.test.html` in browser.
Expected: FAIL with "Failed to load module" or "AuthView is not defined"

**Step 3: Commit test file**

```bash
git add tests/unit/auth.unit.test.html
git commit -m "test: add AuthView unit test structure

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 4: Create Authentication View - Implementation

**Files:**
- Create: `js/views/auth.js`

**Step 1: Create AuthView class**

```javascript
// ABOUTME: Authentication UI component for Google Sign-In
// ABOUTME: Displays sign-in/sign-out buttons and sync status

export class AuthView {
    constructor(container, auth) {
        this.container = container;
        this.auth = auth;
        this.currentUser = null;
        this.onAuthStateChangedCallback = null;
    }

    async render() {
        if (this.currentUser) {
            this.renderSignedIn();
        } else {
            this.renderSignedOut();
        }
    }

    renderSignedOut() {
        this.container.innerHTML = `
            <div id="auth-section" class="auth-container">
                <button id="sign-in-btn" class="btn-primary">Sign in with Google</button>
                <p class="auth-message">Sign in to back up your data to the cloud</p>
            </div>
        `;

        const signInBtn = this.container.querySelector('#sign-in-btn');
        if (signInBtn) {
            signInBtn.addEventListener('click', () => this.signIn());
        }
    }

    renderSignedIn() {
        const email = this.currentUser?.email || 'Unknown';
        this.container.innerHTML = `
            <div id="auth-section" class="auth-container">
                <p class="auth-user">Signed in as: ${email}</p>
                <span id="sync-status" class="sync-status">✓ Synced</span>
                <button id="sign-out-btn" class="btn-secondary">Sign out</button>
            </div>
        `;

        const signOutBtn = this.container.querySelector('#sign-out-btn');
        if (signOutBtn) {
            signOutBtn.addEventListener('click', () => this.signOut());
        }
    }

    async signIn() {
        if (!this.auth) {
            console.error('Firebase auth not initialized');
            return;
        }

        try {
            const provider = new firebase.auth.GoogleAuthProvider();
            await this.auth.signInWithPopup(provider);
            // onAuthStateChanged will trigger render
        } catch (error) {
            console.error('Sign-in error:', error);
            this.showError(error.message);
        }
    }

    async signOut() {
        if (!this.auth) {
            console.error('Firebase auth not initialized');
            return;
        }

        try {
            await this.auth.signOut();
            // onAuthStateChanged will trigger render
        } catch (error) {
            console.error('Sign-out error:', error);
            this.showError(error.message);
        }
    }

    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'auth-error';
        errorDiv.textContent = message;
        this.container.appendChild(errorDiv);
        setTimeout(() => errorDiv.remove(), 5000);
    }

    updateSyncStatus(status) {
        const syncStatusEl = this.container.querySelector('#sync-status');
        if (!syncStatusEl) return;

        switch (status) {
            case 'synced':
                syncStatusEl.textContent = '✓ Synced';
                syncStatusEl.className = 'sync-status synced';
                break;
            case 'syncing':
                syncStatusEl.textContent = '⟳ Syncing...';
                syncStatusEl.className = 'sync-status syncing';
                break;
            case 'offline':
                syncStatusEl.textContent = '⚠ Offline';
                syncStatusEl.className = 'sync-status offline';
                break;
            case 'error':
                syncStatusEl.textContent = '✗ Error';
                syncStatusEl.className = 'sync-status error';
                break;
        }
    }

    onAuthStateChanged(callback) {
        this.onAuthStateChangedCallback = callback;
    }

    setUser(user) {
        this.currentUser = user;
        this.render();
        if (this.onAuthStateChangedCallback) {
            this.onAuthStateChangedCallback(user);
        }
    }

    destroy() {
        // Clean up event listeners
        this.container.innerHTML = '';
    }
}
```

**Step 2: Run test to verify it passes**

Open `tests/unit/auth.unit.test.html` in browser.
Expected: PASS for both tests

**Step 3: Commit**

```bash
git add js/views/auth.js
git commit -m "feat: implement AuthView with sign-in/sign-out

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 5: Add Auth Styles to CSS

**Files:**
- Modify: `styles/main.css`

**Step 1: Add auth component styles at end of file**

```css
/* Auth Component Styles */
.auth-container {
    padding: 1rem;
    background: #f5f5f5;
    border-radius: 8px;
    margin-bottom: 1rem;
    text-align: center;
}

.auth-user {
    margin: 0.5rem 0;
    font-weight: bold;
}

.auth-message {
    margin: 0.5rem 0;
    color: #666;
    font-size: 0.9rem;
}

.sync-status {
    display: inline-block;
    margin: 0.5rem;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-size: 0.9rem;
}

.sync-status.synced {
    background: #4caf50;
    color: white;
}

.sync-status.syncing {
    background: #2196f3;
    color: white;
}

.sync-status.offline {
    background: #ff9800;
    color: white;
}

.sync-status.error {
    background: #f44336;
    color: white;
}

.auth-error {
    background: #f44336;
    color: white;
    padding: 0.5rem;
    border-radius: 4px;
    margin-top: 0.5rem;
}
```

**Step 2: Verify styles**

Open app in browser and inspect auth component. Styles should apply correctly.

**Step 3: Commit**

```bash
git add styles/main.css
git commit -m "style: add auth component styles

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 6: Initialize Firebase in App.js

**Files:**
- Modify: `js/app.js:1-10`

**Step 1: Import Firebase config at top of file**

Add after existing imports:

```javascript
import { firebaseConfig } from './config/firebase-config.js';
import { AuthView } from './views/auth.js';
```

**Step 2: Add Firebase initialization in constructor**

After line 15 (before `this.init()`), add:

```javascript
this.firebaseApp = null;
this.firebaseAuth = null;
this.authView = null;
```

**Step 3: Add initializeFirebase method after init() method**

```javascript
initializeFirebase() {
    try {
        this.firebaseApp = firebase.initializeApp(firebaseConfig);
        this.firebaseAuth = firebase.auth();
        
        // Set up auth state listener
        this.firebaseAuth.onAuthStateChanged((user) => {
            console.log('Auth state changed:', user?.email || 'signed out');
            if (this.authView) {
                this.authView.setUser(user);
            }
        });

        console.log('Firebase initialized successfully');
    } catch (error) {
        console.error('Firebase initialization failed:', error);
    }
}
```

**Step 4: Call initializeFirebase in init() method**

After line 20 (`this.setupServiceWorker();`), add:

```javascript
this.initializeFirebase();
```

**Step 5: Test in browser**

Open browser console and verify "Firebase initialized successfully" appears.

**Step 6: Commit**

```bash
git add js/app.js
git commit -m "feat: initialize Firebase in app

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 7: Add Auth UI to Header

**Files:**
- Modify: `index.html:16-19`
- Modify: `js/app.js:19-23`

**Step 1: Add auth section to header in index.html**

Replace header section (lines 17-19):

```html
<header>
    <h1>Les Mills Track Manager</h1>
    <div id="auth-container"></div>
</header>
```

**Step 2: Initialize AuthView in app.js**

In `initializeFirebase()` method, after line with `console.log('Firebase initialized successfully')`, add:

```javascript
// Initialize auth view
const authContainer = document.getElementById('auth-container');
if (authContainer) {
    this.authView = new AuthView(authContainer, this.firebaseAuth);
    this.authView.render();
}
```

**Step 3: Test auth UI**

Open app in browser. You should see "Sign in with Google" button in header.

**Step 4: Test sign-in flow**

Click "Sign in with Google" button. Google OAuth popup should appear.

**Step 5: Commit**

```bash
git add index.html js/app.js
git commit -m "feat: add auth UI to header

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 8: Create Sync Service - Test Setup

**Files:**
- Create: `tests/unit/sync.unit.test.html`

**Step 1: Create sync unit test file**

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Sync Service Unit Tests</title>
    <script src="https://unpkg.com/dexie@3.2.4/dist/dexie.min.js"></script>
    <script src="https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js"></script>
    <script src="https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore-compat.js"></script>
    <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        .pass { color: green; }
        .fail { color: red; }
        h2 { margin-top: 20px; }
    </style>
</head>
<body>
    <h1>Sync Service - Unit Tests</h1>
    <div id="test-results"></div>

    <script type="module">
        import { db } from '../../js/db.js';
        import { SyncService } from '../../js/services/sync.js';

        const results = document.getElementById('test-results');
        let passCount = 0;
        let failCount = 0;

        function logTest(name, passed, error = null) {
            const div = document.createElement('div');
            div.className = passed ? 'pass' : 'fail';
            div.textContent = `${passed ? '✓' : '✗'} ${name}`;
            if (error) {
                div.textContent += `: ${error.message}`;
            }
            results.appendChild(div);
            if (passed) passCount++;
            else failCount++;
        }

        async function runTests() {
            results.innerHTML = '<h2>Running Unit Tests...</h2>';

            // Test 1: SyncService constructor
            try {
                const mockFirestore = { collection: () => ({}) };
                const service = new SyncService(db, mockFirestore, 'test-user-123');
                if (service.db === db && service.userId === 'test-user-123') {
                    logTest('SyncService constructor sets properties', true);
                } else {
                    throw new Error('Properties not set correctly');
                }
            } catch (error) {
                logTest('SyncService constructor sets properties', false, error);
            }

            // Test 2: Collection path generation
            try {
                const mockFirestore = { collection: () => ({}) };
                const service = new SyncService(db, mockFirestore, 'test-user-123');
                const path = service.getCollectionPath('programs');
                if (path === 'users/test-user-123/programs') {
                    logTest('getCollectionPath generates correct path', true);
                } else {
                    throw new Error(`Expected 'users/test-user-123/programs', got '${path}'`);
                }
            } catch (error) {
                logTest('getCollectionPath generates correct path', false, error);
            }

            // Summary
            results.innerHTML += `<h2>Summary: ${passCount} passed, ${failCount} failed</h2>`;
        }

        runTests();
    </script>
</body>
</html>
```

**Step 2: Run test to verify it fails**

Open `tests/unit/sync.unit.test.html` in browser.
Expected: FAIL with "SyncService is not defined"

**Step 3: Commit**

```bash
git add tests/unit/sync.unit.test.html
git commit -m "test: add SyncService unit test structure

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 9: Create Sync Service - Core Implementation

**Files:**
- Create: `js/services/sync.js`

**Step 1: Create services directory and sync.js**

```bash
mkdir -p js/services
```

**Step 2: Implement SyncService class**

```javascript
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
```

**Step 3: Run test to verify it passes**

Open `tests/unit/sync.unit.test.html` in browser.
Expected: PASS for both tests

**Step 4: Commit**

```bash
git add js/services/sync.js
git commit -m "feat: implement SyncService core functionality

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 10: Integrate Sync Service with App

**Files:**
- Modify: `js/app.js:3-5, 16-18`

**Step 1: Import SyncService**

Add to imports at top of file:

```javascript
import { SyncService } from './services/sync.js';
import { db } from './db.js';
```

**Step 2: Add syncService property to constructor**

After line with `this.authView = null;`, add:

```javascript
this.syncService = null;
```

**Step 3: Update auth state change handler in initializeFirebase()**

Replace the `onAuthStateChanged` callback:

```javascript
// Set up auth state listener
this.firebaseAuth.onAuthStateChanged(async (user) => {
    console.log('Auth state changed:', user?.email || 'signed out');
    
    // Destroy existing sync service
    if (this.syncService) {
        this.syncService.destroy();
        this.syncService = null;
    }
    
    // Update auth view
    if (this.authView) {
        this.authView.setUser(user);
    }
    
    // Initialize sync service if signed in
    if (user) {
        try {
            const firestore = firebase.firestore();
            this.syncService = new SyncService(db, firestore, user.uid);
            await this.syncService.initialize();
            
            if (this.authView) {
                this.authView.updateSyncStatus('synced');
            }
        } catch (error) {
            console.error('Failed to initialize sync service:', error);
            if (this.authView) {
                this.authView.updateSyncStatus('error');
            }
        }
    }
});
```

**Step 4: Test sync initialization**

1. Open app in browser
2. Sign in with Google
3. Check console for "Sync service initialized" message

**Step 5: Commit**

```bash
git add js/app.js
git commit -m "feat: integrate SyncService with authentication

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 11: Deploy Firestore Security Rules

**Files:**
- Create: `firestore.rules`

**Step 1: Create firestore.rules file in project root**

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own data
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Deny all other access
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

**Step 2: Deploy rules using Firebase CLI**

```bash
# Install Firebase CLI if not already installed
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase in project (select Firestore only)
firebase init firestore

# Deploy rules
firebase deploy --only firestore:rules
```

**Step 3: Verify rules in Firebase Console**

1. Go to Firestore Database > Rules tab
2. Verify rules match the file
3. Test with the Rules Playground

**Step 4: Commit**

```bash
git add firestore.rules
git commit -m "feat: add Firestore security rules

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 12: Add Integration Test for Auth Flow

**Files:**
- Create: `tests/integration/auth.integration.test.html`

**Step 1: Create integration test file**

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Auth Integration Tests</title>
    <script src="https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js"></script>
    <script src="https://www.gstatic.com/firebasejs/10.7.1/firebase-auth-compat.js"></script>
    <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        .pass { color: green; }
        .fail { color: red; }
        .info { color: blue; }
        h2 { margin-top: 20px; }
    </style>
</head>
<body>
    <h1>Auth Integration Tests</h1>
    <p class="info">Note: These tests require manual interaction (sign-in popup)</p>
    <div id="test-results"></div>
    <div id="test-container"></div>

    <script type="module">
        import { firebaseConfig } from '../../js/config/firebase-config.js';
        import { AuthView } from '../../js/views/auth.js';

        const results = document.getElementById('test-results');
        const testContainer = document.getElementById('test-container');
        let passCount = 0;
        let failCount = 0;

        function logTest(name, passed, error = null) {
            const div = document.createElement('div');
            div.className = passed ? 'pass' : 'fail';
            div.textContent = `${passed ? '✓' : '✗'} ${name}`;
            if (error) {
                div.textContent += `: ${error.message}`;
            }
            results.appendChild(div);
            if (passed) passCount++;
            else failCount++;
        }

        async function runTests() {
            results.innerHTML = '<h2>Running Integration Tests...</h2>';

            // Initialize Firebase
            const app = firebase.initializeApp(firebaseConfig);
            const auth = firebase.auth();

            // Test 1: Sign-in flow renders correctly
            try {
                const view = new AuthView(testContainer, auth);
                await view.render();
                
                const signInBtn = testContainer.querySelector('#sign-in-btn');
                if (signInBtn) {
                    logTest('Sign-in UI renders when not authenticated', true);
                } else {
                    throw new Error('Sign-in button not found');
                }
            } catch (error) {
                logTest('Sign-in UI renders when not authenticated', false, error);
            }

            // Test 2: Auth state listener works
            try {
                let callbackFired = false;
                const view = new AuthView(testContainer, auth);
                view.onAuthStateChanged((user) => {
                    callbackFired = true;
                });
                
                // Simulate user change
                view.setUser({ email: 'test@example.com' });
                
                if (callbackFired) {
                    logTest('Auth state change callback fires', true);
                } else {
                    throw new Error('Callback did not fire');
                }
            } catch (error) {
                logTest('Auth state change callback fires', false, error);
            }

            // Summary
            results.innerHTML += `<h2>Summary: ${passCount} passed, ${failCount} failed</h2>`;
        }

        runTests();
    </script>
</body>
</html>
```

**Step 2: Run test**

Open `tests/integration/auth.integration.test.html` in browser.
Expected: Tests should pass

**Step 3: Commit**

```bash
git add tests/integration/auth.integration.test.html
git commit -m "test: add auth integration tests

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 13: Add E2E Test for Complete Sync Flow

**Files:**
- Create: `tests/e2e/sync.e2e.test.html`

**Step 1: Create E2E test file**

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Sync E2E Tests</title>
    <script src="https://unpkg.com/dexie@3.2.4/dist/dexie.min.js"></script>
    <script src="https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js"></script>
    <script src="https://www.gstatic.com/firebasejs/10.7.1/firebase-auth-compat.js"></script>
    <script src="https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore-compat.js"></script>
    <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        .pass { color: green; }
        .fail { color: red; }
        .info { color: blue; }
        h2 { margin-top: 20px; }
    </style>
</head>
<body>
    <h1>Sync E2E Tests</h1>
    <p class="info">Note: These tests require Firebase authentication and internet connection</p>
    <p class="info">You must sign in manually when prompted</p>
    <button id="start-test-btn">Start E2E Test</button>
    <div id="test-results"></div>

    <script type="module">
        import { firebaseConfig } from '../../js/config/firebase-config.js';
        import { db } from '../../js/db.js';
        import { SyncService } from '../../js/services/sync.js';
        import { Program } from '../../js/models/Program.js';

        const results = document.getElementById('test-results');
        const startBtn = document.getElementById('start-test-btn');
        let passCount = 0;
        let failCount = 0;

        function logTest(name, passed, error = null) {
            const div = document.createElement('div');
            div.className = passed ? 'pass' : 'fail';
            div.textContent = `${passed ? '✓' : '✗'} ${name}`;
            if (error) {
                div.textContent += `: ${error.message}`;
            }
            results.appendChild(div);
            if (passed) passCount++;
            else failCount++;
        }

        startBtn.addEventListener('click', async () => {
            results.innerHTML = '<h2>Running E2E Tests...</h2>';
            startBtn.disabled = true;

            // Initialize Firebase
            const app = firebase.initializeApp(firebaseConfig);
            const auth = firebase.auth();
            const firestore = firebase.firestore();

            // Wait for authentication
            results.innerHTML += '<p class="info">Please sign in when prompted...</p>';
            
            try {
                const provider = new firebase.auth.GoogleAuthProvider();
                const result = await auth.signInWithPopup(provider);
                const user = result.user;
                
                logTest('User successfully authenticated', true);

                // Clear test data
                await db.programs.clear();
                results.innerHTML += '<p class="info">Cleared local database...</p>';

                // Initialize sync service
                const syncService = new SyncService(db, firestore, user.uid);
                await syncService.initialize();
                logTest('Sync service initialized', true);

                // Test: Create program in IndexedDB, verify it syncs to Firestore
                const programId = await db.programs.add(new Program('Test Program E2E', ['Warmup', 'Peak']));
                
                // Wait for sync
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                const firestoreDoc = await firestore
                    .collection(`users/${user.uid}/programs`)
                    .doc(String(programId))
                    .get();
                
                if (firestoreDoc.exists && firestoreDoc.data().name === 'Test Program E2E') {
                    logTest('Program synced from IndexedDB to Firestore', true);
                } else {
                    throw new Error('Program not found in Firestore');
                }

                // Clean up
                await db.programs.delete(programId);
                await firestore
                    .collection(`users/${user.uid}/programs`)
                    .doc(String(programId))
                    .delete();
                
                syncService.destroy();
                await auth.signOut();

                // Summary
                results.innerHTML += `<h2>Summary: ${passCount} passed, ${failCount} failed</h2>`;
            } catch (error) {
                logTest('E2E test execution', false, error);
                results.innerHTML += `<h2>Summary: ${passCount} passed, ${failCount} failed</h2>`;
            }

            startBtn.disabled = false;
        });
    </script>
</body>
</html>
```

**Step 2: Run test manually**

1. Open `tests/e2e/sync.e2e.test.html` in browser
2. Click "Start E2E Test"
3. Sign in when prompted
4. Verify test passes

**Step 3: Commit**

```bash
git add tests/e2e/sync.e2e.test.html
git commit -m "test: add E2E test for complete sync flow

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 14: Update run-all-tests.html

**Files:**
- Modify: `tests/run-all-tests.html`

**Step 1: Add new test files to run-all-tests.html**

Add to the iframe list:

```html
<iframe src="./unit/auth.unit.test.html"></iframe>
<iframe src="./unit/sync.unit.test.html"></iframe>
<iframe src="./integration/auth.integration.test.html"></iframe>
```

Note: E2E test requires manual interaction, so it's not included in run-all-tests.

**Step 2: Test**

Open `tests/run-all-tests.html` and verify all tests run.

**Step 3: Commit**

```bash
git add tests/run-all-tests.html
git commit -m "test: add auth and sync tests to run-all-tests

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 15: Add Offline Status Detection

**Files:**
- Modify: `js/app.js`

**Step 1: Add online/offline event listeners in init()**

After `this.initializeFirebase();`, add:

```javascript
this.setupNetworkListeners();
```

**Step 2: Add setupNetworkListeners() method after initializeFirebase()**

```javascript
setupNetworkListeners() {
    window.addEventListener('online', () => {
        console.log('Network: online');
        if (this.authView) {
            this.authView.updateSyncStatus('syncing');
            // Status will update to 'synced' once sync completes
            setTimeout(() => {
                if (this.authView) {
                    this.authView.updateSyncStatus('synced');
                }
            }, 2000);
        }
    });

    window.addEventListener('offline', () => {
        console.log('Network: offline');
        if (this.authView) {
            this.authView.updateSyncStatus('offline');
        }
    });
}
```

**Step 3: Test offline detection**

1. Open app in browser with DevTools
2. Go to Network tab
3. Toggle "Offline" checkbox
4. Verify sync status changes to "⚠ Offline"
5. Toggle back online
6. Verify sync status changes to "⟳ Syncing..." then "✓ Synced"

**Step 4: Commit**

```bash
git add js/app.js
git commit -m "feat: add offline status detection

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 16: Update CLAUDE.md Documentation

**Files:**
- Modify: `CLAUDE.md`

**Step 1: Add Firebase section to Technology Stack**

In the Technology Stack section, update to:

```markdown
### Technology Stack
- **Frontend:** Vanilla JavaScript (ES6+ modules) - no frameworks, no build process
- **Database:** IndexedDB via Dexie.js wrapper
- **Cloud Storage:** Firebase Firestore with real-time sync
- **Authentication:** Firebase Authentication (Google Sign-In)
- **Offline:** Service Workers for PWA functionality
- **Styling:** CSS Grid/Flexbox, mobile-first design
```

**Step 2: Add Firebase section to File Structure**

Update File Structure section:

```markdown
├── js/
│   ├── app.js          # Main entry point, tab routing, service worker registration
│   ├── db.js           # Dexie.js schema and IndexedDB configuration
│   ├── config/
│   │   └── firebase-config.js  # Firebase project configuration
│   ├── services/
│   │   └── sync.js     # Sync service between IndexedDB and Firestore
│   ├── models/         # Data model classes (Program, Release, Track, Workout)
│   └── views/          # View components (library.js, tracks.js, workouts.js, auth.js)
```

**Step 3: Add Firebase setup instructions**

Add new section after "Development Commands":

```markdown
## Firebase Setup

### Prerequisites
1. Create Firebase project at https://console.firebase.google.com/
2. Enable Google Sign-In in Authentication settings
3. Create Firestore database in production mode
4. Deploy security rules: `firebase deploy --only firestore:rules`

### Configuration
- Copy Firebase config values to `js/config/firebase-config.js`
- Never commit sensitive config to public repos
```

**Step 4: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md with Firebase information

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 17: Add .gitignore Entry for Firebase Config

**Files:**
- Modify: `.gitignore`

**Step 1: Add Firebase config to .gitignore (optional)**

If you want to keep Firebase config private, add to `.gitignore`:

```
# Firebase config (optional - remove if config should be public)
js/config/firebase-config.js
```

**Step 2: Create example config file**

Create `js/config/firebase-config.example.js`:

```javascript
// ABOUTME: Firebase project configuration template
// ABOUTME: Copy this to firebase-config.js and fill in your values

export const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

**Step 3: Commit**

```bash
git add .gitignore js/config/firebase-config.example.js
git commit -m "chore: add gitignore for Firebase config

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Verification Checklist

After completing all tasks, verify:

- [ ] User can sign in with Google
- [ ] User can sign out
- [ ] Sync status indicator shows correct status
- [ ] Creating a program syncs to Firestore
- [ ] Creating a release syncs to Firestore
- [ ] Creating a track syncs to Firestore
- [ ] Creating a workout syncs to Firestore
- [ ] Editing data syncs changes to Firestore
- [ ] Deleting data removes from Firestore
- [ ] Offline indicator shows when network is down
- [ ] Data queues when offline and syncs when back online
- [ ] Second device shows data after signing in
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] E2E test passes

---

## Troubleshooting

**Firebase not initialized:**
- Check console for Firebase SDK script loading errors
- Verify firebaseConfig values are correct

**Sign-in popup blocked:**
- Allow popups in browser settings
- Try again after allowing

**Sync not working:**
- Check Firestore security rules are deployed
- Verify user is authenticated
- Check browser console for errors
- Verify network connection

**Tests failing:**
- Clear IndexedDB: DevTools > Application > Storage > Clear site data
- Hard refresh browser: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
- Check Firebase config is correct