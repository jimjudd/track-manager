// ABOUTME: Main application entry point and router
// ABOUTME: Handles tab navigation, service worker registration, and app initialization

import { LibraryView } from './views/library.js';
import { TracksView } from './views/tracks.js';
import { WorkoutsView } from './views/workouts.js';
import { firebaseConfig } from './config/firebase-config.js';
import { AuthView } from './views/auth.js';

class App {
  constructor() {
    this.currentTab = 'workouts';
    this.views = {
      library: null,
      tracks: null,
      workouts: null
    };
    this.firebaseApp = null;
    this.firebaseAuth = null;
    this.authView = null;
    this.init();
  }

  init() {
    this.setupServiceWorker();
    this.initializeFirebase();
    this.setupTabNavigation();
    this.loadInitialTab();
  }

  initializeFirebase() {
    try {
      this.firebaseApp = firebase.initializeApp(firebaseConfig);
      this.firebaseAuth = firebase.auth();

      // Set up auth state listener
      this.firebaseAuth.onAuthStateChanged((user) => {
        console.log('Auth state changed:', user?.email || 'signed out');
        if (this.authView) {
          this.authView.setUser(user);
        }
      });

      console.log('Firebase initialized successfully');

      // Initialize auth view
      const authContainer = document.getElementById('auth-container');
      if (authContainer) {
        this.authView = new AuthView(authContainer);
        this.authView.render();
      }
    } catch (error) {
      console.error('Firebase initialization failed:', error);
    }
  }

  setupServiceWorker() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('./sw.js')
        .then(registration => {
          console.log('Service Worker registered:', registration);

          // Check for updates every hour
          setInterval(() => {
            registration.update();
          }, 60 * 60 * 1000);

          // Listen for updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;

            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New version available
                this.showUpdateNotification();
              }
            });
          });
        })
        .catch(error => {
          console.error('Service Worker registration failed:', error);
        });

      // Handle controller change (user accepted update)
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
      });
    }
  }

  showUpdateNotification() {
    const notification = document.createElement('div');
    notification.className = 'update-notification';
    notification.innerHTML = `
      <div class="update-content">
        <p>A new version is available!</p>
        <button id="update-btn" class="btn-primary">Update Now</button>
        <button id="dismiss-update-btn" class="btn-secondary">Later</button>
      </div>
    `;
    document.body.appendChild(notification);

    document.getElementById('update-btn').addEventListener('click', () => {
      // Tell service worker to skip waiting and activate
      navigator.serviceWorker.ready.then(registration => {
        if (registration.waiting) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
      });
      notification.remove();
    });

    document.getElementById('dismiss-update-btn').addEventListener('click', () => {
      notification.remove();
    });
  }

  setupTabNavigation() {
    const tabButtons = document.querySelectorAll('.tab-button');
    tabButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        const tab = e.target.dataset.tab;
        this.navigateToTab(tab);
      });
    });
  }

  navigateToTab(tab) {
    // Update active tab button
    document.querySelectorAll('.tab-button').forEach(btn => {
      btn.classList.remove('active');
      btn.setAttribute('aria-selected', 'false');
    });
    const targetButton = document.querySelector(`[data-tab="${tab}"]`);
    if (targetButton) {
      targetButton.classList.add('active');
      targetButton.setAttribute('aria-selected', 'true');
    }

    // Update current tab
    this.currentTab = tab;

    // Load tab content
    this.loadTabContent(tab);

    // Update URL without reload
    history.pushState({ tab }, '', `?tab=${tab}`);
  }

  async loadTabContent(tab) {
    const content = document.getElementById('content');

    switch(tab) {
      case 'workouts':
        if (!this.views.workouts) {
          this.views.workouts = new WorkoutsView(content);
        }
        await this.views.workouts.render();
        break;
      case 'tracks':
        if (!this.views.tracks) {
          this.views.tracks = new TracksView(content);
        }
        await this.views.tracks.render();
        break;
      case 'library':
        if (!this.views.library) {
          this.views.library = new LibraryView(content);
        }
        await this.views.library.render();
        break;
      default:
        content.innerHTML = '<h2>Not Found</h2>';
    }
  }

  loadInitialTab() {
    // Check URL for tab parameter
    const urlParams = new URLSearchParams(window.location.search);
    const tab = urlParams.get('tab') || 'workouts';
    this.navigateToTab(tab);
  }
}

// Store app instance globally for popstate handler
let appInstance = null;

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    appInstance = new App();
  });
} else {
  appInstance = new App();
}

// Handle browser back/forward
window.addEventListener('popstate', (event) => {
  if (event.state && event.state.tab && appInstance) {
    appInstance.navigateToTab(event.state.tab);
  }
});
