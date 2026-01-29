# Releases Management - Manual Test Checklist

## Setup
1. Open http://localhost:8000 in browser
2. Navigate to Library tab
3. Clear any existing data in browser DevTools > Application > IndexedDB

## Test Cases

### Test 1: Add Program and Expand
- [ ] Click "+ Add Program" button
- [ ] Enter program name: "BodyPump"
- [ ] Enter track types (one per line):
  ```
  Warmup
  Squats
  Chest
  ```
- [ ] Click "Save"
- [ ] Verify program appears in list
- [ ] Verify "3 track types • 0 releases" is displayed
- [ ] Click expand button (▶)
- [ ] Verify button changes to (▼)
- [ ] Verify "Releases" section appears
- [ ] Verify "No releases yet" message is shown

### Test 2: Add First Release
- [ ] Click "+ Add Release" button
- [ ] Verify modal opens with "Add Release" title
- [ ] Enter release number: 123
- [ ] Click "Save"
- [ ] Verify modal closes
- [ ] Verify "Release 123" appears in releases list
- [ ] Verify release count updates to "3 track types • 1 releases"

### Test 3: Add Multiple Releases
- [ ] Click "+ Add Release" button
- [ ] Enter release number: 125
- [ ] Click "Save"
- [ ] Click "+ Add Release" button again
- [ ] Enter release number: 124
- [ ] Click "Save"
- [ ] Verify releases are displayed in descending order: 125, 124, 123
- [ ] Verify count shows "3 track types • 3 releases"

### Test 4: Duplicate Release Prevention
- [ ] Click "+ Add Release" button
- [ ] Enter release number: 123 (duplicate)
- [ ] Click "Save"
- [ ] Verify error message: "A release with this number already exists for this program."
- [ ] Verify release was NOT added
- [ ] Verify count still shows "3 releases"

### Test 5: Release Number Validation
- [ ] Click "+ Add Release" button
- [ ] Enter release number: -5
- [ ] Click "Save"
- [ ] Verify error: "Release number must be a positive integer."
- [ ] Clear field and enter: abc
- [ ] Verify error: "Release number must be a positive integer."
- [ ] Clear field and enter: 0
- [ ] Verify error: "Release number must be a positive integer."

### Test 6: Expand/Collapse Toggle
- [ ] Click expand button (▼) to collapse
- [ ] Verify releases section is hidden
- [ ] Verify button shows (▶)
- [ ] Click expand button (▶) to expand
- [ ] Verify releases section is visible
- [ ] Verify button shows (▼)

### Test 7: Modal Cancel and ESC
- [ ] Click "+ Add Release" button
- [ ] Click "Cancel"
- [ ] Verify modal closes
- [ ] Click "+ Add Release" button
- [ ] Press ESC key
- [ ] Verify modal closes

### Test 8: Multiple Programs
- [ ] Add second program: "BodyAttack"
- [ ] Add track types: "Warmup"
- [ ] Expand BodyAttack program
- [ ] Add release: 50
- [ ] Verify BodyAttack shows "1 track types • 1 releases"
- [ ] Verify BodyPump still shows "3 track types • 3 releases"
- [ ] Collapse BodyPump
- [ ] Verify BodyAttack remains expanded

### Test 9: XSS Protection
- [ ] Add program: "<script>alert('XSS')</script>"
- [ ] Verify script tags are escaped in display
- [ ] Expand program
- [ ] Add release: 1
- [ ] Verify no script execution

### Test 10: Data Persistence
- [ ] Refresh page
- [ ] Navigate to Library tab
- [ ] Verify all programs are still present
- [ ] Verify release counts are correct
- [ ] Expand programs
- [ ] Verify all releases are still present

## Expected Results
All checkboxes should be checked with no errors or unexpected behavior.

## Browser Testing
Test in:
- [ ] Chrome/Edge
- [ ] Safari
- [ ] Firefox

## Mobile Testing (if available)
- [ ] iOS Safari
- [ ] Android Chrome
