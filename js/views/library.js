// ABOUTME: Library view for managing programs, releases, and tracks
// ABOUTME: Provides UI for adding and organizing Les Mills data

import { db } from '../db.js';
import { Program } from '../models/Program.js';
import { Release } from '../models/Release.js';

export class LibraryView {
    constructor(container) {
        this.container = container;
        this.eventListeners = [];
        this.isLoading = false;
        this.expandedPrograms = new Set();
        this.currentProgramId = null;
    }

    async render() {
        this.cleanup();

        try {
            const programs = await db.programs.toArray();
            const programItems = await Promise.all(programs.map(p => this.renderProgramItem(p)));

            this.container.innerHTML = `
                <div class="library-view">
                    <div class="library-header">
                        <h1>Library</h1>
                        <button class="btn-primary" id="add-program-btn">+ Add Program</button>
                    </div>

                    <div class="programs-list">
                        ${programs.length === 0
                            ? '<p class="empty-state">No programs yet. Add your first program to get started.</p>'
                            : programItems.join('')
                        }
                    </div>

                    <div id="program-form-modal" class="modal hidden" role="dialog" aria-labelledby="program-modal-title" aria-modal="true">
                        <div class="modal-content">
                            <h2 id="program-modal-title">Add Program</h2>
                            <form id="program-form">
                                <div class="form-group">
                                    <label for="program-name">Program Name</label>
                                    <input type="text" id="program-name" required maxlength="100">
                                    <span class="error-message" id="program-name-error"></span>
                                </div>
                                <div class="form-group">
                                    <label for="track-types">Track Types (one per line)</label>
                                    <textarea id="track-types" rows="10" required></textarea>
                                </div>
                                <div class="form-actions">
                                    <button type="button" class="btn-secondary" id="cancel-program-btn">Cancel</button>
                                    <button type="submit" class="btn-primary" id="save-program-btn">Save</button>
                                </div>
                            </form>
                        </div>
                    </div>

                    <div id="release-form-modal" class="modal hidden" role="dialog" aria-labelledby="release-modal-title" aria-modal="true">
                        <div class="modal-content">
                            <h2 id="release-modal-title">Add Release</h2>
                            <form id="release-form">
                                <div class="form-group">
                                    <label for="release-number">Release Number</label>
                                    <input type="number" id="release-number" required min="1" step="1">
                                    <span class="error-message" id="release-number-error"></span>
                                </div>
                                <div class="form-actions">
                                    <button type="button" class="btn-secondary" id="cancel-release-btn">Cancel</button>
                                    <button type="submit" class="btn-primary" id="save-release-btn">Save</button>
                                </div>
                            </form>
                        </div>
                    </div>

                    <div id="loading-indicator" class="loading-indicator hidden">
                        <div class="spinner"></div>
                        <p>Saving...</p>
                    </div>

                    <div id="error-message" class="error-banner hidden"></div>
                </div>
            `;

            this.attachEventListeners();
        } catch (error) {
            this.showError('Failed to load programs. Please refresh the page.');
            console.error('Error rendering library view:', error);
        }
    }

    async renderProgramItem(program) {
        const escapedName = this.escapeHtml(program.name);
        const releases = await db.releases.where('programId').equals(program.id).toArray();
        const isExpanded = this.expandedPrograms.has(program.id);
        const expandIcon = isExpanded ? '▼' : '▶';

        // Sort releases in descending order by release number
        releases.sort((a, b) => b.releaseNumber - a.releaseNumber);

        return `
            <div class="program-item" data-id="${program.id}">
                <div class="program-header">
                    <button class="expand-program" data-id="${program.id}" aria-expanded="${isExpanded}" aria-label="Expand ${escapedName}">
                        <span class="expand-icon">${expandIcon}</span>
                    </button>
                    <div class="program-info">
                        <h3>${escapedName}</h3>
                        <p class="track-types-count">${program.trackTypes.length} track types • ${releases.length} ${releases.length === 1 ? 'release' : 'releases'}</p>
                    </div>
                </div>
                <div class="releases-list ${isExpanded ? '' : 'hidden'}">
                    <div class="releases-header">
                        <h4>Releases</h4>
                        <button class="btn-primary add-release-btn" data-program-id="${program.id}">+ Add Release</button>
                    </div>
                    ${releases.length === 0
                        ? '<p class="empty-state">No releases yet. Add your first release to get started.</p>'
                        : releases.map(r => this.renderReleaseItem(r)).join('')
                    }
                </div>
            </div>
        `;
    }

