# Deployment Guide

## GitHub Pages Deployment

This app automatically deploys to GitHub Pages on every push to `main`.

### Initial Setup

1. **Enable GitHub Pages**
   - Go to repository Settings → Pages
   - Source: GitHub Actions
   - Save

2. **Push to main branch**
   ```bash
   git push origin main
   ```

3. **Monitor deployment**
   - Go to Actions tab
   - Watch "Deploy to GitHub Pages" workflow
   - Deployment takes ~1-2 minutes

4. **Access deployed app**
   - URL: `https://[username].github.io/[repo-name]/`
   - Example: `https://jimjudd.github.io/track-manager/`

### Manual Deployment

Trigger deployment manually:
- Go to Actions tab
- Select "Deploy to GitHub Pages"
- Click "Run workflow"
- Select `main` branch
- Click "Run workflow"

### Deployment Checklist

Before deploying:
- [ ] All tests pass (`open tests/run-all-tests.html`)
- [ ] Service worker updated with new version number
- [ ] Icons exist in `/icons/` directory
- [ ] Manifest.json properly configured
- [ ] All asset paths are relative (not absolute)
- [ ] App works offline (test with service worker)

### Troubleshooting

**404 errors after deployment:**
- Check all asset paths use `./` prefix
- Verify files are in root directory
- Check service worker cache paths

**PWA not installing:**
- Verify manifest.json accessible at `/manifest.json`
- Check icons are in `/icons/` directory
- Ensure HTTPS (GitHub Pages provides this)

**Service worker not updating:**
- Increment CACHE_VERSION in `sw.js`
- Clear browser cache
- Unregister old service worker in DevTools

### Rolling Back

To rollback to previous version:
1. Find working commit: `git log`
2. Revert: `git revert <commit-hash>`
3. Push: `git push origin main`
4. Automatic deployment runs with reverted code

### Custom Domain (Optional)

To use custom domain:
1. Add CNAME file to root: `echo "yourdomain.com" > CNAME`
2. Configure DNS:
   - Add A records pointing to GitHub IPs
   - Or CNAME record pointing to `[username].github.io`
3. Enable HTTPS in repository settings
