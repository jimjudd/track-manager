# PWA Features Manual Testing

This document describes how to manually test the PWA features of the Les Mills Track Manager.

## Prerequisites

- Chrome, Edge, or Safari browser
- Local web server running (e.g., `python -m http.server 8000`)
- Access to browser DevTools

## Test 1: App Icons

**Objective:** Verify that custom icons appear when installing the app.

**Steps:**
1. Open the app in Chrome: `http://localhost:8000/`
2. Open DevTools > Application tab > Manifest section
3. Verify manifest shows:
   - Icon 192x192 (icons/icon-192.png)
   - Icon 512x512 (icons/icon-512.png)
4. Click "Add to Home Screen" / "Install App" in browser menu
5. Verify the app icon appears on home screen/app launcher

**Expected Result:** Custom Les Mills red icons appear in manifest and on installed app

## Test 2: Offline Functionality

**Objective:** Verify app works offline.

**Steps:**
1. Open app and ensure it loads completely
2. Create/view some data (workouts, tracks)
3. Open DevTools > Network tab
4. Enable "Offline" mode
5. Navigate between tabs (Workouts, Tracks, Library)
6. Try to interact with existing data

**Expected Result:** App continues to work offline. Existing data is accessible. UI remains functional.

## Test 3: Service Worker Caching

**Objective:** Verify service worker caches assets correctly.

**Steps:**
1. Open app: `http://localhost:8000/`
2. Open DevTools > Application > Service Workers
3. Verify service worker is registered and activated
4. Open DevTools > Application > Cache Storage
5. Expand `lm-track-manager-v1.0.0` cache
6. Verify cached assets include:
   - index.html
   - main.css
   - app.js
   - All view files (library.js, tracks.js, workouts.js)
   - All model files
   - Icons
   - Dexie library

**Expected Result:** All static assets are cached. Cache name includes version number.

## Test 4: Update Notification

**Objective:** Verify update notification appears when new version is available.

**Steps:**
1. Open app and ensure service worker is registered
2. Note current cache version in DevTools > Application > Cache Storage
3. Modify `sw.js` - change `CACHE_VERSION` from `v1.0.0` to `v1.0.1`
4. Save the file
5. In DevTools > Application > Service Workers, click "Update"
6. Wait for new service worker to install
7. Observe if update notification appears at bottom of page

**Expected Result:**
- Update notification appears with "A new version is available!" message
- Shows "Update Now" and "Later" buttons
- Clicking "Update Now" refreshes the page with new version
- Clicking "Later" dismisses the notification

## Test 5: Install Prompt

**Objective:** Verify PWA install prompt appears on supported browsers.

**Steps:**
1. Open app in Chrome (desktop)
2. Ensure you haven't previously installed the app
3. Wait a few seconds for install prompt criteria to be met
4. Look for install button in address bar or browser menu

**Expected Result:** Browser offers option to install app (Chrome shows "Install" button in address bar)

## Test 6: Standalone Display

**Objective:** Verify app displays in standalone mode when installed.

**Steps:**
1. Install the app via browser install prompt
2. Launch installed app from home screen/app launcher
3. Observe the app window

**Expected Result:**
- App opens in standalone window (no browser UI)
- Les Mills theme color (#E31C23) appears in title bar
- App behaves like a native application

## Test 7: Cache Updates

**Objective:** Verify old caches are deleted when new version is installed.

**Steps:**
1. Open app with version v1.0.0 service worker
2. Check cache storage shows `lm-track-manager-v1.0.0`
3. Update service worker to v1.0.1 (change `CACHE_VERSION`)
4. Force update in DevTools > Service Workers
5. Check cache storage again

**Expected Result:**
- Old cache `lm-track-manager-v1.0.0` is deleted
- New cache `lm-track-manager-v1.0.1` is created
- Only one cache exists at a time

## Test 8: Network Fallback

**Objective:** Verify app falls back to network when cache misses.

**Steps:**
1. Open app and let service worker cache assets
2. Create a new file (e.g., `test.json`) in the app directory
3. Try to access the file via URL: `http://localhost:8000/test.json`
4. Check DevTools > Network to see if request goes to network

**Expected Result:** Request for uncached files go to network. Successfully fetched files are added to cache for future use.

## Notes

- These tests should be run before each release
- Update this document if new PWA features are added
- Some features may behave differently in different browsers
