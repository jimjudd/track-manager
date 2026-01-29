// ABOUTME: Main application entry point and router
// ABOUTME: Handles tab navigation, service worker registration, and app initialization

class App {
  constructor() {
    this.currentTab = 'workouts';
    this.init();
  }

  init() {
    this.setupServiceWorker();
    this.setupTabNavigation();
    this.loadInitialTab();
  }

  setupServiceWorker() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then(registration => {
          console.log('Service Worker registered:', registration);
        })
        .catch(error => {
          console.error('Service Worker registration failed:', error);
        });
    }
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

  loadTabContent(tab) {
    const content = document.getElementById('content');

    switch(tab) {
      case 'workouts':
        content.innerHTML = '<h2>Workouts</h2><p>Workouts view coming soon...</p>';
        break;
      case 'tracks':
        content.innerHTML = '<h2>Tracks</h2><p>Tracks view coming soon...</p>';
        break;
      case 'library':
        content.innerHTML = '<h2>Library</h2><p>Library view coming soon...</p>';
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