    renderReleaseItem(release) {
        const escapedNumber = this.escapeHtml(String(release.releaseNumber));
        return `
            <div class="release-item" data-release-id="${release.id}">
                <div class="release-info">
                    <span class="release-number">Release ${escapedNumber}</span>
                </div>
            </div>
        `;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    attachEventListeners() {
        // Program modal handlers
        const addProgramBtn = document.getElementById('add-program-btn');
        const cancelProgramBtn = document.getElementById('cancel-program-btn');
        const programForm = document.getElementById('program-form');
        const programModal = document.getElementById('program-form-modal');

        const openProgramModalHandler = () => {
            programModal.classList.remove('hidden');
            const programNameInput = document.getElementById('program-name');
            if (programNameInput) {
                programNameInput.focus();
            }
        };

        const closeProgramModalHandler = () => {
            programModal.classList.add('hidden');
            programForm.reset();
            this.clearError();
        };

        const submitProgramHandler = async (e) => {
            e.preventDefault();
            await this.handleAddProgram();
        };

        this.addEventListener(addProgramBtn, 'click', openProgramModalHandler);
        this.addEventListener(cancelProgramBtn, 'click', closeProgramModalHandler);
        this.addEventListener(programForm, 'submit', submitProgramHandler);

        // Release modal handlers
        const cancelReleaseBtn = document.getElementById('cancel-release-btn');
        const releaseForm = document.getElementById('release-form');
        const releaseModal = document.getElementById('release-form-modal');

        const closeReleaseModalHandler = () => {
            releaseModal.classList.add('hidden');
            releaseForm.reset();
            this.clearError();
        };

        const submitReleaseHandler = async (e) => {
            e.preventDefault();
            await this.handleAddRelease();
        };

        this.addEventListener(cancelReleaseBtn, 'click', closeReleaseModalHandler);
        this.addEventListener(releaseForm, 'submit', submitReleaseHandler);

        // Expand/collapse program handlers
        const expandButtons = document.querySelectorAll('.expand-program');
        expandButtons.forEach(btn => {
            const expandHandler = async (e) => {
                e.preventDefault();
                const programId = parseInt(btn.dataset.id);

                if (this.expandedPrograms.has(programId)) {
                    this.expandedPrograms.delete(programId);
                } else {
                    this.expandedPrograms.add(programId);
                }

                await this.render();
            };

            this.addEventListener(btn, 'click', expandHandler);
        });

        // Add release button handlers
        const addReleaseButtons = document.querySelectorAll('.add-release-btn');
        addReleaseButtons.forEach(btn => {
            const addReleaseHandler = () => {
                this.currentProgramId = parseInt(btn.dataset.programId);
                releaseModal.classList.remove('hidden');
                const releaseNumberInput = document.getElementById('release-number');
                if (releaseNumberInput) {
                    releaseNumberInput.focus();
                }
            };

            this.addEventListener(btn, 'click', addReleaseHandler);
        });

        // Keyboard navigation
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                if (!programModal.classList.contains('hidden')) {
                    closeProgramModalHandler();
                }
                if (!releaseModal.classList.contains('hidden')) {
                    closeReleaseModalHandler();
                }
            }
        };

