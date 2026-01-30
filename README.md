# Les Mills Track Manager

A Progressive Web App (PWA) for Les Mills instructors to manage workouts, tracks, and ratings.

## Features

- **Workout Management**: Create and manage Les Mills workouts
- **Track Library**: Browse and search tracks by program and release
- **Ratings System**: Rate tracks and view rating history
- **Offline Support**: Full offline functionality with IndexedDB
- **PWA**: Install on mobile devices for app-like experience

## Technology Stack

- Vanilla JavaScript (ES6+)
- IndexedDB via Dexie.js
- Service Workers for offline support
- CSS Grid/Flexbox for responsive layout
- No build tools required

## Deployment

This app is automatically deployed to GitHub Pages on every push to `main`.

**Live App:** https://jimjudd.github.io/track-manager/

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed deployment instructions.

## Development

### Prerequisites

- Modern web browser (Chrome, Safari, Firefox)
- Local web server (e.g., Python's http.server, VS Code Live Server)

### Running Locally

1. Start a local web server in the project directory:

```bash
# Using Python 3
python -m http.server 8000

# Using Python 2
python -m SimpleHTTPServer 8000

# Using Node.js http-server
npx http-server -p 8000
```

2. Open http://localhost:8000 in your browser

3. For PWA testing, use Chrome DevTools > Application > Service Workers

### Running Tests

```bash
open tests/run-all-tests.html
```

### Deploying

Push to `main` branch - automatic deployment via GitHub Actions.

```bash
git push origin main
```

### Project Structure

```
track-manager/
├── index.html              # Main HTML file
├── manifest.json           # PWA manifest
├── sw.js                   # Service worker
├── styles/
│   └── main.css           # All styles
├── js/
│   ├── app.js             # Main app & router
│   ├── models/            # Data models (Dexie.js)
│   ├── views/             # View components
│   └── components/        # Reusable UI components
└── README.md
```

## PWA Installation

### iOS (Safari)
1. Open the app in Safari
2. Tap the Share button
3. Select "Add to Home Screen"

### Android (Chrome)
1. Open the app in Chrome
2. Tap the menu (3 dots)
3. Select "Add to Home Screen"

## Database Schema

The app uses IndexedDB with the following stores:

- **programs**: Les Mills program information
- **releases**: Release numbers and dates per program
- **tracks**: Individual tracks with metadata
- **workouts**: Created workouts
- **ratings**: Track rating history

## Browser Support

- Chrome/Edge 90+
- Safari 14+
- Firefox 88+

## License

MIT
