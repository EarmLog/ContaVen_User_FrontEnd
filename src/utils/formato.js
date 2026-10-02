/*
 * (formato.js)
 * Funciones pequeñas para dar formato a los números y las fechas
 * que se muestran en pantalla.
 */

/**
 * Muestra un monto en bolívares con el estilo venezuelano.
 * Ejemplo: 1234.5 -> "1.234,50"
 * @param {number} monto
 * @returns {string}
 */
export function formatearVes(monto) {
  return new Intl.NumberFormat('es-VE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(monto) || 0)
}

/**
 * Muestra un monto en dólares.
 * Ejemplo: 12.5 -> "$12.50"
 * @param {number} monto
 * @returns {string}
 */
export function formatearUsd(monto) {
  return `$${new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(monto) || 0)}`
}

/**
 * Pone el prefijo "Bs." a un monto en bolívares.
 * @param {number} monto
 * @returns {string}
 */
export function precioVes(monto) {
  return `Bs. ${formatearVes(monto)}`
}

/**
 * Pone el prefijo "$" a un monto en dólares.
 * @param {number} monto
 * @returns {string}
 */
export function precioUsd(monto) {
  return formatearUsd(monto)
}

/**
 * Convierte una fecha ISO de Supabase a formato AAAA-MM-DD.
 * @param {string} fechaIso
 * @returns {string}
 */
export function aFechaIso(fechaIso) {
  if (!fechaIso) return ''

  // Si ya viene en formato AAAA-MM-DD se devuelve tal cual
  if (/^\d{4}-\d{2}-\d{2}$/.test(fechaIso)) return fechaIso

  return new Date(fechaIso).toISOString().slice(0, 10)
}

/**
 * Muestra una fecha de forma legible: "1 de octubre de 2026".
 * @param {string} fechaIso
 * @returns {string}
 */
export function fechaLegible(fechaIso) {
  if (!fechaIso) return '—'

  return new Date(fechaIso).toLocaleDateString('es-VE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

/**
 * Devuelve la fecha de hoy en formato AAAA-MM-DD.
 * @returns {string}
 */
export function fechaDeHoy() {
  const hoy = new Date()
  const mes = String(hoy.getMonth() + 1).padStart(2, '0')
  const dia = String(hoy.getDate()).padStart(2, '0')
  return `${hoy.getFullYear()}-${mes}-${dia}`
}

/**
 * Devuelve la fecha de hoy menos cierta cantidad de días.
 * Se usa para poner la fecha inicial del filtro de reportes.
 * @param {number} dias
 * @returns {string}
 */
export function fechaHaceDias(dias) {
  const fecha = new Date()
  fecha.setDate(fecha.getDate() - dias)
  const mes = String(fecha.getMonth() + 1).padStart(2, '0')
  const dia = String(fecha.getDate()).padStart(2, '0')
  return `${fecha.getFullYear()}-${mes}-${dia}`
}

/**
 * Redondea un número a dos decimales.
 * @param {number} numero
 * @returns {number}
 */
export function redondear(numero) {
  return Math.round((Number(numero) || 0) * 100) / 100
}

/**
 * Convierte un precio en VES a USD usando la tasa del dólar.
 * @param {number} montoVes
 * @param {number} tasa - Tasa del dólar (VES por 1 USD)
 * @returns {number}
 */
export function vesAUsd(montoVes, tasa) {
  if (!tasa || tasa <= 0) return 0
  return redondear(montoVes / tasa)
}

/**
 * Convierte un precio en USD a VES usando la tasa del dólar.
 * @param {number} montoUsd
 * @param {number} tasa - Tasa del dólar (VES por 1 USD)
 * @returns {number}
 */
export function usdAVes(montoUsd, tasa) {
  if (!tasa || tasa <= 0) return 0
  return redondear(montoUsd * tasa)
}
