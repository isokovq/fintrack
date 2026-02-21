FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/

# Install dependencies
RUN cd backend && npm install --production
RUN cd frontend && npm install

# Copy source code
COPY backend/ ./backend/
COPY frontend/ ./frontend/

# Build frontend
RUN cd frontend && npm run build

# Set environment
ENV NODE_ENV=production
ENV PORT=5000

EXPOSE 5000

# Start backend (serves frontend too)
CMD ["node", "backend/src/index.js"]
