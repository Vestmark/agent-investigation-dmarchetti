FROM node:22-slim

WORKDIR /app

# Install production dependencies only
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy source and static files
COPY src/ src/
COPY public/ public/
COPY tsconfig.json ./

EXPOSE 2404

CMD ["node", "--import", "tsx/esm", "src/index.ts"]
