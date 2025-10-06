# Deployment Guide

This document explains how to deploy the Jugger Tournament App to GitHub Pages.

## Automatic Deployment

The application is configured for automatic deployment to GitHub Pages using GitHub Actions.

### Setup

1. **Enable GitHub Pages** in your repository settings:
   - Go to Settings > Pages
   - Select "GitHub Actions" as the source

2. **Push to main branch** - The deployment will trigger automatically

### Workflow

The deployment workflow (`.github/workflows/deploy.yml`) will:
- Install dependencies
- Run linting
- Build the application
- Deploy to GitHub Pages

## Manual Deployment

You can also deploy manually:

```bash
# Build and prepare for deployment
npm run deploy

# The output will be in the 'out' directory
# Upload the contents to your hosting provider
```

## Configuration

### Base Path

The application is configured to work with GitHub Pages subpath routing:
- Production: `https://username.github.io/jugger-tournament-app/`
- Development: `http://localhost:3000/`

### Custom Domain

To use a custom domain:

1. Set the `CUSTOM_DOMAIN` environment variable in GitHub Actions
2. Or manually create a `CNAME` file in the `out` directory

### PWA Configuration

The PWA manifest and service worker are automatically configured for the deployment path.

## Troubleshooting

### 404 Errors

- The app includes a custom 404 page for proper SPA routing
- The `.nojekyll` file prevents Jekyll processing

### Asset Loading Issues

- All assets use the configured `basePath` and `assetPrefix`
- Images are set to `unoptimized: true` for static hosting

### Service Worker Issues

- The service worker is disabled in development
- Clear browser cache if experiencing caching issues

## Local Testing

Test the production build locally:

```bash
# Build the application
npm run build

# Serve the static files
npm run serve

# Open http://localhost:3000
```

## Performance

The build is optimized for static hosting:
- Code splitting and minification
- Optimized CSS and JavaScript
- Compressed assets
- Efficient caching strategies