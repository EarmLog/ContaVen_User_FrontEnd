# ============================================================
# ContaVen - App de usuarios (Next.js, sitio estático)
# ============================================================
# Build en dos etapas: primero se compila el sitio con Node, y el
# resultado (la carpeta "out/") se sirve con nginx, que pesa poco y
# no necesita Node en producción.
# ============================================================

# ---------- Etapa 1: compilar ----------
FROM node:20-alpine AS compilacion

WORKDIR /app

# Se copian primero los manifiestos para aprovechar la caché de capas
COPY package.json package-lock.json ./
RUN npm ci

# Se copia el resto del código y se compila el sitio estático
COPY . .
RUN npm run build

# ---------- Etapa 2: servir ----------
FROM nginx:1.27-alpine AS produccion

# Configuración de nginx para una SPA estática (con fallback a index.html)
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

# Se copia el sitio ya compilado
COPY --from=compilacion /app/out /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
