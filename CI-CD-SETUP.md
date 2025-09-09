# CI/CD Setup Guide

This guide helps you set up the CI/CD pipeline for automatic building and deployment to Docker Hub.

## GitHub Secrets Configuration

To enable the CI/CD pipeline, you need to configure the following secrets in your GitHub repository:

### 1. Navigate to Repository Settings

1. Go to your GitHub repository
2. Click on **Settings** tab
3. In the left sidebar, click **Secrets and variables** → **Actions**

### 2. Required Secrets

Add the following repository secrets:

| Secret Name | Description | Example Value |
|-------------|-------------|---------------|
| `DOCKER_USERNAME` | Your Docker Hub username | `gridexx` |
| `DOCKER_PASSWORD` | Your Docker Hub access token | `dckr_pat_abc123...` |

### 3. Docker Hub Access Token Setup

**Important**: Use an access token instead of your password for better security.

1. Log in to [Docker Hub](https://hub.docker.com/)
2. Go to **Account Settings** → **Security**
3. Click **New Access Token**
4. Give it a name (e.g., "GitHub Actions CI/CD")
5. Select appropriate permissions:
   - ✅ **Read** (to pull images)
   - ✅ **Write** (to push new images)
   - ✅ **Delete** (optional, for cleanup)
6. Copy the generated token
7. Use this token as the `DOCKER_PASSWORD` secret value

### 4. Update Docker Image Names

In the workflow files, update the image names to match your Docker Hub username:

**File**: `.github/workflows/ci-cd.yml`
```yaml
env:
  REGISTRY: docker.io
  BACKEND_IMAGE_NAME: qr-tracker-backend
  FRONTEND_IMAGE_NAME: qr-tracker-frontend
```

**File**: `docker-compose.prod.yml`
```yaml
services:
  backend:
    image: YOUR_DOCKER_USERNAME/qr-tracker-backend:latest
  frontend:
    image: YOUR_DOCKER_USERNAME/qr-tracker-frontend:latest
```

## CI/CD Pipeline Overview

### Triggers

The pipeline runs on:

1. **Push to main/develop branches** → Full build and push to Docker Hub
2. **Pull requests to main** → Tests only (no deployment)
3. **Git tags (v*)** → Release builds with version tags

### Pipeline Stages

```
┌─────────────┐    ┌─────────────┐
│ Test        │    │ Test        │
│ Backend     │    │ Frontend    │
│ (Go)        │    │ (Node.js)   │
└─────────────┘    └─────────────┘
      │                    │
      └────────────────────┘
               │
    ┌─────────────────────┐
    │ Build & Push Images │
    │ - Backend Docker    │
    │ - Frontend Docker   │
    └─────────────────────┘
               │
    ┌─────────────────────┐
    │ Security Scan       │
    │ (Trivy)             │
    └─────────────────────┘
               │
    ┌─────────────────────┐
    │ Deploy Notification │
    └─────────────────────┘
```

### Generated Docker Images

After successful builds, the following images are available:

| Image | Tags | Platforms |
|-------|------|-----------|
| `YOUR_USERNAME/qr-tracker-backend` | `latest`, `main`, `develop`, `v*` | `linux/amd64`, `linux/arm64` |
| `YOUR_USERNAME/qr-tracker-frontend` | `latest`, `main`, `develop`, `v*` | `linux/amd64`, `linux/arm64` |

## Workflow Files Explained

### Main CI/CD Workflow (`.github/workflows/ci-cd.yml`)

- **Test Jobs**: Run Go tests and Node.js tests
- **Build Jobs**: Create Docker images and push to Docker Hub
- **Security Scan**: Vulnerability scanning with Trivy
- **Multi-platform**: Builds for both AMD64 and ARM64 architectures

### Release Workflow (`.github/workflows/release.yml`)

- **Triggered by**: Git tags matching `v*` (e.g., `v1.0.0`)
- **Creates**: GitHub releases with automated changelog
- **Updates**: Production docker-compose.yml with new version tags

## Creating a Release

To create a new release:

1. **Tag your commit**:
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

2. **The release workflow will**:
   - Create a GitHub release
   - Generate release notes from commits
   - Update `docker-compose.prod.yml` with the new version

## Monitoring the Pipeline

### GitHub Actions Dashboard

1. Go to your repository
2. Click the **Actions** tab
3. View running and completed workflows
4. Click on any workflow run to see detailed logs

### Build Status Badges

Add these badges to your README to show build status:

```markdown
[![Build and Deploy](https://github.com/YOUR_USERNAME/qr-code-scanner/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/YOUR_USERNAME/qr-code-scanner/actions/workflows/ci-cd.yml)
[![Docker Backend](https://img.shields.io/docker/pulls/YOUR_USERNAME/qr-tracker-backend)](https://hub.docker.com/r/YOUR_USERNAME/qr-tracker-backend)
[![Docker Frontend](https://img.shields.io/docker/pulls/YOUR_USERNAME/qr-tracker-frontend)](https://hub.docker.com/r/YOUR_USERNAME/qr-tracker-frontend)
```

## Dependency Management

### Renovate Configuration

The `renovate.json` file configures automatic dependency updates:

- **Schedule**: Weekly on Mondays
- **Auto-merge**: Patch updates and safe minor updates
- **Security**: Immediate updates for vulnerabilities
- **Grouping**: Related dependencies are grouped together

### Dependabot (Alternative)

The `.github/dependabot.yml` provides GitHub-native dependency updates:

- **Go modules**: Weekly updates
- **NPM packages**: Weekly updates
- **Docker images**: Weekly updates
- **GitHub Actions**: Weekly updates

## Troubleshooting

### Common Issues

1. **Docker login failed**
   - Check `DOCKER_USERNAME` and `DOCKER_PASSWORD` secrets
   - Ensure access token has proper permissions

2. **Build failures**
   - Check Go tests pass locally: `cd backend && go test ./...`
   - Check Node.js tests pass locally: `cd frontend && npm test`

3. **Push failures**
   - Verify Docker Hub repository exists
   - Check image name matches Docker Hub repository

4. **Permission denied**
   - Ensure Docker Hub access token has write permissions
   - Check repository settings allow Actions

### Debug Steps

1. **Check workflow logs**: Go to Actions tab → Click on failed workflow
2. **Validate locally**: 
   ```bash
   # Test backend
   cd backend && go test ./...
   
   # Test frontend
   cd frontend && npm test
   
   # Build Docker images
   docker build -t test-backend ./backend
   docker build -t test-frontend ./frontend
   ```

3. **Verify secrets**: Ensure all required secrets are set in repository settings

## Security Considerations

1. **Use Docker Hub access tokens** instead of passwords
2. **Limit token permissions** to only what's needed
3. **Rotate tokens regularly** (recommended: every 6 months)
4. **Monitor security scans** in the workflow output
5. **Review dependency updates** before merging

## Next Steps

After setting up CI/CD:

1. ✅ **Commit and push** your changes to trigger the first build
2. ✅ **Monitor the Actions tab** for build progress
3. ✅ **Check Docker Hub** for published images
4. ✅ **Test deployment** using the production docker-compose file
5. ✅ **Create your first release** with a git tag

---

Your CI/CD pipeline is now ready! Every push to main will automatically build and deploy your QR Code Tracker application to Docker Hub. 🚀
