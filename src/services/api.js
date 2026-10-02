/*
 * (api.js)
 * Cliente de la API del backend Flask de usuarios.
 *
 * Aquí se centralizan todas las llamadas al servidor para no repetir
 * la dirección ni el token en cada pantalla. Si el usuario está
 * bloqueado, la app lo manda directo a la pantalla de acceso bloqueado.
 */

import supabase from './supabase'

// Dirección del backend Flask, tomada del archivo .env
const URL_API = import.meta.env.VITE_URL_API || 'http://localhost:5001'

/**
 * Devuelve el token de sesión del usuario que está logueado en Supabase.
 * Se usa para enviarlo en cada llamada a la API.
 */
export async function obtenerToken() {
  // Se le pregunta a Supabase si hay una sesión activa
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token || null
}

/**
 * Hace una llamada a la API del backend.
 * @param {string} ruta   - Ejemplo: "/productos"
 * @param {object} opciones - { metodo, cuerpo }
 * @returns {object} - La respuesta en JSON
 */
async function llamarApi(ruta, opciones = {}) {
  // Se consigue el token del usuario
  const token = await obtenerToken()

  // Se arma la petición con el token en la cabecera
  const respuesta = await fetch(`${URL_API}/api${ruta}`, {
    method: opciones.metodo || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(opciones.cuerpo ? { body: JSON.stringify(opciones.cuerpo) } : {}),
  })

  // Se lee la respuesta
  const datos = await respuesta.json().catch(() => ({}))

  // Si el backend devuelve un error, se lanza para que la pantalla lo muestre
  if (!respuesta.ok) {
    // Si el error es 403 y dice bloqueado, se avisa para sacarlo de la app
    if (respuesta.status === 403 && datos.bloqueado) {
      throw new Error(datos.error)
    }

    const error = new Error(datos.error || 'Ocurrió un error. Intenta de nuevo.')
    error.codigo = respuesta.status
    throw error
  }

  return datos
}

// ============================================================
// AUTENTICACIÓN
// ============================================================

/**
 * Registra un usuario nuevo.
 * El backend lo crea en Supabase y le da los 30 días de licencia.
 */
export function registrar(datos) {
  return llamarApi('/auth/registro', { metodo: 'POST', cuerpo: datos })
}

/**
 * Inicia sesión con Supabase usando correo y contraseña.
 * Esta llamada la hace Supabase directamente, no pasa por el backend.
 */
export async function iniciarSesion(correo, contrasena) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: correo,
    password: contrasena,
  })

  // Si Supabase devuelve un error se lanza con el mensaje en español
  if (error) {
    if (error.message.toLowerCase().includes('invalid login')) {
      throw new Error('Correo o contraseña incorrectos.')
    }
    throw new Error(error.message)
  }

  return data
}

/**
 * Cierra la sesión del usuario.
 */
export function cerrarSesion() {
  return supabase.auth.signOut()
}

/**
 * Trae los datos del usuario y su licencia del backend.
 */
export function obtenerMiPerfil() {
  return llamarApi('/auth/yo')
}

// ============================================================
// INVENTARIO
// ============================================================

/** Trae todos los productos del inventario. */
export function listarProductos() {
  return llamarApi('/productos')
}

/** Crea un producto nuevo. */
export function crearProducto(datos) {
  return llamarApi('/productos', { metodo: 'POST', cuerpo: datos })
}

/** Edita un producto que ya existe. */
export function editarProducto(id, datos) {
  return llamarApi(`/productos/${id}`, { metodo: 'PUT', cuerpo: datos })
}

/** Elimina un producto del inventario. */
export function eliminarProducto(id) {
  return llamarApi(`/productos/${id}`, { metodo: 'DELETE' })
}

// ============================================================
// PUNTO DE VENTA (POS)
// ============================================================

/** Registra una venta y descuenta el stock. */
export function registrarVenta(datos) {
  return llamarApi('/ventas', { metodo: 'POST', cuerpo: datos })
}

/** Lista las ventas con filtros opcionales de fecha y hora. */
export function listarVentas(filtros = {}) {
  // Se arma la parte de la URL con los filtros que se reciben
  const parametros = new URLSearchParams()

  for (const [clave, valor] of Object.entries(filtros)) {
    if (valor) parametros.append(clave, valor)
  }

  const consulta = parametros.toString()
  return llamarApi(`/ventas${consulta ? `?${consulta}` : ''}`)
}

// ============================================================
// ANÁLISIS Y REPORTES
// ============================================================

/** Trae todos los datos del reporte con los filtros aplicados. */
export function obtenerResumen(filtros = {}) {
  const parametros = new URLSearchParams()

  for (const [clave, valor] of Object.entries(filtros)) {
    if (valor) parametros.append(clave, valor)
  }

  const consulta = parametros.toString()
  return llamarApi(`/analisis/resumen${consulta ? `?${consulta}` : ''}`)
}

/** Trae lo que se vendió en el día de hoy. */
export function obtenerVentasDelDia() {
  return llamarApi('/analisis/dia')
}

// ============================================================
// CONFIGURACIÓN
// ============================================================

/** Lee los ajustes guardados (tema, actualización automática, etc.). */
export function leerConfiguracion() {
  return llamarApi('/configuracion')
}

/** Guarda los ajustes del usuario. */
export function guardarConfiguracion(datos) {
  return llamarApi('/configuracion', { metodo: 'PUT', cuerpo: datos })
}

/** Trae el precio actual del dólar. */
export function leerDolar() {
  return llamarApi('/dolar')
}

/** Guarda el precio del dólar a mano. */
export function guardarDolar(precioVes) {
  return llamarApi('/dolar', { metodo: 'PUT', cuerpo: { precio_ves: precioVes } })
}

/** Pide la tasa del dólar por internet (si está activado el automático). */
export function actualizarDolar() {
  return llamarApi('/dolar/actualizar', { metodo: 'POST' })
}

/**
 * Convierte un monto entre USD y VES en cualquier sentido.
 * @param {object} datos - { valor, origen, destino, desdeApi }
 */
export function convertirMonto({ valor, origen, destino, desdeApi = false }) {
  return llamarApi('/dolar/convertir', {
    metodo: 'POST',
    cuerpo: { valor, origen, destino, desde_api: desdeApi ? '1' : '0' },
  })
}

// ============================================================
// GOOGLE DRIVE
// ============================================================

/** Revisa si la copia de seguridad en Drive está disponible. */
export function estadoDrive() {
  return llamarApi('/drive/estado')
}

/** Crea una copia de seguridad en la carpeta del usuario en Drive. */
export function crearCopiaDrive() {
  return llamarApi('/drive/copia', { metodo: 'POST' })
}

/** Devuelve la URL para autorizar a Google Drive. */
export function conectarDrive() {
  return llamarApi('/drive/conectar')
}
