// ABOUTME: Library view for managing programs, releases, and tracks
// ABOUTME: Provides UI for adding and organizing Les Mills data

import { db } from '../db.js';
import { Program } from '../models/Program.js';

export class LibraryView {
    constructor(container) {
        this.container = container;
        this.eventListeners = [];
        this.isLoading = false;
    }

    async render() {
        this.cleanup();

        try {
            const programs = await db.programs.toArray();

            this.container.innerHTML = `
                <div class="library-view">
                    <div class="library-header">
                        <h1>Library</h1>
                        <button class="btn-primary" id="add-program-btn">+ Add Program</button>
                    </div>

                    <div class="programs-list">
                        ${programs.length === 0
                            ? '<p class="empty-state">No programs yet. Add your first program to get started.</p>'
                            : programs.map(p => this.renderProgramItem(p)).join('')
                        }
                    </div>

                    <div id="program-form-modal" class="modal hidden" role="dialog" aria-labelledby="modal-title" aria-modal="true">
                        <div class="modal-content">
                            <h2 id="modal-title">Add Program</h2>
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

    renderProgramItem(program) {
        const escapedName = this.escapeHtml(program.name);
        return `
            <div class="program-item" data-id="${program.id}">
                <h3>${escapedName}</h3>
                <p class="track-types-count">${program.trackTypes.length} track types</p>
            </div>
        `;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    attachEventListeners() {
        const addBtn = document.getElementById('add-program-btn');
        const cancelBtn = document.getElementById('cancel-program-btn');
        const form = document.getElementById('program-form');
        const modal = document.getElementById('program-form-modal');

        const openModalHandler = () => {
            modal.classList.remove('hidden');
            const programNameInput = document.getElementById('program-name');
            if (programNameInput) {
                programNameInput.focus();
            }
        };

        const closeModalHandler = () => {
            modal.classList.add('hidden');
            form.reset();
            this.clearError();
        };

        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
                closeModalHandler();
            }
        };

        const submitHandler = async (e) => {
            e.preventDefault();
            await this.handleAddProgram();
        };

        this.addEventListener(addBtn, 'click', openModalHandler);
        this.addEventListener(cancelBtn, 'click', closeModalHandler);
        this.addEventListener(form, 'submit', submitHandler);
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
        const saveBtn = document.getElementById('save-program-btn');

        if (loadingIndicator) {
            if (show) {
                loadingIndicator.classList.remove('hidden');
            } else {
                loadingIndicator.classList.add('hidden');
            }
        }

        if (saveBtn) {
            saveBtn.disabled = show;
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
        const errorBanner = document.getElementById('error-message');
        if (errorBanner) {
            errorBanner.classList.add('hidden');
        }
    }
}
