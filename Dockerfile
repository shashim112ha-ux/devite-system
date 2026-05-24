FROM node:20-slim

# Install necessary libraries for Puppeteer (Chromium)
# These are required to run whatsapp-web.js headlessly
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    ca-certificates \
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libdbus-1-3 \
    libxcb1 \
    libxkbcommon0 \
    libx11-6 \
    libcomposite1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libpango-1.0-0 \
    libcairo2 \
    libxshmfence1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy root package configurations
COPY package.json package-lock.json ./

# Copy the entire workspace (apps/server, apps/web, etc.)
# We copy everything because it's a monorepo, and .dockerignore will exclude node_modules
COPY . .

# Install dependencies for the whole workspace
RUN npm install

# Build the server app
RUN npm run build --workspace=apps/server

# Expose the server port
EXPOSE 4000

# Set production environment
ENV NODE_ENV=production
ENV PORT=4000

# Start the server (matches your package.json script)
CMD ["npm", "run", "start:server"]
