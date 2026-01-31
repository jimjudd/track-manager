// ABOUTME: Authentication UI component for Google Sign-In
// ABOUTME: Displays sign-in/sign-out buttons and sync status

export class AuthView {
    constructor(container) {
        this.container = container;
        this.currentUser = null;
        this.onAuthStateChangedCallback = null;
        this.eventListeners = [];
    }

    addEventListener(element, event, handler) {
        element.addEventListener(event, handler);
        this.eventListeners.push({ element, event, handler });
    }

    async render() {
        // Clean up existing event listeners before re-rendering
        this.cleanup();

        if (this.currentUser) {
            this.renderSignedIn();
        } else {
            this.renderSignedOut();
        }
    }

    renderSignedOut() {
        this.container.innerHTML = `
            <div id="auth-section" class="auth-container">
                <button id="sign-in-btn" class="btn-primary">Sign in with Google</button>
                <p class="auth-message">Sign in to back up your data to the cloud</p>
            </div>
        `;

        const signInBtn = this.container.querySelector('#sign-in-btn');
        if (signInBtn) {
            this.addEventListener(signInBtn, 'click', () => this.signIn());
        }
    }

    renderSignedIn() {
        const email = this.currentUser?.email || 'Unknown';
        this.container.innerHTML = `
            <div id="auth-section" class="auth-container">
                <div class="auth-user"></div>
                <span id="sync-status" class="sync-status">✓ Synced</span>
                <button id="sign-out-btn" class="btn-secondary">Sign out</button>
            </div>
        `;

        // Use textContent for user data to prevent XSS
        const authUserEl = this.container.querySelector('.auth-user');
        if (authUserEl) {
            authUserEl.textContent = `Signed in as: ${email}`;
        }

        const signOutBtn = this.container.querySelector('#sign-out-btn');
        if (signOutBtn) {
            this.addEventListener(signOutBtn, 'click', () => this.signOut());
        }
    }

    async signIn() {
        // Get Firebase auth instance when needed
        const auth = firebase.auth();
        if (!auth) {
            this.showError('Authentication service is not available. Please try again later.');
            return;
        }

        try {
            const provider = new firebase.auth.GoogleAuthProvider();
            await auth.signInWithPopup(provider);
            // onAuthStateChanged will trigger render
        } catch (error) {
            console.error('Sign-in error:', error);
            this.showError(this.getFriendlyErrorMessage(error));
        }
    }

    async signOut() {
        // Get Firebase auth instance when needed
        const auth = firebase.auth();
        if (!auth) {
            this.showError('Authentication service is not available. Please try again later.');
            return;
        }

        try {
            await auth.signOut();
            // onAuthStateChanged will trigger render
        } catch (error) {
            console.error('Sign-out error:', error);
            this.showError(this.getFriendlyErrorMessage(error));
        }
    }

    getFriendlyErrorMessage(error) {
        // Convert Firebase error codes to user-friendly messages
        const errorCode = error.code;

        switch (errorCode) {
            case 'auth/popup-closed-by-user':
                return 'Sign-in was cancelled. Please try again.';
            case 'auth/popup-blocked':
                return 'Pop-up was blocked by your browser. Please allow pop-ups and try again.';
            case 'auth/network-request-failed':
                return 'Network error. Please check your connection and try again.';
            case 'auth/too-many-requests':
                return 'Too many sign-in attempts. Please wait a moment and try again.';
            case 'auth/user-disabled':
                return 'This account has been disabled. Please contact support.';
            default:
                return 'An error occurred during sign-in. Please try again.';
        }
    }

    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'auth-error';
        errorDiv.textContent = message;
        this.container.appendChild(errorDiv);
        setTimeout(() => errorDiv.remove(), 5000);
    }

    updateSyncStatus(status) {
        const syncStatusEl = this.container.querySelector('#sync-status');
        if (!syncStatusEl) return;

        switch (status) {
            case 'synced':
                syncStatusEl.textContent = '✓ Synced';
                syncStatusEl.className = 'sync-status synced';
                break;
            case 'syncing':
                syncStatusEl.textContent = '⟳ Syncing...';
                syncStatusEl.className = 'sync-status syncing';
                break;
            case 'offline':
                syncStatusEl.textContent = '⚠ Offline';
                syncStatusEl.className = 'sync-status offline';
                break;
            case 'error':
                syncStatusEl.textContent = '✗ Error';
                syncStatusEl.className = 'sync-status error';
                break;
        }
    }

    onAuthStateChanged(callback) {
        this.onAuthStateChangedCallback = callback;
    }

    setUser(user) {
        this.currentUser = user;
        this.render();
        if (this.onAuthStateChangedCallback) {
            this.onAuthStateChangedCallback(user);
        }
    }

    cleanup() {
        // Remove all tracked event listeners to prevent memory leaks
        this.eventListeners.forEach(({ element, event, handler }) => {
            element.removeEventListener(event, handler);
        });
        this.eventListeners = [];
    }

    destroy() {
        this.cleanup();
        this.container.innerHTML = '';
    }
}
