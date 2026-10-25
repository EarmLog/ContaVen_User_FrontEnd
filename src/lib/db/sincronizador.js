/*
 * (sincronizador.js)
 * Vigila la conexión y manda al servidor lo que quedó pendiente.
 *
 * Se encarga de dos cosas:
 *   1. Cuando el navegador avisa que volvió el internet, sincroniza.
 *   2. Cada cierto tiempo (por si acaso) vuelve a intentar.
 *
 * No sabe nada de pantallas: solo llama a dbAdapter y avisa por medio de
 * una función de "onCambio" para que la interfaz se entere de que hubo
 * datos nuevos o de que ya no hay pendientes.
 */

import { haySesion } from '../api'
import { contarPendientes, sincronizarEnSilencio } from './dbAdapter'

// Cada cuánto se reintenta sola la sincronización (en milisegundos)
const INTERVALO_MS = 60_000

// Referencias a los temporizadores para poder apagarlos
let temporizador = null
let manejadorOnline = null
let funcionAviso = null

/**
 * Avisa a quien esté escuchando cuántos pendientes quedan.
 * @param {number} pendientes
 */
async function avisar(pendientes) {
  if (!funcionAviso) return

  try {
    funcionAviso(pendientes)
  } catch {
    // Si el que escucha falla no es problema del sincronizador
  }
}

/**
 * Intenta sincronizar y avisa del resultado.
 */
async function intentarSincronizar() {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    await avisar(await contarPendientes())
    return
  }

  // Sin sesión no hay nada que sincronizar (y el servidor respondería 401)
  if (!(await haySesion())) return

  const resultado = await sincronizarEnSilencio()
  if (resultado) await avisar(await contarPendientes())
}

/**
 * Enciende el sincronizador.
 * @param {function(number):void} [onCambio] - Se llama con los pendientes
 * @returns {function()} - Función para apagarlo
 */
export function iniciarSincronizador(onCambio) {
  if (typeof window === 'undefined') return () => {}

  funcionAviso = onCambio || null

  // Se intenta una vez al arrancar. Si no hay sesión (por ejemplo, en el
  // login) la función lo detecta y no llama a la API.
  intentarSincronizar()

  // Cuando vuelve el internet se intenta de inmediato
  manejadorOnline = () => intentarSincronizar()
  window.addEventListener('online', manejadorOnline)

  // Y cada minuto, por si acaso
  temporizador = setInterval(intentarSincronizar, INTERVALO_MS)

  return () => {
    if (manejadorOnline) window.removeEventListener('online', manejadorOnline)
    if (temporizador) clearInterval(temporizador)
    manejadorOnline = null
    temporizador = null
    funcionAviso = null
  }
}

/**
 * Fuerza una sincronización inmediata (por ejemplo, tras guardar algo).
 */
export function sincronizarAhora() {
  return intentarSincronizar()
}
