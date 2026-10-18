/*
 * (postcss.config.mjs)
 * Tailwind CSS v4 se usa como plugin de PostCSS.
 * Ya no hace falta un tailwind.config.js: los colores y utilidades
 * se definen dentro de src/styles/globals.css.
 */

export default {
  plugins: {
    '@tailwindcss/postcss': {},
  },
}
