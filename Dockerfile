# Stage 1: Build React app
FROM node:20-alpine AS client-builder
WORKDIR /app/client
COPY client/package.json client/package-lock.json ./
COPY client .
RUN npm run build

# Stage 2: Build Express server
FROM node:20-alpine AS server-builder
WORKDIR /app/server
COPY server/package.json server/package-lock.json ./
COPY server .
RUN npm run build

# Final Stage
FROM node:20-alpine
WORKDIR /app

# Copy server
COPY --from=server-builder /app/server/dist ./server
COPY --from=server-builder /app/server/node_modules ./node_modules
COPY --from=server-builder /app/server/package.json .

# Copy client
COPY --from=client-builder /app/client/build ./client/build

ENV NODE_ENV=production
ENV PORT=3000
ENV CLIENT_BUILD_PATH=/app/client/build
EXPOSE 3000

CMD ["node", "server/index.js"]