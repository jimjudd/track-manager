// ABOUTME: Library view for managing programs, releases, and tracks
// ABOUTME: Provides UI for adding and organizing Les Mills data

import { db } from '../db.js';
import { Program } from '../models/Program.js';

export class LibraryView {
    constructor(container) {
        this.container = container;
    }

    async render() {
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

                <div id="program-form-modal" class="modal hidden">
                    <div class="modal-content">
                        <h2>Add Program</h2>
                        <form id="program-form">
                            <div class="form-group">
                                <label for="program-name">Program Name</label>
                                <input type="text" id="program-name" required>
                            </div>
                            <div class="form-group">
                                <label for="track-types">Track Types (one per line)</label>
                                <textarea id="track-types" rows="10" required></textarea>
                            </div>
                            <div class="form-actions">
                                <button type="button" class="btn-secondary" id="cancel-program-btn">Cancel</button>
                                <button type="submit" class="btn-primary">Save</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;

        this.attachEventListeners();
    }

    renderProgramItem(program) {
        return `
            <div class="program-item" data-id="${program.id}">
                <h3>${program.name}</h3>
                <p class="track-types-count">${program.trackTypes.length} track types</p>
            </div>
        `;
    }

    attachEventListeners() {
        const addBtn = document.getElementById('add-program-btn');
        const cancelBtn = document.getElementById('cancel-program-btn');
        const form = document.getElementById('program-form');
        const modal = document.getElementById('program-form-modal');

        addBtn.addEventListener('click', () => {
            modal.classList.remove('hidden');
        });

        cancelBtn.addEventListener('click', () => {
            modal.classList.add('hidden');
            form.reset();
        });

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleAddProgram();
            modal.classList.add('hidden');
            form.reset();
        });
    }

    async handleAddProgram() {
        const name = document.getElementById('program-name').value;
        const trackTypesText = document.getElementById('track-types').value;
        const trackTypes = trackTypesText.split('\n').map(t => t.trim()).filter(t => t);

        await db.programs.add(new Program(name, trackTypes));
        await this.render();
    }
}
