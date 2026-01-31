// ABOUTME: Main application entry point and router
// ABOUTME: Handles tab navigation, service worker registration, and app initialization

import { LibraryView } from './views/library.js';
import { TracksView } from './views/tracks.js';
import { WorkoutsView } from './views/workouts.js';
import { firebaseConfig } from './config/firebase-config.js';
import { AuthView } from './views/auth.js';
import { SyncService } from './services/sync.js';
import { db } from './db.js';

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
    this.syncService = null;
    this.init();
  }

  init() {
    this.setupServiceWorker();
    this.initializeFirebase();
    this.setupNetworkListeners();
    this.setupTabNavigation();
    this.loadInitialTab();
  }

  initializeFirebase() {
    try {
      this.firebaseApp = firebase.initializeApp(firebaseConfig);
      this.firebaseAuth = firebase.auth();

      // Set up auth state listener
      this.firebaseAuth.onAuthStateChanged(async (user) => {
        console.log('Auth state changed:', user?.email || 'signed out');

        // Destroy existing sync service
        if (this.syncService) {
          this.syncService.destroy();
          this.syncService = null;
        }

        // Update auth view
        if (this.authView) {
          this.authView.setUser(user);
        }

        // Initialize sync service if signed in
        if (user) {
          try {
            const firestore = firebase.firestore();
            this.syncService = new SyncService(db, firestore, user.uid);
            await this.syncService.initialize();

            if (this.authView) {
              this.authView.updateSyncStatus('synced');
            }
          } catch (error) {
            console.error('Failed to initialize sync service:', error);
            if (this.authView) {
              this.authView.updateSyncStatus('error');
            }
          }
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

  setupNetworkListeners() {
    window.addEventListener('online', () => {
      console.log('Network: online');
      if (this.authView) {
        this.authView.updateSyncStatus('syncing');
        // Status will update to 'synced' once sync completes
        setTimeout(() => {
          if (this.authView) {
            this.authView.updateSyncStatus('synced');
          }
        }, 2000);
      }
    });

    window.addEventListener('offline', () => {
      console.log('Network: offline');
      if (this.authView) {
        this.authView.updateSyncStatus('offline');
      }
    });
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
        console.log('Service worker controller changed, reloading...');
        window.location.reload();
      });

      // Listen for service worker messages (alternative for iOS)
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data.type === 'SW_ACTIVATED') {
          console.log('Service worker activated, reloading...');
          window.location.reload();
        }
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

    document.getElementById('update-btn').addEventListener('click', async () => {
      console.log('Update button clicked');

      // Show updating message
      notification.querySelector('.update-content').innerHTML = '<p>Updating...</p>';

      try {
        const registration = await navigator.serviceWorker.ready;
        console.log('Service worker ready:', registration);

        if (registration.waiting) {
          console.log('Waiting service worker found, activating...');

          // Set up a promise that resolves when reload should happen
          const reloadPromise = new Promise((resolve) => {
            // Listen for SW_ACTIVATED message
            const messageHandler = (event) => {
              if (event.data && event.data.type === 'SW_ACTIVATED') {
                console.log('Received SW_ACTIVATED message');
                navigator.serviceWorker.removeEventListener('message', messageHandler);
                resolve('message');
              }
            };
            navigator.serviceWorker.addEventListener('message', messageHandler);

            // Listen for controllerchange
            const controllerHandler = () => {
              console.log('Controller changed');
              navigator.serviceWorker.removeEventListener('controllerchange', controllerHandler);
              resolve('controllerchange');
            };
            navigator.serviceWorker.addEventListener('controllerchange', controllerHandler);

            // Fallback timeout for iOS
            setTimeout(() => {
              console.log('Reload timeout triggered');
              resolve('timeout');
            }, 2000);
          });

          // Tell the waiting service worker to activate
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });

          // Wait for one of the signals
          const trigger = await reloadPromise;
          console.log('Reloading due to:', trigger);
          window.location.reload();
        } else {
          console.log('No waiting worker, reloading immediately');
          window.location.reload();
        }
      } catch (error) {
        console.error('Update failed:', error);
        notification.querySelector('.update-content').innerHTML = `
          <p>Update failed. Please refresh manually.</p>
          <button id="manual-refresh-btn" class="btn-primary">Refresh</button>
        `;
        const refreshBtn = document.getElementById('manual-refresh-btn');
        if (refreshBtn) {
          refreshBtn.addEventListener('click', () => {
            window.location.reload();
          });
        }
      }
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
