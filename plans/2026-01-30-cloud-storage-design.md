---
title: "Cloud Storage Design for Les Mills Track Manager"
description: "Design document for adding Firebase cloud storage with Google authentication and real-time sync to the Les Mills Track Manager PWA"
created: "2026-01-30T22:43:46.831Z"
author: "AI Assistant"
tags: ["design", "firebase", "cloud-storage", "authentication", "sync"]
type: "document"
---

# Cloud Storage Design for Les Mills Track Manager

**Date:** 2026-01-30  
**Status:** Validated Design

## Overview

Add cloud storage to the Les Mills Track Manager PWA to prevent data loss when users accidentally delete the app. Uses Firebase with Google Sign-In and real-time sync.

## Design Decisions

- **Backend Service:** Firebase (managed service with excellent PWA support)
- **Authentication:** Google Sign-In (social login only)
- **Sync Strategy:** Real-time sync (every change immediately syncs)
- **Conflict Resolution:** Firestore's built-in handling (last write wins with server timestamps)
- **Offline Behavior:** Queue changes, sync when back online (Firebase native support)
- **Data Architecture:** Cloud as backup (IndexedDB remains primary, Firestore mirrors)
- **Migration:** Fresh start only (no automatic migration of existing local data)

## Architecture Overview

The cloud storage solution layers Firebase on top of the existing IndexedDB architecture. IndexedDB remains the source of truth for the app's UI, while Firebase Firestore acts as a synchronized backup.

### Key Components

1. **Firebase Authentication** - Google Sign-In (and optionally Apple Sign-In for iOS users)
2. **Firestore Database** - Cloud mirror of the four IndexedDB tables (programs, releases, tracks, workouts)
3. **Sync Service** - A new `js/services/sync.js` module that bridges IndexedDB and Firestore
4. **Auth UI** - Simple sign-in button in settings/profile area

### Data Flow

- User makes changes → Update IndexedDB → Sync service immediately writes to Firestore
- Firestore receives remote changes → Sync service updates IndexedDB → UI re-renders
- Offline changes → Queued in Firebase's offline cache → Auto-sync when connection returns

The sync service will listen to both IndexedDB changes (via Dexie.js hooks) and Firestore changes (via snapshot listeners) to keep both in sync. Since we're not migrating existing users, new users start with an empty cloud database that gets populated as they add data.

## Firebase Setup & Authentication

### Firebase Project Configuration

You'll need to create a Firebase project and enable:
- **Authentication** with Google sign-in provider (and Apple if targeting iOS users)
- **Firestore Database** in production mode initially, then add security rules
- **Hosting** (optional) for deploying the PWA

### Configuration File

**`js/config/firebase-config.js`:**
```javascript
export const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

### Authentication Flow

1. **Sign-in button** - Add to settings or as a persistent header element
2. **Sign-in popup** - Use Firebase's `signInWithPopup()` for Google OAuth
3. **Auth state listener** - Monitor `onAuthStateChanged()` to detect login/logout
4. **User ID** - Each user's data in Firestore will be scoped under their Firebase UID

### Security Approach

- Users can only read/write their own data in Firestore
- Firestore security rules enforce data isolation by user ID
- No server-side code needed - client SDK handles everything

## Firestore Data Structure

### Collection Hierarchy

```
users/{userId}/
  ├── programs/{programId}
  ├── releases/{releaseId}
  ├── tracks/{trackId}
  └── workouts/{workoutId}
