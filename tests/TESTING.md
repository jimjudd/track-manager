# Testing Guide

This document describes the test suite for the Les Mills Track Manager application.

## Test Structure

Tests are organized into three categories:

### Unit Tests (`tests/unit/`)
- Test individual components in isolation
- Files:
  - `library.unit.test.html` - Core LibraryView functionality
  - `library-security.test.html` - Security and accessibility features
  - `models.test.html` - Data model tests

### Integration Tests (`tests/integration/`)
- Test interactions between components
- Files:
  - `library.integration.test.html` - Full LibraryView workflows
  - `database.test.html` - Database operations

### End-to-End Tests (`tests/e2e/`)
- Test complete user workflows
- Files:
  - `library.e2e.test.html` - Complete library management flows
  - `workflow.test.html` - Cross-feature workflows

## Running Tests

All tests are HTML files that can be opened directly in a browser. They use Dexie.js for database operations and run in the browser's IndexedDB.

### Run All Tests
```bash
# Unit tests
open tests/unit/library.unit.test.html
open tests/unit/library-security.test.html

# Integration tests
open tests/integration/library.integration.test.html

# E2E tests
open tests/e2e/library.e2e.test.html
```

## Security Tests

The `library-security.test.html` file includes tests for:

### XSS Protection
- HTML tag escaping in program names
- Event handler escaping
- Special character handling

### Input Validation
- Duplicate program name detection
- Program name length limits (max 100 characters)
- Required field validation

### Accessibility
- ARIA attributes on modal dialogs
- Keyboard navigation (ESC to close modal)
- Focus management

### Memory Leak Prevention
- Event listener cleanup on re-render
- destroy() method functionality

### Error Handling
- Database error recovery
- User feedback on errors
- Loading states during operations

## Test Coverage

All features should have:
1. Unit tests for individual methods
2. Integration tests for user interactions
3. E2E tests for complete workflows
4. Security tests for validation and XSS prevention

## Adding New Tests

When adding new features:

1. Add unit tests for new methods
2. Add integration tests for user interactions
3. Update E2E tests for complete workflows
4. Add security tests if handling user input

## Test Results

All tests should pass with 0 failures. If any test fails:

1. Check the browser console for detailed error messages
2. Verify the database is properly cleared between tests
3. Ensure all dependencies are loaded
4. Check for timing issues (increase delays if needed)
