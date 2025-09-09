# Deployment Guide

This guide covers various deployment options for the QR Code Tracker application.

## Prerequisites

- Docker and Docker Compose installed
- Docker Hub account (for custom images)
- Environment variables configured

## Quick Deployment with Pre-built Images

### Using Docker Hub Images

The easiest way to deploy is using the pre-built images from our CI/CD pipeline:

```bash
# Download the production compose file
curl -O https://raw.githubusercontent.com/GridexX/qr-code-scanner/main/docker-compose.prod.yml

# Create environment file
cp .env.example .env
# Edit .env with your configuration

# Deploy with pre-built images
docker-compose -f docker-compose.prod.yml up -d
```

### Available Images

| Service | Docker Hub Image | Tags |
|---------|------------------|------|
| Backend | `gridexx/qr-tracker-backend` | `latest`, `main`, `v*` |
| Frontend | `gridexx/qr-tracker-frontend` | `latest`, `main`, `v*` |

## Build from Source

### Local Development

```bash
# Clone repository
git clone https://github.com/GridexX/qr-code-scanner.git
cd qr-code-scanner

# Configure environment
cp .env.example .env
# Edit .env file

# Start development environment
make dev
# or
docker-compose up -d
```

### Production Build

```bash
# Build and start production environment
make build
# or
docker-compose up -d --build
```

## Cloud Deployment Options

### Docker Swarm

```bash
# Initialize swarm (if not already done)
docker swarm init

# Deploy stack
docker stack deploy -c docker-compose.prod.yml qr-tracker
```

### Kubernetes

Create Kubernetes manifests:

```yaml
# k8s-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: qr-tracker-backend
spec:
  replicas: 2
  selector:
    matchLabels:
      app: qr-tracker-backend
  template:
    metadata:
      labels:
        app: qr-tracker-backend
    spec:
      containers:
      - name: backend
        image: gridexx/qr-tracker-backend:latest
        ports:
        - containerPort: 8080
        env:
        - name: DATABASE_URL
          value: "file:/app/data/qr_tracker.db"
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: qr-tracker-secrets
              key: jwt-secret
        volumeMounts:
        - name: data-volume
          mountPath: /app/data
      volumes:
      - name: data-volume
        persistentVolumeClaim:
          claimName: qr-tracker-data
---
apiVersion: v1
kind: Service
metadata:
  name: qr-tracker-backend-service
spec:
  selector:
    app: qr-tracker-backend
  ports:
  - port: 8080
    targetPort: 8080
  type: LoadBalancer
```

### Cloud Platforms

#### Railway

```bash
# Deploy to Railway
railway login
railway init
railway add
railway deploy
```

#### Render

1. Connect your GitHub repository
2. Create new web service
3. Set build command: `docker build -f backend/Dockerfile backend/`
4. Set start command: `./main`

#### Heroku

```bash
# Using Heroku Container Registry
heroku create qr-tracker-backend
heroku container:push web -a qr-tracker-backend
heroku container:release web -a qr-tracker-backend
```

## Environment Configuration

### Required Variables

```env
# Database
DATABASE_URL=file:/app/data/qr_tracker.db

# Authentication
JWT_SECRET=your-super-secret-jwt-key
ADMIN_USERNAME=admin
ADMIN_PASSWORD=secure-password

# URLs
BASE_URL=https://your-domain.com
FRONTEND_URL=https://your-frontend-domain.com
```

### Optional Variables

```env
# Analytics
GTM_ID=GTM-XXXXXXX
IPGEOLOCATION_API_KEY=your-api-key

# Database (Turso Cloud)
DATABASE_URL=libsql://your-db.turso.io?authToken=your-token
```

## SSL/HTTPS Setup

### Using Nginx Reverse Proxy

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api/ {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /r/ {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Using Traefik

```yaml
# traefik-compose.yml
version: '3.8'
services:
  traefik:
    image: traefik:v2.10
    command:
      - "--api.dashboard=true"
      - "--providers.docker=true"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.websecure.address=:443"
      - "--certificatesresolvers.myresolver.acme.tlschallenge=true"
      - "--certificatesresolvers.myresolver.acme.email=your-email@example.com"
      - "--certificatesresolvers.myresolver.acme.storage=/letsencrypt/acme.json"
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - "/var/run/docker.sock:/var/run/docker.sock:ro"
      - "./letsencrypt:/letsencrypt"
    labels:
      - "traefik.http.routers.api.rule=Host(`traefik.your-domain.com`)"
      - "traefik.http.routers.api.tls.certresolver=myresolver"

  qr-backend:
    image: gridexx/qr-tracker-backend:latest
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.qr-backend.rule=Host(`api.your-domain.com`)"
      - "traefik.http.routers.qr-backend.tls.certresolver=myresolver"
      - "traefik.http.services.qr-backend.loadbalancer.server.port=8080"

  qr-frontend:
    image: gridexx/qr-tracker-frontend:latest
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.qr-frontend.rule=Host(`your-domain.com`)"
      - "traefik.http.routers.qr-frontend.tls.certresolver=myresolver"
      - "traefik.http.services.qr-frontend.loadbalancer.server.port=3000"
```

## Monitoring and Maintenance

### Health Checks

The application includes built-in health checks:

- Backend: `GET /api/analytics/overview`
- Frontend: HTTP 200 on root path

### Backup Strategy

```bash
# Backup database
docker-compose exec backend cp /app/data/qr_tracker.db /app/data/backup_$(date +%Y%m%d_%H%M%S).db

# Backup QR images
docker-compose exec backend tar -czf /app/data/qr_images_backup_$(date +%Y%m%d_%H%M%S).tar.gz /app/data/qr_images/
```

### Log Management

```bash
# View logs
docker-compose logs -f

# Log rotation (add to crontab)
0 2 * * * docker-compose logs --no-color --timestamps > /var/log/qr-tracker/app_$(date +\%Y\%m\%d).log 2>&1
```

## Scaling

### Horizontal Scaling

```yaml
# docker-compose.scale.yml
version: '3.8'
services:
  backend:
    image: gridexx/qr-tracker-backend:latest
    deploy:
      replicas: 3
      update_config:
        parallelism: 1
        delay: 10s
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    depends_on:
      - backend
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
```

### Load Balancer Configuration

```nginx
upstream qr_backend {
    server backend_1:8080;
    server backend_2:8080;
    server backend_3:8080;
}

server {
    listen 80;
    location /api/ {
        proxy_pass http://qr_backend;
    }
}
```

## Troubleshooting

### Common Issues

1. **Port conflicts**: Change ports in docker-compose.yml
2. **Database permissions**: Ensure data volume has correct permissions
3. **Memory issues**: Add memory limits to docker-compose.yml
4. **SSL certificate issues**: Check certificate paths and permissions

### Debug Mode

```bash
# Enable debug mode
export GIN_MODE=debug
docker-compose up -d

# View detailed logs
docker-compose logs -f backend
```

## Security Considerations

1. **Change default passwords**
2. **Use strong JWT secrets**
3. **Enable HTTPS in production**
4. **Regular security updates via Renovate/Dependabot**
5. **Network isolation**
6. **Rate limiting**
7. **Input validation**

## Support

For deployment issues:
1. Check the logs: `docker-compose logs`
2. Verify environment variables
3. Check network connectivity
4. Review security configurations
5. Open an issue on GitHub with deployment details
