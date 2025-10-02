# Use Debian-based image to ensure ffmpeg-static binary compatibility
FROM node:20-bullseye-slim

# Install tini for proper signal handling
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates curl tini \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV NODE_ENV=production

# Copy only package manifests for better layer caching
COPY package*.json ./

# Install production deps
RUN npm ci --omit=dev

# Copy the rest
COPY . .

# Create uploads dir and set safe perms
RUN mkdir -p /app/uploads && chown -R node:node /app

# Use non-root user
USER node

EXPOSE 3000

# Proper init
ENTRYPOINT ["tini","-g","--"]

CMD ["npm", "start", "--silent"]