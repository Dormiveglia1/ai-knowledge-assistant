# =========================================================================
# STAGE 1: Compilation Phase (Using Node.js to crush code into static assets)
# =========================================================================
FROM node:20-alpine AS builder

WORKDIR /app

# Optimize layer cache: Copy package manifests first
COPY package*.json ./

# Install front-end dependencies inside the container sharding environment
RUN npm install

# Copy the rest of the React/Vite source assets
COPY . .

# Run Vite production bundler to yield the compiled "/app/dist" static directory
RUN npm run build

# =========================================================================
# STAGE 2: Hosting Phase (Using ultra-lightweight Nginx to serve the web)
# =========================================================================
FROM nginx:alpine

# Copy the compiled HTML/JS/CSS assets from the first "builder" stage directly into Nginx's default public sector
COPY --from=builder /app/dist /usr/share/nginx/html

# Open port 80 to route incoming browser navigation queries
EXPOSE 80

# Launch Nginx in the foreground to keep the container process alive
CMD ["nginx", "-g", "daemon off;"]