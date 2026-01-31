# Inline Track Entry Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enable users to enter all track information inline when creating/editing a release, reducing 20+ modal interactions to 1.

**Architecture:** Expand release form modal to include scrollable track type rows with song/artist inputs. On save, create release and all filled tracks in single transaction.

**Tech Stack:** Vanilla JavaScript ES6+, IndexedDB via Dexie.js, HTML5, CSS Grid

**Design Doc:** plans/2026-01-30-inline-track-entry-design.md

---

## Task 1: Add renderTrackInputsForRelease helper and unit tests

**Files:**
- Create: `tests/unit/release-with-tracks.unit.test.html`
- Modify: `js/views/library.js` (add method after renderReleaseItem)

**Steps:**

1. Create unit test file testing:
   - Generates HTML for 3 track types
   - Handles single track type
   - Escapes HTML in track type names
   - Includes all CSS classes

2. Implement `renderTrackInputsForRelease(program, existingTracks = [])`:
   - Return empty state if no program
   - Map track types to input rows
   - Escape all HTML using this.escapeHtml()
   - Generate IDs: `track-title-${trackType}` and `track-artist-${trackType}`
   - Pre-fill if existingTracks provided
   - Wrap in scrollable container with hint text

3. Run tests, verify all pass

4. Commit with message: "feat: add renderTrackInputsForRelease helper method"

---

## Task 2: Add CSS for inline track inputs

**Files:**
- Modify: `styles/main.css` (append at end)

**Steps:**

1. Add CSS for:
   - `.track-inputs-container` - wrapper
   - `.track-inputs-scroll` - scrollable area (max-height: 400px)
   - `.track-input-row` - grid layout (120px label, 1fr title, 1fr artist)
   - `.track-type-label` - right-aligned label
   - `.track-title-input`, `.track-artist-input` - styled inputs
   - `.track-inputs-hint` - italic hint text
   - Media query for mobile: stack inputs vertically

2. Verify styling in browser dev tools

3. Commit with message: "style: add CSS for inline track entry"

---

## Task 3: Integrate track inputs into release modal

**Files:**
- Modify: `js/views/library.js:65-80` (release modal HTML)
- Create: `tests/integration/release-with-tracks.integration.test.html`

**Steps:**

1. Create integration test checking track inputs appear in modal

2. Update release modal HTML:
   - Add `<div id="track-inputs-placeholder"></div>` after release number input

3. Find add release button handler (around line 265)
   - Load currentProgram before opening modal
   - Populate placeholder: `placeholder.innerHTML = this.renderTrackInputsForRelease(this.currentProgram)`

4. Run test, verify pass

5. Commit with message: "feat: integrate track inputs into release modal"

---

## Task 4: Update handleAddRelease to save inline tracks

**Files:**
- Modify: `js/views/library.js:491-531`

**Steps:**

1. Add integration test:
   - Fill release number and 2 out of 3 tracks
   - Call handleAddRelease()
   - Verify 1 release + 2 tracks created
   - Verify track data correct

2. Update handleAddRelease():
   - After creating release, get releaseId
   - Loop: `for (const trackType of this.currentProgram.trackTypes)`
   - Get inputs: `getElementById('track-title-' + trackType)`
   - If songTitle filled: validate then create Track
   - If validation fails: delete release and return
   - Continue with modal close and render

3. Run test, verify pass

4. Commit with message: "feat: save inline tracks when creating release"

---

## Task 5: Update edit release to pre-fill existing tracks

**Files:**
- Modify: `js/views/library.js:810-844` (handleEditRelease)

**Steps:**

1. Add integration test:
   - Create release with 1 track
   - Call handleEditRelease()
   - Verify track inputs pre-filled

2. Update handleEditRelease():
   - Load program: `this.currentProgram = await db.programs.get(release.programId)`
   - Load tracks: `const tracks = await db.tracks.where('releaseId').equals(releaseId).toArray()`
   - Populate placeholder with existing tracks:
     `placeholder.innerHTML = this.renderTrackInputsForRelease(this.currentProgram, tracks)`

3. Run test, verify pass

4. Commit with message: "feat: pre-fill existing tracks when editing release"

---

## Task 6: Update handleUpdateRelease to save new inline tracks

**Files:**
- Modify: `js/views/library.js` (handleUpdateRelease method)

**Steps:**

1. Add integration test:
   - Edit release, add 1 new track inline
   - Save
   - Verify new track created, existing track unchanged

2. Find/update handleUpdateRelease():
   - After updating release number
   - Loop through track types like in handleAddRelease
   - Check if track exists: `await db.tracks.where({releaseId, trackType}).first()`
   - If no existing track AND songTitle filled: create new track
   - Skip if track already exists (edit via separate flow)

3. Run test, verify pass

4. Commit with message: "feat: allow adding new tracks when editing release"

---

## Task 7: Add E2E tests

**Files:**
- Create: `tests/e2e/release-with-tracks.e2e.test.html`
- Modify: `tests/run-all-tests.html`

**Steps:**

1. Create E2E test file with scenarios:
   - Create program → release with 3 tracks → verify all display
   - Edit release → add 2 more tracks → verify 5 total
   - Create release with 0 tracks → add via "+ Add Track" later
   - Test with 1 vs 15 track types (scrolling)

2. Add to run-all-tests.html in E2E section

3. Run all tests, verify pass

4. Commit with message: "test: add E2E tests for inline track entry"

---

## Task 8: Add security tests

**Files:**
- Modify: `tests/unit/release-with-tracks.unit.test.html`

**Steps:**

1. Add XSS prevention tests:
   - Track type with `<script>` tag
   - Song title with HTML
   - Artist with event handlers

2. Verify all use `textContent` or `escapeHtml()`

3. Run tests, verify pass

4. Commit with message: "test: add XSS prevention tests for inline tracks"

---

## Task 9: Update documentation

**Files:**
- Modify: `CLAUDE.md`

**Steps:**

1. Update "Key Implementation Details" section:
   - Add note about inline track entry in release modal
   - Document that tracks are optional when creating release

2. Commit with message: "docs: document inline track entry feature"

---

## Success Criteria

- All unit tests pass (8+)
- All integration tests pass (5+)
- All E2E tests pass (4+)
- No XSS vulnerabilities
- Users can create release with 10 tracks in 1 modal
- Existing "+ Add Track" button still works
- Edit flow preserves existing tracks
