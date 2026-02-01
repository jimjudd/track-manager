# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## ⚠️ Breaking Change - Version 2.0

**Architecture Change:** Migrated from IndexedDB+Sync to Firestore-only (online-only webapp).

**What Changed:**
- Removed: Dexie.js, IndexedDB, bidirectional sync service
- Added: Direct Firestore access via `firestore-db.js` data access layer
- **Breaking:** Users must start fresh - existing IndexedDB data will not be migrated
- **Requirement:** Internet connection required - app is online-only

**Migration from v1.x:**
- Users lose local data (acceptable per project requirements)
- No automatic migration tool provided
- Users can manually export/import if needed (future feature)

## Project Overview

Les Mills Track Manager is a Progressive Web App (PWA) for Les Mills fitness instructors to manage workouts, track usage, and rate tracks. Built with vanilla JavaScript (ES6+), no build tools required.

**Key constraint:** Instructors manage multiple Les Mills programs (BodyPump, BodyAttack, etc.), each with 25+ quarterly releases containing ~10 tracks. Tracks can be mixed/matched to create custom workouts.

## Architecture

### Technology Stack
- **Frontend:** Vanilla JavaScript (ES6+ modules) - no frameworks, no build process
- **Database:** Firebase Firestore (online-only, single source of truth)
- **Authentication:** Firebase Authentication (Google Sign-In)
- **Offline:** Service Workers for asset caching only (app requires internet connection)
- **Styling:** CSS Grid/Flexbox, mobile-first design

### Data Model
- **Program:** Contains name and ordered list of track types (e.g., "Warmup", "Squats", "Chest")
- **Release:** Quarterly release number associated with a program
- **Track:** Individual song with type, rating (0-5 stars), and last-used date
- **Workout:** Collection of tracks (one per track type) with date taught

### File Structure
```
track-manager/
├── js/
│   ├── app.js          # Main entry point, tab routing, service worker registration
│   ├── config/
│   │   └── firebase-config.js  # Firebase project configuration
│   ├── services/
│   │   └── firestore-db.js     # Firestore data access layer with Dexie-like API
│   ├── models/         # Data model classes (Program, Release, Track, Workout)
│   └── views/          # View components (library.js, tracks.js, workouts.js, auth.js)
├── tests/
│   ├── test-utils.js   # Shared Firestore mocking utilities
│   ├── unit/           # Isolated component tests
│   ├── integration/    # Component interaction tests
│   └── e2e/            # Complete user workflow tests
└── styles/
    └── main.css        # All application styles
```

## Firebase Setup

### Prerequisites
1. Create Firebase project at https://console.firebase.google.com/
2. Enable Google Sign-In in Authentication settings
3. Create Firestore database in production mode
4. Deploy security rules (see `firestore.rules`)

### Configuration
- Copy Firebase config values to `js/config/firebase-config.js`
- **Important:** Users must be signed in to access data - app is online-only

## Development Commands

### Running Locally
```bash
# Start local web server (required for service workers and ES6 modules)
python -m http.server 8000
# Then open http://localhost:8000/track-manager/
```

### Running Tests
All tests are standalone HTML files that can be opened directly in a browser:

```bash
# Run all tests at once
open tests/run-all-tests.html

# Run specific test suites
open tests/unit/library.unit.test.html
open tests/integration/library.integration.test.html
open tests/e2e/library.e2e.test.html
```

Tests use mocked Firestore SDK (see `tests/test-utils.js`) and require no test runner. Check browser console for results.

### Testing PWA Features
```bash
# Service worker testing in Chrome
# 1. Open Chrome DevTools
# 2. Application tab > Service Workers
# 3. Check "Update on reload" during development
```

## Code Style Conventions

### File Headers
All JavaScript files must start with a 2-line "ABOUTME" comment:
```javascript
// ABOUTME: Brief description of what the file does
// ABOUTME: Additional context about its role in the system
```

