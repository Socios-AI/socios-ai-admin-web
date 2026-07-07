# syntax=docker/dockerfile:1.6

FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
RUN npm ci --ignore-scripts

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_COOKIE_DOMAIN
ARG NEXT_PUBLIC_COOKIE_SAMESITE
ARG NEXT_PUBLIC_COOKIE_SECURE
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_COOKIE_DOMAIN=$NEXT_PUBLIC_COOKIE_DOMAIN
ENV NEXT_PUBLIC_COOKIE_SAMESITE=$NEXT_PUBLIC_COOKIE_SAMESITE
ENV NEXT_PUBLIC_COOKIE_SECURE=$NEXT_PUBLIC_COOKIE_SECURE
RUN npm run build

# Playwright-capable runner: contract PDF rendering launches headless Chromium,
# which needs glibc + the browser preinstalled (not available on Alpine). This
# image ships Node 20, Chromium, and its system deps at /ms-playwright, matching
# the pinned playwright 1.61.1. The prebuilt browser (pwuser) already exists.
FROM mcr.microsoft.com/playwright:v1.61.1-jammy AS runner
WORKDIR /app
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3001
ENV HOSTNAME=0.0.0.0
# Mirror public Supabase config into non-prefixed env vars so that
# @socios-ai/auth/admin/getCallerClient (which reads SUPABASE_URL /
# SUPABASE_ANON_KEY) works at runtime in server components.
ENV SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
COPY --from=builder --chown=pwuser:pwuser /app/public ./public
COPY --from=builder --chown=pwuser:pwuser /app/.next/standalone ./
COPY --from=builder --chown=pwuser:pwuser /app/.next/static ./.next/static
USER pwuser
EXPOSE 3001
CMD ["node", "server.js"]
