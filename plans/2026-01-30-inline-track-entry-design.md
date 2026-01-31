# Inline Track Entry for New Releases - Design Document

**Date:** 2026-01-30
**Status:** Approved

## Overview

Modify the "Add Release" workflow to allow users to enter all track information (song titles and artists) directly in the release creation modal, eliminating the need to open and close the track modal repeatedly.

## Problem Statement

Currently, when creating a new release with 10+ tracks, users must:
1. Click "+ Add Release"
2. Enter release number and save
3. Click "+ Add Track"
4. Fill track type, song title, artist
5. Save
6. Repeat steps 3-5 for each remaining track (9+ more times)

This results in 20+ modal open/close cycles for a single release, creating a tedious user experience.

## Solution

Expand the release modal to include inline inputs for all track types, allowing users to fill in song information for multiple tracks in one form submission.

---

## UI Design

### Modal Structure

The release form modal will have three sections:

**Header section:**
- Title: "Add Release" or "Edit Release"
- Release number input field (required, existing validation)

**Track entry section:**
- Scrollable list of all track types from the program
- Each track type row displays:
  - Track type label on the left (e.g., "Warmup:", "Squats:")
  - Song title input (text, maxlength 200, optional)
  - Artist input (text, maxlength 200, optional)
- Track types appear in program-defined order
- List scrolls independently if many track types exist (10+ is common)

**Footer section:**
- Cancel button (closes modal, discards all changes)
- Save button (creates/updates release and saves filled tracks)

### Layout

Track type rows use a compact horizontal layout:
```
Warmup:     [Song Title.......] [Artist.......]
Squats:     [Song Title.......] [Artist.......]
Chest:      [Song Title.......] [Artist.......]
```

This keeps the form scannable while maintaining separate fields for song title and artist.

---

## Behavior

### Adding a New Release

**Initial state:**
- Release number input is empty and focused
- All track type rows are visible with empty inputs
- Save button is enabled (allows saving release with zero tracks)

**User workflow:**
1. Enter release number
2. Tab through track type rows, filling song titles (and optionally artists)
3. Leave unwanted track types blank
4. Click Save

**Save behavior:**
1. Validate release number (existing validation: required, positive integer, unique within program)
2. Validate any filled song title/artist fields (max 200 characters each)
3. Create release record in database
4. For each track type row where song title is not empty:
   - Create Track record with releaseId, trackType, songTitle, artist
   - Skip rows with empty song title
5. Close modal and refresh view

### Editing an Existing Release

**Initial state:**
- Release number input is pre-filled with current value
- Track type rows are populated with existing track data (if tracks exist)
- Empty rows remain for track types without tracks
- Save button is enabled

**User workflow:**
1. Modify release number if needed
2. Edit existing track information or add new tracks
3. Click Save

**Save behavior:**
- Same as add workflow, but updates existing release
- New track records created for newly-filled track types
- Existing tracks remain unchanged (edit via existing edit buttons)

### Validation

**Release number:**
- Required
- Positive integer
- Unique within program
- Error message appears below input field

**Song title/Artist (for each track type):**
- Not required (rows can be left empty)
- If song title is filled: max 200 characters
- If artist is filled: max 200 characters
- Validation errors appear below the specific input field

### Accessibility

- Modal maintains existing accessibility features:
  - `role="dialog"` and `aria-modal="true"`
  - ESC key closes modal
  - Focus management (trap focus in modal, restore on close)
- After release number is entered, focus moves to first track type's song title input
- Tab order flows naturally through inputs

---

## Implementation

### Code Changes (library.js)

**1. Update release form modal HTML** (lines 65-80):
- Keep release number input section
- Add scrollable container for track type rows
- Generate track rows dynamically based on `this.currentProgram.trackTypes`
- Each row: `<label>` + song title `<input>` + artist `<input>`
- Add CSS classes for grid layout styling

**2. Create helper method `renderTrackInputsForRelease(program)`:**
- Generates HTML for scrollable track type input list
- Returns markup for all track type rows with empty inputs
- Called when opening add release modal
- For edit mode, accepts optional `existingTracks` parameter to pre-fill values

