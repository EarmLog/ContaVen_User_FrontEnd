/*
 * (platformDetector.js)
 * Detecta en qué plataforma está corriendo la app.
 *
 * ContaVen funciona en tres sitios:
 *   - Navegador (web)     -> los datos locales viven en IndexedDB (Dexie)
 *   - Tauri (escritorio)  -> los datos locales viven en SQLite
 *   - Capacitor (Android) -> los datos locales viven en SQLite
 *
 * Con esto el dbAdapter sabe qué motor de base de datos local usar.
 */

/**
 * Devuelve la plataforma actual: 'tauri', 'capacitor' o 'web'.
 * @returns {'tauri'|'capacitor'|'web'}
 */
export function detectarPlataforma() {
  // Durante el build estático no existe window
  if (typeof window === 'undefined') return 'web'

  // Tauri deja un objeto global cuando la app corre dentro de su WebView
  if (window.__TAURI_INTERNALS__ || window.__TAURI__) return 'tauri'

  // Capacitor se identifica con su propio objeto global
  if (window.Capacitor?.isNativePlatform?.()) return 'capacitor'

  return 'web'
}

/**
 * Devuelve true si la app está corriendo de forma nativa (Tauri o Capacitor).
 * @returns {boolean}
 */
export function esNativo() {
  const plataforma = detectarPlataforma()
  return plataforma === 'tauri' || plataforma === 'capacitor'
}

/**
 * Devuelve true si la app corre en el navegador.
 * @returns {boolean}
 */
export function esWeb() {
  return detectarPlataforma() === 'web'
}
