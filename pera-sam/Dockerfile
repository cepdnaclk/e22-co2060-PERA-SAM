# ─── Stage 1: Build ───────────────────────────────────────────────────────────
FROM node:20-slim AS build

WORKDIR /app

# Install deps first (cached layer)
COPY package*.json ./
RUN npm ci --prefer-offline

# Build-time environment variables (injected from docker-compose or CI)
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ARG VITE_SUPABASE_PROJECT_ID
ARG VITE_ML_API_URL=http://backend:8000

ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_PUBLISHABLE_KEY=$VITE_SUPABASE_PUBLISHABLE_KEY
ENV VITE_SUPABASE_PROJECT_ID=$VITE_SUPABASE_PROJECT_ID
ENV VITE_ML_API_URL=$VITE_ML_API_URL

# Copy source and build
COPY . .
RUN npm run build

# ─── Stage 2: Serve ───────────────────────────────────────────────────────────
FROM nginx:stable-alpine

# Custom nginx config: listens on 8080, SPA fallback routing, gzip, security headers
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built React app
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