**3. Modify `handleAddRelease()` method** (lines 491-531):
```javascript
async handleAddRelease() {
    // 1. Validate release number (existing logic)
    // 2. Create release record
    const releaseId = await db.releases.add(new Release(...));

    // 3. Loop through track type inputs
    for (const trackType of this.currentProgram.trackTypes) {
        const songTitle = document.getElementById(`track-title-${trackType}`).value.trim();
        const artist = document.getElementById(`track-artist-${trackType}`).value.trim();

        // 4. If song title filled, create track
        if (songTitle) {
            if (!this.validateTrack(trackType, songTitle, artist)) {
                // Validation failed, abort save
                return;
            }
            await db.tracks.add(new Track(releaseId, trackType, songTitle, artist));
        }
    }

    // 5. Close modal and refresh
}
```

**4. Update `handleEditRelease()` method** (lines 810-844):
- Load existing release and tracks
- Pre-populate track inputs where tracks exist
- Reuse same modal structure
- Update handler to save new tracks while preserving existing ones

**5. Event listeners:**
- Existing form submit handler works as-is
- Optional: Add blur/change validation for track inputs

### CSS Changes (main.css)

Add styles for:
- Scrollable track input container (max-height with overflow-y)
- Track type row grid layout (label, input, input)
- Responsive behavior for smaller screens (stack inputs if needed)

---

## Testing Strategy

### Unit Tests
**New file:** `tests/unit/release-with-tracks.unit.test.html`

- Test `renderTrackInputsForRelease()` generates correct HTML for various track type counts
- Test validation of partial track data (title filled, artist empty)
- Test save logic with 0 tracks, some tracks, all tracks filled
- Test edit mode pre-population

### Integration Tests
**New file:** `tests/integration/release-with-tracks.integration.test.html`

- Test opening add release modal populates correct track types from program
- Test saving release with mixed filled/empty tracks creates correct database records
- Test editing release preserves existing tracks and allows adding new ones
- Test validation error display for various invalid inputs
- Test modal keyboard navigation (Tab, ESC)

### E2E Tests
**New file:** `tests/e2e/release-with-tracks.e2e.test.html`

- Complete workflow: create program → create release with some tracks → verify tracks display
- Edit release workflow: add more tracks to existing release via modal
- Mixed workflow: create release with some tracks inline, add remaining via "+ Add Track" button
- Test with program containing 1 track type vs 20+ track types (scrolling)

### Security Tests
- Test XSS prevention: enter HTML/script tags in song title/artist fields
- Verify all user input uses `textContent` not `innerHTML`
- Test special characters (quotes, angle brackets) are properly escaped

---

## Edge Cases

**Handled:**
- Programs with 1 vs 20+ track types (scrollable container handles both)
- Very long song titles/artists (browser handles truncation in inputs, display uses existing track item rendering)
- Special characters in inputs (escaped via `textContent` in existing code)
- Partial validation failures (song title valid but artist too long) - show error, don't lose data
- Editing release with all tracks already filled - inputs pre-populated, can modify

**Future enhancements (not in scope):**
- Confirm dialog when clicking Cancel with unsaved changes
- Auto-save draft as user types
- Bulk import from CSV/clipboard

---

## Backward Compatibility

**No breaking changes:**
- Database schema unchanged
- Existing "+ Add Track" button remains functional
- Users can still add/edit tracks one at a time if preferred
- All existing tests continue to pass

**Migration:**
- No data migration needed
- Feature works immediately for new and existing programs/releases

---

## Success Criteria

1. Users can create a release with 10 tracks using 1 modal instead of 11
2. All validation rules enforced (release number, song title/artist lengths)
3. Users can leave track types empty and add them later
4. Accessibility requirements met (keyboard navigation, screen reader support)
5. All three test types pass (unit, integration, E2E)
6. No XSS vulnerabilities introduced
7. Existing workflows (add track button, edit track) remain functional
