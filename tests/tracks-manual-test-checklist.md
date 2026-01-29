# Tracks Management - Manual Test Checklist

## Test Environment
- Browser: _______________
- Date: _______________
- Tester: _______________

## Prerequisites
1. [ ] Local server running (python -m http.server 8000)
2. [ ] Application accessible at http://localhost:8000
3. [ ] Browser console open for error checking
4. [ ] At least one program with releases already created

---

## Test 1: Add Track Button Visibility
**Steps:**
1. Navigate to Library tab
2. Expand an existing program
3. Verify releases are displayed

**Expected Results:**
- [ ] Each release shows an "+ Add Track" button
- [ ] Button is positioned to the right of the release number
- [ ] Button is clearly visible and styled appropriately

---

## Test 2: Track Modal Opens
**Steps:**
1. Click "+ Add Track" button on a release

**Expected Results:**
- [ ] Track modal opens immediately
- [ ] Modal contains three fields: Track Type (dropdown), Song Title, Artist
- [ ] Track Type dropdown is populated with program's track types
- [ ] Song Title field is focused automatically
- [ ] Modal has Cancel and Save buttons

---

## Test 3: Add Valid Track
**Steps:**
1. Open track modal
2. Select "Warmup" from Track Type dropdown
3. Enter "Eye of the Tiger" in Song Title
4. Enter "Survivor" in Artist
5. Click Save

**Expected Results:**
- [ ] Modal closes
- [ ] Track appears under the release
- [ ] Track displays: track type badge, song title, and artist
- [ ] Track type badge shows "Warmup" in red
- [ ] No error messages displayed

---

## Test 4: Track Type Dropdown Population
**Steps:**
1. Create or use a program with specific track types (e.g., BodyPump with 10 track types)
2. Add a release to this program
3. Click "+ Add Track" on the release

**Expected Results:**
- [ ] Track Type dropdown contains all track types from the program
- [ ] Track types appear in the same order as defined in the program
- [ ] No duplicate track types
- [ ] All track types are selectable

---

## Test 5: Validation - Required Fields
**Steps:**
1. Open track modal
2. Leave Song Title empty
3. Click Save

**Expected Results:**
- [ ] Error message appears under Song Title field
- [ ] Error says "Song title is required"
- [ ] Modal remains open
- [ ] Track is NOT added to database

**Steps:**
4. Enter a song title
5. Click Save

**Expected Results:**
- [ ] Track is added successfully
- [ ] Modal closes

---

## Test 6: Validation - Max Length
**Steps:**
1. Open track modal
2. Enter 201 characters in Song Title field
3. Click Save

**Expected Results:**
- [ ] Error message appears: "Song title must be 200 characters or less"
- [ ] Track is NOT saved
- [ ] Modal remains open

---

## Test 7: Optional Artist Field
**Steps:**
1. Open track modal
2. Select a track type
3. Enter a song title
4. Leave Artist field empty
5. Click Save