        this.addEventListener(document, 'keydown', handleKeyDown);
    }

    addEventListener(element, event, handler) {
        element.addEventListener(event, handler);
        this.eventListeners.push({ element, event, handler });
    }

    cleanup() {
        this.eventListeners.forEach(({ element, event, handler }) => {
            element.removeEventListener(event, handler);
        });
        this.eventListeners = [];
    }

    destroy() {
        this.cleanup();
    }

    async handleAddProgram() {
        const nameInput = document.getElementById('program-name');
        const trackTypesInput = document.getElementById('track-types');
        const modal = document.getElementById('program-form-modal');
        const form = document.getElementById('program-form');

        const name = nameInput.value.trim();
        const trackTypesText = trackTypesInput.value;
        const trackTypes = trackTypesText.split('\n').map(t => t.trim()).filter(t => t);

        if (!this.validateProgramName(name)) {
            return;
        }

        try {
            this.showLoading(true);

            const existingProgram = await db.programs.where('name').equals(name).first();
            if (existingProgram) {
                this.showValidationError('program-name-error', 'A program with this name already exists.');
                this.showLoading(false);
                return;
            }

            await db.programs.add(new Program(name, trackTypes));

            modal.classList.add('hidden');
            form.reset();
            this.clearError();

            await this.render();
        } catch (error) {
            this.showError('Failed to add program. Please try again.');
            console.error('Error adding program:', error);
        } finally {
            this.showLoading(false);
        }
    }

    async handleAddRelease() {
        const releaseNumberInput = document.getElementById('release-number');
        const modal = document.getElementById('release-form-modal');
        const form = document.getElementById('release-form');

        const releaseNumberStr = releaseNumberInput.value.trim();

        if (!this.validateReleaseNumber(releaseNumberStr)) {
            return;
        }

        const releaseNumber = parseInt(releaseNumberStr);

        try {
            this.showLoading(true);

            const existingRelease = await db.releases
                .where('[programId+releaseNumber]')
                .equals([this.currentProgramId, releaseNumber])
                .first();

            if (existingRelease) {
                this.showValidationError('release-number-error', 'A release with this number already exists for this program.');
                this.showLoading(false);
                return;
            }

            await db.releases.add(new Release(this.currentProgramId, releaseNumber));

            modal.classList.add('hidden');
            form.reset();
            this.clearError();

            await this.render();
        } catch (error) {
            this.showError('Failed to add release. Please try again.');
            console.error('Error adding release:', error);
        } finally {
            this.showLoading(false);
        }
    }

    validateProgramName(name) {
        const errorElement = document.getElementById('program-name-error');

        if (!name) {
            this.showValidationError('program-name-error', 'Program name is required.');
            return false;
        }

        if (name.length > 100) {
            this.showValidationError('program-name-error', 'Program name must be 100 characters or less.');
            return false;
        }

        this.clearValidationError('program-name-error');
        return true;
    }

    validateReleaseNumber(releaseNumber) {
        if (!releaseNumber) {
            this.showValidationError('release-number-error', 'Release number is required.');
            return false;
        }

        if (releaseNumber.includes('.')) {
            this.showValidationError('release-number-error', 'Release number must be a positive integer.');
            return false;
        }

        const num = parseInt(releaseNumber);
        if (isNaN(num) || num <= 0 || !Number.isInteger(num)) {
            this.showValidationError('release-number-error', 'Release number must be a positive integer.');
            return false;
        }

        this.clearValidationError('release-number-error');
        return true;
    }

    showValidationError(elementId, message) {
        const errorElement = document.getElementById(elementId);
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
        }
    }

    clearValidationError(elementId) {
        const errorElement = document.getElementById(elementId);
        if (errorElement) {
            errorElement.textContent = '';
            errorElement.style.display = 'none';
        }
    }

    showLoading(show) {
        this.isLoading = show;
        const loadingIndicator = document.getElementById('loading-indicator');
        const saveProgramBtn = document.getElementById('save-program-btn');
        const saveReleaseBtn = document.getElementById('save-release-btn');

        if (loadingIndicator) {
            if (show) {
                loadingIndicator.classList.remove('hidden');
            } else {
                loadingIndicator.classList.add('hidden');
            }
        }

        if (saveProgramBtn) {
            saveProgramBtn.disabled = show;
        }

        if (saveReleaseBtn) {
            saveReleaseBtn.disabled = show;
        }
    }

    showError(message) {
        const errorBanner = document.getElementById('error-message');
        if (errorBanner) {
            errorBanner.textContent = message;
            errorBanner.classList.remove('hidden');
            setTimeout(() => {
                errorBanner.classList.add('hidden');
            }, 5000);
        }
    }

    clearError() {
        this.clearValidationError('program-name-error');
        this.clearValidationError('release-number-error');
        const errorBanner = document.getElementById('error-message');
        if (errorBanner) {
            errorBanner.classList.add('hidden');
        }
    }
}
