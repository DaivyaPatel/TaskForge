# ==========================================
# STAGE 1: Builder
# ==========================================
FROM node:20-alpine AS builder
RUN apk add --no-cache openssl
WORKDIR /app

# Install all dependencies (including devDependencies needed for build)
COPY package*.json ./
RUN npm install

# Copy Prisma schema and generate the client
COPY prisma ./prisma/
RUN npx prisma generate

# Copy the rest of the application code
COPY . .


# ==========================================
# STAGE 2: Runner (Production Image)
# ==========================================
FROM node:20-alpine AS runner
RUN apk add --no-cache openssl
WORKDIR /app

# Set node environment to production
ENV NODE_ENV="production"

# Install ONLY production dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy generated Prisma client and schema (schema is needed for migrate deploy)
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Copy the actual source code
COPY --from=builder /app/src ./src

# Ensure the non-root 'node' user owns the app directory
RUN chown -R node:node /app

# Switch to the non-root user for security
USER node

# Expose the standard port (ensure this matches your deployment environment)
EXPOSE 5000

# Run migrations and start the server
# Note: If your main file is named server.js instead of index.js, change the final command here!
CMD ["sh", "-c", "npx prisma migrate deploy && node src/index.js"]