### View Pattern
Views follow a consistent pattern:
- Constructor takes a container element
- `render()` method updates the DOM (async for database operations)
- `destroy()` method cleans up event listeners to prevent memory leaks
- All user input is sanitized to prevent XSS (use `textContent`, not `innerHTML` for user data)

### Database Access
- All database operations are async (Firestore API)
- Access database via `window.db` (available after sign-in)
- Use Firestore data access layer (`firestore-db.js`) - provides Dexie-like API for consistency
- Always handle errors and provide user feedback
- App requires internet connection - shows offline banner when disconnected

## Firestore Architecture

### Document IDs
- All documents use Firestore auto-generated IDs (strings like "a1b2c3d4e5f6")
- No numeric auto-increment IDs
- Model classes attach `id` property from Firestore snapshot
- IDs are available as `object.id` after retrieval from database

### Data Access Pattern
- Views access database via `window.db` (set by app.js after authentication)
- `window.db` is `null` when user is signed out
- All views check for `window.db` existence before rendering data
- FirestoreDB class (`js/services/firestore-db.js`) provides Dexie-compatible API

### Model Serialization
All model classes implement:
- `toFirestore()` - Converts instance to plain object for Firestore storage (excludes `id`)
- `static fromFirestore(snapshot)` - Creates instance from Firestore document (includes `id` from snapshot)

### Online-Only Design
- App requires internet connection to function
- Shows orange banner when offline: "You are offline. Reconnect to use the app."
- Service worker caches assets (HTML, CSS, JS) for faster loading, but not data
- All database operations fail gracefully with user-friendly error messages when offline

## Key Implementation Details

### Modal Accessibility
Modals must include:
- `role="dialog"` and `aria-modal="true"` attributes
- ESC key closes modal
- Focus management (trap focus in modal, restore on close)

### Security Requirements
- **XSS Prevention:** Always escape user input using `textContent` or sanitization
- **Input Validation:** Program names max 100 characters, check for duplicates
- **Error Handling:** Never expose raw error messages; provide user-friendly feedback

### Inline Track Entry
When creating or editing a release, users can optionally fill in track information (song title and artist) directly in the release modal. This reduces the number of modal interactions from 20+ down to 1 for a typical release with 10 tracks.

- Tracks are optional when creating a release - users can skip them and add later via "+ Add Track"
- The modal displays scrollable input rows for all track types in the program
- When editing a release, existing tracks are pre-filled for reference
- New tracks can be added inline during edit, but existing tracks cannot be modified inline (use the track edit modal)
- All inline track inputs use `data-track-type` attributes for identification to handle special characters safely
- Input validation (max length 200 chars) applies to all inline track fields

### Track "Last Used" Updates
When a workout is saved, the app automatically updates the `lastUsed` date on all tracks in that workout. This is critical for helping instructors avoid repetition.

### Rating System
- Tracks have 0-5 star ratings (optional)
- Ratings can be updated inline during workout creation or from track detail view
- Ratings persist across all uses of a track

## Testing Requirements

Every feature must have:
1. **Unit tests** - Test individual methods in isolation
2. **Integration tests** - Test user interactions between components
3. **E2E tests** - Test complete workflows
4. **Security tests** - Test XSS prevention and input validation where applicable

See `tests/TESTING.md` for detailed testing documentation.

## Common Workflows

### Adding a New View
1. Create file in `js/views/[name].js`
2. Add ABOUTME header comments
3. Export class with constructor, render(), and destroy() methods
4. Import and instantiate in `app.js`
5. Add tab button in `index.html` if creating new tab
6. Create corresponding test files in tests/unit/, tests/integration/, tests/e2e/

### Modifying Database Schema
1. Update schema in `js/db.js` (increment version number)
2. Update corresponding model class in `js/models/`
3. Add migration logic if changing existing data structure
4. Update all affected views
5. Update all affected tests

## Migration Path

This web app is an MVP designed to be eventually migrated to native iOS. Data model and workflow design intentionally support future migration:
- Data exports as JSON
- Same data model structure for SwiftData migration
- Design decisions validated before native development