```

All data is scoped under the user's Firebase UID, ensuring complete data isolation between users.

### Document Schemas

Matching the existing IndexedDB structure:

#### programs/{programId}
```javascript
{
  id: number,           // Same as IndexedDB auto-increment ID
  name: string,
  trackTypes: string[], // Array of track type names
  updatedAt: timestamp  // Server timestamp for conflict resolution
}
```

#### releases/{releaseId}
```javascript
{
  id: number,
  programId: number,
  releaseNumber: number,
  updatedAt: timestamp
}
```

#### tracks/{trackId}
```javascript
{
  id: number,
  releaseId: number,
  trackType: string,
  songTitle: string,
  lastUsed: date,
  rating: number,       // 0-5
  updatedAt: timestamp
}
```

#### workouts/{workoutId}
```javascript
{
  id: number,
  programId: number,
  date: date,
  clonedFrom: number,
  trackIds: number[],   // Array of track IDs in this workout
  updatedAt: timestamp
}
```

### Key Points

- Document IDs in Firestore match the IndexedDB auto-increment IDs (converted to strings)
- `updatedAt` timestamp on every document for conflict resolution
- Firestore document IDs will be the string version of the IndexedDB ID (e.g., "1", "42")

## Sync Service Implementation

**New file: `js/services/sync.js`**

This service handles bidirectional sync between IndexedDB and Firestore.

### Core Responsibilities

1. **Listen to IndexedDB changes** - Use Dexie hooks (`creating`, `updating`, `deleting`) to detect local changes
2. **Listen to Firestore changes** - Use Firestore snapshot listeners to detect remote changes
3. **Write to Firestore** - When IndexedDB changes, immediately write to Firestore
4. **Write to IndexedDB** - When Firestore changes arrive, update IndexedDB
5. **Prevent sync loops** - Track which changes originated locally vs remotely to avoid infinite loops

### Key Methods

```javascript
class SyncService {
  constructor(db, firestore, userId) { }
  
  async initialize() {
    // Set up Dexie hooks and Firestore listeners
  }
  
  async syncCollection(tableName) {
    // Sync a specific table/collection
  }
  
  destroy() {
    // Clean up listeners on logout
  }
}
```

### Sync Loop Prevention

Use a flag-based approach: when applying remote changes to IndexedDB, set a `_skipSync` flag temporarily so the Dexie hooks don't try to write those changes back to Firestore.

### Error Handling

- Network errors → Firebase handles retries automatically with offline persistence
- Write conflicts → Firestore's `updatedAt` timestamp wins (last write wins)
- Failed writes → Log to console, show user notification if persistent

## UI Changes & User Experience

### Sign-in UI

Add a new section to the app (either in settings tab or a persistent header):

```html
<!-- When signed out -->
<div id="auth-section">
  <button id="sign-in-btn">Sign in with Google</button>
  <p>Sign in to back up your data to the cloud</p>
</div>

<!-- When signed in -->
<div id="auth-section">
  <p>Signed in as: user@example.com</p>
  <span id="sync-status">✓ Synced</span>
  <button id="sign-out-btn">Sign out</button>
</div>
```

### Sync Status Indicator

- **✓ Synced** - All data is backed up
- **⟳ Syncing...** - Changes are being uploaded
- **⚠ Offline** - No connection, changes queued
- **✗ Error** - Sync failed (with retry button)

### User Experience for New Users

1. Install PWA → Use app locally (no account required)
2. Click "Sign in with Google" when ready
3. Authenticate via Google popup
4. All future changes automatically sync to cloud
5. Install on second device → Sign in → Data appears automatically

### Fresh Start Approach

Since we chose option D for migration, existing users who sign in will start with an empty cloud database. Their local data remains intact but isn't automatically uploaded. You can add a manual "Upload my data" button later if needed.

### No Account Required

Users can continue using the app without signing in - it works exactly as it does now with local-only storage.

## Error Handling & Edge Cases

### Authentication Errors

- **Popup blocked** → Show message: "Please allow popups for sign-in"
- **Sign-in cancelled** → Silently return to previous state
- **Network error during auth** → Show message: "Check your connection and try again"
- **Account disabled** → Show message from Firebase error

### Sync Errors

- **Permission denied (security rules)** → Sign out user, show message
- **Quota exceeded** → Show message: "Cloud storage full" (unlikely with free tier limits)
- **Document too large (>1MB)** → Log error, notify user (shouldn't happen with your data model)
- **Network timeout** → Firebase retries automatically, show "Offline" status

### Conflict Scenarios

1. **Same document edited on two devices simultaneously** → Firestore's server timestamp determines winner, last write wins
2. **Delete on one device, edit on another** → Delete wins (Firestore removes the document)
3. **Device offline for days, then reconnects** → All queued changes upload, Firestore merges with server state

### Edge Cases

- **User signs out** → Stop all sync listeners, clear sync service, keep local data intact
- **Switch accounts** → Stop previous user's sync, start new user's sync, local data remains (doesn't auto-switch)
- **Browser storage cleared** → Firestore data intact, re-downloads on next sign-in
- **Firestore data deleted manually** → Local data intact, can re-upload if needed

### Logging

All sync operations log to console for debugging. Production mode can reduce verbosity but keep error logs.

## Firestore Security Rules

**Security rules file** (deployed via Firebase Console or CLI):

```javascript
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