**Expected Results:**
- [ ] Track is saved successfully
- [ ] Track displays with track type and song title only
- [ ] No artist line is shown (since it's optional)
- [ ] No error messages

---

## Test 8: Multiple Tracks Under One Release
**Steps:**
1. Add first track: Warmup - "Song 1" - "Artist 1"
2. Add second track: Squats - "Song 2" - "Artist 2"
3. Add third track: Chest - "Song 3" - "Artist 3"

**Expected Results:**
- [ ] All three tracks display under the release
- [ ] Tracks are sorted by track type order (as defined in program)
- [ ] Each track has clear visual separation
- [ ] All track information is readable

---

## Test 9: Track Sorting by Program Order
**Steps:**
1. Use a BodyPump program (Warmup, Squats, Chest, Back, etc.)
2. Add tracks in random order: Chest, Warmup, Back, Squats
3. View the release

**Expected Results:**
- [ ] Tracks display in program order: Warmup, Squats, Chest, Back
- [ ] NOT in the order they were added
- [ ] Order matches the program's trackTypes array

---

## Test 10: Tracks Under Multiple Releases
**Steps:**
1. Create Release 123 and add 2 tracks
2. Create Release 124 and add 2 tracks
3. Expand program to view both releases

**Expected Results:**
- [ ] Release 123 shows only its 2 tracks
- [ ] Release 124 shows only its 2 tracks
- [ ] Tracks are not mixed between releases
- [ ] Each release maintains independent track lists

---

## Test 11: Modal Cancel Button
**Steps:**
1. Open track modal
2. Enter data in all fields
3. Click Cancel

**Expected Results:**
- [ ] Modal closes
- [ ] No track is added
- [ ] Form data is cleared

**Steps:**
4. Re-open modal

**Expected Results:**
- [ ] Form is empty/reset
- [ ] No previous data remains

---

## Test 12: Keyboard Navigation - ESC Key
**Steps:**
1. Open track modal
2. Press ESC key

**Expected Results:**
- [ ] Modal closes immediately
- [ ] No track is saved
- [ ] Form resets

---

## Test 13: XSS Protection in Track Data
**Steps:**
1. Open track modal
2. Enter `<script>alert('XSS')</script>` in Song Title
3. Enter `<img src=x onerror=alert(1)>` in Artist
4. Save track

**Expected Results:**
- [ ] Track is saved
- [ ] HTML tags are displayed as text (escaped)
- [ ] No JavaScript executes
- [ ] Track displays: `&lt;script&gt;alert('XSS')&lt;/script&gt;`
- [ ] No XSS vulnerability

---

## Test 14: Empty State - No Tracks
**Steps:**
1. View a release with no tracks

**Expected Results:**
- [ ] Empty state message displays: "No tracks yet. Add your first track to get started."
- [ ] Message is centered and styled appropriately
- [ ] "+ Add Track" button is still visible

---

## Test 15: Track Display Styling
**Steps:**
1. Add a track with all fields filled
2. Observe the track item

**Expected Results:**
- [ ] Track type badge is red with white background
- [ ] Track type is centered in badge
- [ ] Song title is bold/prominent
- [ ] Artist is smaller/lighter text below title
- [ ] Track has hover effect
- [ ] Layout is clean and readable

---

## Test 16: Persistence - Page Refresh
**Steps:**
1. Add 3 tracks to a release
2. Refresh the browser page
3. Navigate back to Library tab
4. Expand the program

**Expected Results:**
- [ ] All 3 tracks are still there
- [ ] Track data is correct (type, title, artist)
- [ ] Track order is maintained
- [ ] No data loss

---

## Test 17: Long Track Names
**Steps:**
1. Add track with very long title (close to 200 chars)
2. Add track with very long artist name

**Expected Results:**
- [ ] Long titles are truncated with ellipsis (...)
- [ ] Text doesn't break layout
- [ ] Track item maintains fixed height
- [ ] Overflow is handled gracefully

---

## Test 18: Complete BodyPump Release
**Steps:**
1. Create a BodyPump program with all 10 track types
2. Add Release 130
3. Add all 10 tracks (one for each track type)

**Expected Results:**
- [ ] All 10 tracks display correctly
- [ ] Tracks are in proper order (Warmup → Cooldown)
- [ ] UI remains responsive
- [ ] No performance issues
- [ ] All tracks are readable

---

## Test 19: Form Validation Reset
**Steps:**
1. Open track modal
2. Trigger validation error (empty song title)
3. Close modal (Cancel or ESC)
4. Re-open modal

**Expected Results:**
- [ ] No error messages are visible
- [ ] Form is clean/reset
- [ ] Previous validation state is cleared

---

## Test 20: Loading State
**Steps:**
1. Open browser DevTools Network tab
2. Throttle network to "Slow 3G"
3. Add a track

**Expected Results:**
- [ ] Loading indicator appears
- [ ] Save button is disabled during save
- [ ] Modal stays open until save completes
- [ ] Track appears after loading completes
- [ ] No double-submission possible

---

## Browser Compatibility Testing

### Chrome
- [ ] All tests pass
- [ ] No console errors
- [ ] Styling correct

### Safari
- [ ] All tests pass
- [ ] No console errors
- [ ] Styling correct

### Firefox
- [ ] All tests pass
- [ ] No console errors
- [ ] Styling correct

---

## Notes & Issues Found
_Use this section to document any bugs, unexpected behavior, or improvements:_

---

## Sign-Off
- [ ] All critical tests passed
- [ ] No blocking issues found
- [ ] Ready for production

**Tester Signature:** _______________
**Date:** _______________
