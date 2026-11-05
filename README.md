# QR Code Tracker

[![Build and Deploy](https://github.com/GridexX/qr-scanner/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/GridexX/qr-scanner/actions/workflows/ci-cd.yml)
[![Docker Backend](https://img.shields.io/docker/pulls/gridexx/qr-tracker-backend)](https://hub.docker.com/r/gridexx/qr-tracker-backend)
[![Docker Frontend](https://img.shields.io/docker/pulls/gridexx/qr-tracker-frontend)](https://hub.docker.com/r/gridexx/qr-tracker-frontend)
[![Go Version](https://img.shields.io/github/go-mod/go-version/GridexX/qr-scanner?filename=backend%2Fgo.mod)](https://golang.org/)
[![License](https://img.shields.io/github/license/GridexX/qr-scanner)](LICENSE)
[![Renovate enabled](https://img.shields.io/badge/renovate-enabled-brightgreen.svg)](https://renovatebot.com/)

A comprehensive QR code generation and analytics application built with Go (backend) and React (frontend). Perfect for business cards, marketing campaigns, and any use case where you need to track QR code interactions.

## 🚀 Quick Start with Pre-built Images

The fastest way to get started is using our pre-built Docker images:

```bash
# Download production configuration
curl -L -o docker-compose.prod.yml https://raw.githubusercontent.com/GridexX/qr-code-scanner/main/docker-compose.prod.yml

# Set up environment
curl -L -o .env https://raw.githubusercontent.com/GridexX/qr-code-scanner/main/.env.example
# Edit .env with your configuration

# Deploy with pre-built images
docker-compose -f docker-compose.prod.yml up -d
```

**Available Images:**
- Backend: [`gridexx/qr-tracker-backend`](https://hub.docker.com/r/gridexx/qr-tracker-backend)
- Frontend: [`gridexx/qr-tracker-frontend`](https://hub.docker.com/r/gridexx/qr-tracker-frontend)

## Features

- 🎯 **QR Code Generation**: Create customizable QR codes with colors, sizes, and branding
- 📊 **Real-time Analytics**: Track scans with detailed metrics and time-series data
- 🌍 **Geolocation Tracking**: IP-based location tracking for scan analytics
- 🔍 **User Agent Analysis**: Browser and device type detection
- 📈 **Interactive Dashboard**: Beautiful charts and graphs using Recharts
- 🎨 **Admin Interface**: Clean, responsive React interface with Tailwind CSS
- 🏷️ **Google Tag Manager**: Automatic GTM event tracking on QR code scans
- 🐳 **Docker Ready**: Easy deployment with Docker Compose
- 💾 **Turso Database**: SQLite-compatible database for reliable data storage

## Technology Stack

### Backend
- **Go 1.21** with Gin web framework
- **Turso** (SQLite-compatible) database
- **JWT authentication** for admin access
- **QR code generation** with customization options
- **IP geolocation** service integration

### Frontend
- **React 18** with modern hooks
- **Tailwind CSS** for styling
- **Recharts** for analytics visualization
- **React Router** for navigation
- **Axios** for API communication

## Quick Start

### Prerequisites
- Docker and Docker Compose
- Optional: Turso account for cloud database
- Optional: IP Geolocation API key for location tracking
- Optional: Google Tag Manager ID for analytics

### 1. Clone and Configure

```bash
git clone <your-repo-url>
cd qr-code-scanner
```

### 2. Environment Setup

Create a `.env` file in the root directory:

```env
# Database Configuration
DATABASE_URL=file:./data/qr_tracker.db
# For Turso cloud database, use:
# DATABASE_URL=libsql://your-database-url.turso.io?authToken=your-auth-token
# Note: Legacy sqlite:// URLs are automatically converted to file: format

# Authentication
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-secure-admin-password

# Application URLs
BASE_URL=http://localhost:8080
FRONTEND_URL=http://localhost:3000
REACT_APP_API_URL=http://localhost:8080

# Optional: Google Tag Manager
GTM_ID=GTM-XXXXXXX

# Optional: IP Geolocation (for location tracking)
IPGEOLOCATION_API_KEY=your-api-key-here
```

### 3. Launch the Application

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f
```

### 4. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8080
- **Login credentials**: Use the username/password from your `.env` file

## Usage Guide

### Creating QR Codes

1. Log in to the admin interface
2. Navigate to "Create QR" in the navigation
3. Fill in the form:
   - **Title**: Descriptive name for your QR code
   - **Target URL**: Where the QR code should redirect
   - **Colors**: Customize foreground and background colors
   - **Size**: Choose from 128x128 to 1024x1024 pixels
4. Click "Create QR Code"

### Viewing Analytics

1. Go to the **Dashboard** for overall statistics
2. Visit **QR Codes** to see all your codes with scan counts
3. Click on any QR code to view detailed analytics:
   - Scan count and trends
   - Time-series chart
   - Recent scan details with location and device info
   - Download QR code image
   - Copy redirect URL

### QR Code Usage

Each QR code gets a short redirect URL: `http://your-domain/r/abcd1234`

When scanned:
1. Analytics are recorded (IP, user agent, timestamp)
2. Geolocation data is captured (if API key provided)
3. GTM event is fired (if GTM ID provided)
4. User is redirected to the target URL

## Configuration Options

### Database Options

**Local SQLite (Default)**:
```env
DATABASE_URL=file:./data/qr_tracker.db
```

**Turso Cloud Database**:
```env
DATABASE_URL=libsql://your-database.turso.io?authToken=your-token
```

**Legacy Format Support**:
The system automatically converts old `sqlite://` URLs to the new `file:` format for backward compatibility.

### Google Tag Manager Integration

Add your GTM ID to enable automatic event tracking:
```env
GTM_ID=GTM-XXXXXXX
```

Events sent include:
- `qr_code_scan`
- QR code ID, title, target URL
- Device type and browser info

### IP Geolocation

For location-based analytics, sign up at [ipgeolocation.io](https://ipgeolocation.io):
```env
IPGEOLOCATION_API_KEY=your-api-key
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - Admin login

### QR Code Management
- `GET /api/qr` - List all QR codes
- `POST /api/qr` - Create new QR code
- `GET /api/qr/:id` - Get QR code details
- `PUT /api/qr/:id` - Update QR code
- `DELETE /api/qr/:id` - Delete QR code

### Analytics
- `GET /api/analytics/overview` - Dashboard statistics
- `GET /api/analytics/qr/:id` - QR code specific analytics
- `GET /api/analytics/timeseries` - Time series data

### Public Routes
- `GET /r/:code` - QR code redirect (with tracking)
- `GET /data/qr_images/:code.png` - QR code images

## Development

### Local Development Setup

**Backend**:
```bash
cd backend
go mod download
go run main.go
```

**Frontend**:
```bash
cd frontend
npm install
npm start
```

### Building for Production

The Docker Compose setup is production-ready. For custom deployments:

**Backend**:
```bash
cd backend
CGO_ENABLED=0 GOOS=linux go build -o main .
```

**Frontend**:
```bash
cd frontend
npm run build
```

## Deployment

### Docker Compose (Recommended)

The included `docker-compose.yml` is production-ready:
- Multi-stage builds for optimal image sizes
- Persistent data volumes
- Nginx reverse proxy for frontend
- Health checks and restart policies

### Custom Deployment

1. Build the Docker images
2. Set up a reverse proxy (nginx/traefik)
3. Configure SSL certificates
4. Set up persistent storage for QR images and database
5. Configure environment variables for your domain

## Security Considerations

- Change default admin credentials
- Use strong JWT secrets
- Set up HTTPS in production
- Consider rate limiting for QR code creation
- Regularly backup your database

## Troubleshooting

### Common Issues

**QR images not loading**:
- Check that the `/data/qr_images` volume is properly mounted
- Verify the `BASE_URL` environment variable is correct

**Authentication issues**:
- Ensure `JWT_SECRET` is set and consistent
- Check admin credentials in environment variables

**Database connection issues**:
- Verify `DATABASE_URL` format
- For Turso: check auth token and database URL

### Logs

```bash
# View all logs
docker-compose logs

# View specific service logs
docker-compose logs backend
docker-compose logs frontend
```

## 🔄 CI/CD and Deployment

### Automated Builds

Our CI/CD pipeline automatically:

- ✅ **Tests** both backend (Go) and frontend (Node.js)
- ✅ **Builds** Docker images for multiple architectures (amd64, arm64)
- ✅ **Pushes** to Docker Hub on successful builds
- ✅ **Scans** for security vulnerabilities with Trivy
- ✅ **Updates** dependencies via Renovate

### GitHub Actions Workflow

The pipeline runs on:
- **Push to main/develop**: Full build and deploy
- **Pull requests**: Tests only
- **Tags (v*)**: Release builds with version tags

### Docker Images

| Service | Image | Tags | Architectures |
|---------|-------|------|---------------|
| Backend | `gridexx/qr-tracker-backend` | `latest`, `main`, `develop`, `v*` | `linux/amd64`, `linux/arm64` |
| Frontend | `gridexx/qr-tracker-frontend` | `latest`, `main`, `develop`, `v*` | `linux/amd64`, `linux/arm64` |

### Dependency Management

**Automated Updates:**
- 🔄 **Renovate** for comprehensive dependency management
- 🔄 **Dependabot** as backup for GitHub-native updates
- 🔒 **Security patches** applied automatically
- 📅 **Weekly scheduled** dependency reviews

**Update Schedule:**
- **Security updates**: Immediate
- **Patch updates**: Auto-merged
- **Minor updates**: Weekly review
- **Major updates**: Manual approval required

### Deployment Options

1. **Quick Deploy** (Recommended):
   ```bash
   # Use pre-built images
   docker-compose -f docker-compose.prod.yml up -d
   ```

2. **Build from Source**:
   ```bash
   # Local build
   docker-compose up -d --build
   ```

3. **Cloud Platforms**: See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed guides

### Monitoring

- 📊 **Health checks** built into Docker containers
- 🚨 **Security scanning** with each build
- 📈 **Build status** visible via GitHub Actions badges
- 🔍 **Dependency tracking** via Renovate dashboard

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License. See LICENSE file for details.

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review the logs for error messages
3. Open an issue on GitHub with detailed information

---

**Happy QR tracking! 📱📊**
