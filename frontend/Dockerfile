# Build stage
FROM node:24-alpine AS builder

WORKDIR /app

# Accept build arguments
ARG BACKEND_URL
ARG GTM_ID

# Set environment variables from build args
ENV REACT_APP_API_URL=$BACKEND_URL
ENV REACT_APP_GTM_ID=$GTM_ID

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built application
COPY --from=builder /app/build /usr/share/nginx/html

# Expose port
EXPOSE 3000

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
