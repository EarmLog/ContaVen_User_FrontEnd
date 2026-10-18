/*
 * (next.config.mjs)
 * Configuración de Next.js para la app de usuarios de ContaVen.
 *
 * La app se exporta como sitio estático (output: "export") porque solo
 * habla con Supabase y con el backend Flask, no necesita servidor propio.
 * El resultado del build queda en la carpeta "out/".
 */

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Sitio 100% estático: no hay funciones del servidor de Next.js
  output: 'export',

  // Cada ruta se guarda como /ruta/index.html (más cómodo en cualquier hosting)
  trailingSlash: true,

  // Sin optimización de imágenes, que necesita servidor
  images: { unoptimized: true },

  // React en modo estricto para detectar errores de desarrollo
  reactStrictMode: true,
}

export default nextConfig
