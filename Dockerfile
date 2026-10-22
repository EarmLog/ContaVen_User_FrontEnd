# ============================================================
# ContaVen - App de usuarios (Next.js, sitio estático)
# ============================================================
# Build en dos etapas: primero se compila el sitio con Node, y el
# resultado (la carpeta "out/") se sirve con nginx, que pesa poco y
# no necesita Node en producción.
#
# IMPORTANTE: las variables NEXT_PUBLIC_* se "incrustan" en el sitio al
# compilar, así que hay que pasarlas como argumentos de build (build args).
# Se pueden dar con --build-arg o desde docker-compose.yml / .env.
# ============================================================

# ---------- Etapa 1: compilar ----------
# Se usa Node 22 porque @supabase/supabase-js lo exige (>=22).
FROM node:22-alpine AS compilacion

WORKDIR /app

# Variables que Next.js necesita en el momento de compilar.
# Tienen valores por defecto (producción) para que el build funcione
# aunque no se pasen; se pueden sobrescribir con --build-arg.
ARG NEXT_PUBLIC_SUPABASE_URL=https://owhfypcyinmoaeuvqeqm.supabase.co
ARG NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_q_oh0Qpjlu4g1J1vQk2_iA_s-2hOQUf
ARG NEXT_PUBLIC_URL_API=https://conta-ven-user-back-end-nine.vercel.app

ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_URL_API=$NEXT_PUBLIC_URL_API

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
