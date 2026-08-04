# ————————————————— مرحلهٔ ساخت —————————————————
FROM node:22-alpine AS build
WORKDIR /app

# آدرس API در زمان ساخت داخل باندل نوشته می‌شود، نه در زمان اجرا.
ARG VITE_API_BASE_URL=http://95.38.188.15:8080/api
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ————————————————— مرحلهٔ اجرا —————————————————
FROM nginx:1.27-alpine AS runtime

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY security-headers.conf /etc/nginx/security-headers.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD wget -qO- http://localhost/ >/dev/null || exit 1