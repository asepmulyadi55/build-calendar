FROM node:20-bookworm-slim

# Chromium and the fonts ship inside the image. Nothing is fetched at render time.
RUN apt-get update && apt-get install -y --no-install-recommends \
      chromium \
      fonts-dejavu-core \
      fonts-liberation \
      ca-certificates \
      procps \
      poppler-utils \
    && rm -rf /var/lib/apt/lists/*

ENV CHROME_PATH=/usr/bin/chromium \
    PUPPETEER_SKIP_DOWNLOAD=1 \
    NODE_ENV=production \
    # Without this the worker's RSS climbs job after job: sharp/libvips frees its
    # buffers but glibc keeps them in per-thread arenas. Measured in this spike.
    MALLOC_ARENA_MAX=2

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund

COPY src ./src

# Stand-in for an R2 print derivative: 6000 x 4500 JPEG, baked at build time so its
# memory cost is not counted in the measured render.
RUN node src/photo.js

CMD ["sh", "-c", "node src/render.js all && node src/verify.js"]