### What These Rules Do

1. **Authentication required** - `request.auth != null` ensures user is signed in
2. **User isolation** - `request.auth.uid == userId` ensures users can only access collections under their own UID
3. **Full CRUD access** - Users can create, read, update, and delete their own data
4. **Wildcard matching** - `{document=**}` applies rules to all subcollections (programs, releases, tracks, workouts)
5. **Default deny** - Everything else is blocked

### Additional Validation (Optional)

```javascript
// Validate program data structure
match /users/{userId}/programs/{programId} {
  allow write: if request.auth.uid == userId 
    && request.resource.data.name is string
    && request.resource.data.name.size() <= 100
    && request.resource.data.trackTypes is list;
}
```

### Testing Security Rules

Firebase provides a rules simulator in the console where you can test read/write operations with different user IDs to verify isolation works correctly.

## Testing Strategy

### Unit Tests

New test file: `tests/unit/sync.unit.test.html`

- Test sync service initialization with mocked Firestore
- Test IndexedDB → Firestore data transformation
- Test Firestore → IndexedDB data transformation
- Test sync loop prevention logic
- Test error handling for network failures

### Integration Tests

New test file: `tests/integration/sync.integration.test.html`

- Test authentication flow (requires Firebase emulator or test project)
- Test real-time sync between IndexedDB and Firestore
- Test offline → online sync queue
- Test sign-out cleanup

### E2E Tests

New test file: `tests/e2e/sync.e2e.test.html`

- Test complete workflow: sign in → create data → verify cloud backup
- Test multi-device simulation (two browser tabs with same user)
- Test conflict resolution (edit same item in two tabs)
- Test sign out → sign in → data restored

### Firebase Testing Approach

1. **Local development** - Use Firebase Emulator Suite for offline testing without hitting production
2. **Test Firebase project** - Create separate Firebase project for automated tests
3. **Manual testing** - Use real Firebase project with test Google account

### Mock vs Real Firebase

- Unit tests → Mock Firestore SDK
- Integration/E2E → Real Firebase (emulator or test project)

### What to Verify

- Data integrity (everything that goes into IndexedDB also reaches Firestore)
- Sync timing (changes appear in cloud within seconds)
- Offline persistence (changes queue and upload on reconnect)
- User isolation (can't see other users' data)

## Implementation Steps & File Structure

### New Files to Create

```
track-manager/
├── js/
│   ├── config/
│   │   └── firebase-config.js      # Firebase project configuration
│   ├── services/
│   │   └── sync.js                 # Sync service between IndexedDB and Firestore
│   └── views/
│       └── auth.js                 # Authentication UI component
├── tests/
│   ├── unit/
│   │   └── sync.unit.test.html
│   ├── integration/
│   │   └── sync.integration.test.html
│   └── e2e/
│       └── sync.e2e.test.html
```

### Files to Modify

- `index.html` - Add Firebase SDK scripts and auth UI section
- `js/app.js` - Initialize Firebase and sync service
- `js/db.js` - Add Dexie hooks for sync triggers
- `styles/main.css` - Add auth UI and sync status styles

### Implementation Order

1. **Set up Firebase project** - Create project, enable Google auth, create Firestore database
2. **Add Firebase SDK** - Include Firebase scripts in index.html
3. **Create firebase-config.js** - Add your project configuration
4. **Implement auth.js view** - Build sign-in/sign-out UI
5. **Implement sync.js service** - Build the sync engine
6. **Update app.js** - Wire up authentication state and sync initialization
7. **Add Dexie hooks** - Trigger syncs on local database changes
8. **Deploy security rules** - Lock down Firestore access
9. **Write tests** - Cover all three test levels
10. **Test multi-device** - Verify sync works across devices

### Estimated Complexity

- **Firebase setup** - 30 minutes
- **Authentication UI** - 2 hours
- **Sync service core** - 4-6 hours (most complex part)
- **Integration & testing** - 3-4 hours
- **Total** - ~10-12 hours of development

## Future Enhancements

Potential additions not included in this initial design:

- Manual "Upload my data" button for migrating existing local data
- Apple Sign-In for iOS users
- Data export/import functionality
- Admin dashboard to monitor usage
- Advanced conflict resolution (field-level merging)
- Firestore data validation rules
- Usage analytics