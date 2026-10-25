/*
 * (dbAdapter.js)
 * Capa que decide DÓNDE viven los datos y mantiene todo sincronizado.
 *
 * Idea general (arquitectura híbrida):
 *   - Cada dispositivo guarda su propia copia del inventario y las ventas
 *     en una base local (IndexedDB en el navegador, SQLite en Tauri/Android).
 *   - Cuando hay internet, los cambios se mandan al backend Flask y se baja
 *     la copia del servidor.
 *   - Cuando NO hay internet, los cambios se aplican igual a la base local
 *     y quedan en una "cola" para mandarlos apenas vuelva la conexión.
 *
 * Esto permite seguir vendiendo y editando el inventario aunque se caiga
 * la conexión, que es justo lo que necesita un negocio pequeño.
 *
 * Toda la app habla con este módulo, nunca con la base local ni con la API
 * por separado (salvo configuración y análisis, que necesitan el servidor).
 */

import * as api from '../api'
import { detectarPlataforma } from '../platformDetector'
import { crearMotorDexie } from './dexieSchema'
import { crearMotorSqlite } from './sqliteSchema'

// Motor de base local activo y si ya se inicializó
let motor = null
let iniciado = false
// Promesa de la apertura en curso, para que dos llamadas a la vez no abran
// la base dos veces.
let iniciando = null

// ============================================================
// MOTOR EN MEMORIA (respaldo)
// ============================================================
// Si el navegador bloquea IndexedDB (modo privado de algunos navegadores),
// la app no se rompe: se usa este motor temporal. No persiste al recargar,
// pero al menos el usuario puede trabajar en la sesión.
function crearMotorMemoria() {
  const datos = { productos: [], ventas: [], detalles: [], cola: [], meta: [] }

  return {
    nombre: 'memoria',
    leerProductos: async () => [...datos.productos],
    escribirProductos: async (filas) => {
      for (const fila of filas) {
        const i = datos.productos.findIndex((p) => p.id_local === fila.id_local)
        if (i >= 0) datos.productos[i] = fila
        else datos.productos.push(fila)
      }
    },
    borrarTodosProductos: async () => { datos.productos = [] },
    borrarProducto: async (idLocal) => {
      datos.productos = datos.productos.filter((p) => p.id_local !== idLocal)
    },
    leerVentas: async () => [...datos.ventas],
    upsertVenta: async (venta) => {
      const i = datos.ventas.findIndex((v) => v.id_local === venta.id_local)
      if (i >= 0) datos.ventas[i] = venta
      else datos.ventas.push(venta)
    },
    leerDetalles: async () => [...datos.detalles],
    escribirDetalles: async (filas) => { datos.detalles.push(...filas) },
    borrarTodosDetalles: async () => { datos.detalles = [] },
    leerCola: async () => [...datos.cola],
    encolar: async (operacion) => {
      datos.cola.push({ ...operacion, id: datos.cola.length + 1 })
    },
    borrarDeCola: async (id) => {
      datos.cola = datos.cola.filter((o) => o.id !== id)
    },
    leerMeta: async (clave) => datos.meta.find((m) => m.clave === clave),
    escribirMeta: async (registro) => {
      const i = datos.meta.findIndex((m) => m.clave === registro.clave)
      if (i >= 0) datos.meta[i] = registro
      else datos.meta.push(registro)
    },
    cerrar: async () => {},
  }
}

// ============================================================
// INICIALIZACIÓN
// ============================================================

/**
 * Prepara el motor de datos local según la plataforma.
 * Se llama una sola vez al arrancar la app.
 * @returns {Promise<void>}
 */
export async function iniciarAdaptador() {
  if (iniciado) return
  if (iniciando) return iniciando

  iniciando = (async () => {
    const plataforma = detectarPlataforma()

    try {
      if (plataforma === 'tauri' || plataforma === 'capacitor') {
        motor = await crearMotorSqlite(plataforma)
      } else {
        motor = await crearMotorDexie()
      }
    } catch (error) {
      console.warn(
        'No se pudo abrir la base de datos local; se usa una temporal en memoria.',
        error,
      )
      motor = crearMotorMemoria()
    }

    iniciado = true
  })()

  try {
    await iniciando
  } finally {
    iniciando = null
  }
}

/**
 * Devuelve el motor ya listo, abriéndolo la primera vez si hace falta.
 * Así cada pantalla puede usar el adaptador sin preocuparse por saber
 * si la base local ya se inicializó o todavía no.
 * @returns {Promise<object>}
 */
async function asegurarMotor() {
  if (!iniciado) await iniciarAdaptador()
  return motor
}

// ============================================================
// UTILIDADES
// ============================================================

/** Genera un identificador único para un registro local. */
function nuevoIdLocal() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `local_${Date.now()}_${Math.random().toString(36).slice(2)}`
}

/**
 * Deja solo los campos de negocio de un producto (sin ids ni flags).
 * @param {object} datos
 */
function datosDeProducto(datos) {
  return {
    nombre: datos.nombre || '',
    stock: Number(datos.stock) || 0,
    tipo: datos.tipo || null,
    marca: datos.marca || null,
    variante: datos.variante || null,
    descripcion: datos.descripcion || null,
    sku: datos.sku || null,
    precio_ves: Number(datos.precio_ves) || 0,
    precio_usd: Number(datos.precio_usd) || 0,
    precio_compra_ves: Number(datos.precio_compra_ves) || 0,
    precio_compra_usd: Number(datos.precio_compra_usd) || 0,
    unidades_por_bulto: Number(datos.unidades_por_bulto) || 1,
    cantidad_mayor: Number(datos.cantidad_mayor) || 1,
    precio_mayor_ves: Number(datos.precio_mayor_ves) || 0,
    precio_mayor_usd: Number(datos.precio_mayor_usd) || 0,
    descuento_unidad_porcentaje: Number(datos.descuento_unidad_porcentaje) || 0,
    descuento_unidad_desde: Number(datos.descuento_unidad_desde) || 1,
    descuento_bulto_porcentaje: Number(datos.descuento_bulto_porcentaje) || 0,
  }
}

/**
 * Convierte un producto local al formato que usa la pantalla.
 * Se expone "id" como el identificador local para que los componentes
 * (listas, carrito, edición) no tengan que saber de dónde vino.
 */
function exponerProducto(producto) {
  return { ...producto, id: producto.id_local }
}

/**
 * Crea un producto local a partir de los datos del servidor.
 */
function desdeServidor(productoServidor) {
  return {
    id_local: nuevoIdLocal(),
    id_servidor: productoServidor.id,
    ...datosDeProducto(productoServidor),
    sincronizado: true,
  }
}

/**
 * Revisa si un error es de red (no hay servidor) o de negocio (el server
 * respondió con un error de validación).
 */
function esSinConexion(error) {
  return Boolean(error?.sinConexion)
}

// ============================================================
// PRODUCTOS
// ============================================================

/**
 * Devuelve los productos de la base local, ordenados por nombre.
 * @returns {Promise<object[]>}
 */
export async function cargarProductos() {
  const productos = await (await asegurarMotor()).leerProductos()
  return productos
    .map(exponerProducto)
    .sort((a, b) => a.nombre.localeCompare(b.nombre))
}

/**
 * Crea un producto. Si hay internet lo manda al servidor; si no, lo deja
 * en la base local y en la cola para sincronizarlo después.
 * @param {object} datos
 */
export async function crearProducto(datos) {
  const m = await asegurarMotor()
  const limpios = datosDeProducto(datos)
  const idLocal = nuevoIdLocal()

  try {
    const respuesta = await api.crearProducto(limpios)
    // Se guarda lo que devolvió el servidor, porque ahí ya viene el SKU
    // generado cuando el usuario dejó ese campo vacío.
    const producto = {
      id_local: idLocal,
      id_servidor: respuesta.producto.id,
      ...datosDeProducto(respuesta.producto),
      sincronizado: true,
    }
    await m.escribirProductos([producto])
    return { producto: exponerProducto(producto), sincronizado: true }
  } catch (error) {
    // Un error de negocio (validación del servidor) se devuelve tal cual
    if (!esSinConexion(error)) throw error

    // Sin conexión: se guarda local y se encola
    const producto = { id_local: idLocal, id_servidor: null, ...limpios, sincronizado: false }
    await m.escribirProductos([producto])
    await m.encolar({ tipo: 'producto_crear', id_local: idLocal, datos: limpios })
    return { producto: exponerProducto(producto), sincronizado: false }
  }
}

/**
 * Edita un producto existente.
 * @param {string} idLocal
 * @param {object} datos
 */
export async function editarProducto(idLocal, datos) {
  const m = await asegurarMotor()
  const productos = await m.leerProductos()
  const actual = productos.find((p) => p.id_local === idLocal)

  if (!actual) throw new Error('Ese producto no existe en la base local.')

  const limpios = datosDeProducto(datos)

  // Si el producto ya existe en el servidor se intenta editar allá primero
  if (actual.id_servidor) {
    try {
      const respuesta = await api.editarProducto(actual.id_servidor, limpios)
      // Igual que al crear: se toma el SKU que calculó el servidor
      const actualizado = {
        ...actual,
        ...datosDeProducto(respuesta?.producto || limpios),
        sincronizado: true,
      }
      await m.escribirProductos([actualizado])
      return { producto: exponerProducto(actualizado), sincronizado: true }
    } catch (error) {
      if (!esSinConexion(error)) throw error
    }
  }

  // Sin conexión (o producto todavía no sincronizado): se guarda local
  const actualizado = { ...actual, ...limpios, sincronizado: false }
  await m.escribirProductos([actualizado])

  // Si el producto todavía está esperando a crearse, se actualiza el
  // "crear" que está en la cola en vez de encolar un "editar" aparte.
  const cola = await m.leerCola()
  const creacionPendiente = cola.find(
    (op) => op.tipo === 'producto_crear' && op.id_local === idLocal,
  )

  if (creacionPendiente) {
    await m.borrarDeCola(creacionPendiente.id)
    await m.encolar({ tipo: 'producto_crear', id_local: idLocal, datos: limpios })
  } else {
    await m.encolar({ tipo: 'producto_editar', id_local: idLocal, datos: limpios })
  }

  return { producto: exponerProducto(actualizado), sincronizado: false }
}

/**
 * Elimina un producto del inventario.
 * @param {string} idLocal
 */
export async function eliminarProducto(idLocal) {
  const m = await asegurarMotor()
  const productos = await m.leerProductos()
  const actual = productos.find((p) => p.id_local === idLocal)

  if (!actual) return

  // Si ya existe en el servidor, se intenta borrar allá primero
  if (actual.id_servidor) {
    try {
      await api.eliminarProducto(actual.id_servidor)
      await m.borrarProducto(idLocal)
      await quitarDeCola(m, (op) => op.id_local === idLocal)
      return { sincronizado: true }
    } catch (error) {
      if (!esSinConexion(error)) throw error
    }
    await m.borrarProducto(idLocal)
    await m.encolar({
      tipo: 'producto_eliminar',
      id_local: idLocal,
      id_servidor: actual.id_servidor,
    })
    return { sincronizado: false }
  }

  // Producto local que nunca llegó al servidor: solo se descarta
  await m.borrarProducto(idLocal)
  await quitarDeCola(m, (op) => op.id_local === idLocal)
  return { sincronizado: true }
}

/** Borra de la cola todas las operaciones que cumplan un filtro. */
async function quitarDeCola(m, filtro) {
  const cola = await m.leerCola()
  for (const op of cola) {
    if (filtro(op)) await m.borrarDeCola(op.id)
  }
}

// ============================================================
// VENTAS
// ============================================================

/**
 * Calcula el precio de una línea del carrito, aplicando el precio al mayor
 * cuando corresponde.
 * @param {object} producto
 * @param {number} unidades
 * @param {boolean} esMayor - Si el cajero pidió cobrar al mayor
 */
export function calcularLinea(producto, unidades, esMayor) {
  const ofreceMayor =
    Number(producto.precio_mayor_ves) > 0 || Number(producto.precio_mayor_usd) > 0
  const cantidadMayor = Number(producto.cantidad_mayor) || 1

  const usaMayor = Boolean(esMayor) && ofreceMayor && unidades >= cantidadMayor

  let precioVes = usaMayor ? Number(producto.precio_mayor_ves) : Number(producto.precio_ves)
  let precioUsd = usaMayor ? Number(producto.precio_mayor_usd) : Number(producto.precio_usd)

  // Descuento por cantidad:
  //  - por unidad: aplica desde "descuento_unidad_desde" unidades
  //  - por bulto:  aplica al llevar el bulto completo
  // Si los dos aplican, se usa el mayor (no se suman).
  const unidadesBulto = Number(producto.unidades_por_bulto) || 1
  const descuentoUnidad = Number(producto.descuento_unidad_porcentaje) || 0
  const descuentoUnidadDesde = Number(producto.descuento_unidad_desde) || 1
  const descuentoBulto = Number(producto.descuento_bulto_porcentaje) || 0

  let descuentoPorcentaje = 0
  if (descuentoUnidad > 0 && unidades >= descuentoUnidadDesde) {
    descuentoPorcentaje = Math.max(descuentoPorcentaje, descuentoUnidad)
  }
  if (descuentoBulto > 0 && unidadesBulto > 1 && unidades >= unidadesBulto) {
    descuentoPorcentaje = Math.max(descuentoPorcentaje, descuentoBulto)
  }

  if (descuentoPorcentaje > 0) {
    const factor = 1 - descuentoPorcentaje / 100
    precioVes = Math.round(precioVes * factor * 100) / 100
    precioUsd = Math.round(precioUsd * factor * 100) / 100
  }

  return {
    esMayor: usaMayor,
    descuentoPorcentaje,
    precioUnitarioVes: precioVes,
    precioUnitarioUsd: precioUsd,
    subtotalVes: Math.round(precioVes * unidades * 100) / 100,
    subtotalUsd: Math.round(precioUsd * unidades * 100) / 100,
  }
}

/**
 * Registra una venta. Con internet la manda al servidor (que descuenta el
 * stock); sin internet la guarda local y descuenta el stock local.
 * @param {object} datos - { items: [{id, unidades, es_mayor}], metodo_pago }
 */
export async function registrarVenta({ items, metodo_pago }) {
  const m = await asegurarMotor()
  const productos = await m.leerProductos()

  // Se busca cada producto del carrito en la base local
  const lineas = items.map((item) => {
    const producto = productos.find((p) => p.id_local === item.id)
    if (!producto) throw new Error('Uno de los productos ya no existe en el inventario.')
    return { producto, unidades: Number(item.unidades), es_mayor: Boolean(item.es_mayor) }
  })

  // Se revisa el stock disponible de cada línea
  for (const linea of lineas) {
    if (linea.unidades <= 0) throw new Error('Las unidades deben ser mayores a cero.')
    if (linea.producto.stock < linea.unidades) {
      throw new Error(
        `No hay stock suficiente de «${linea.producto.nombre}». ` +
          `Disponible: ${linea.producto.stock}.`,
      )
    }
  }

  // Todos los productos tienen id de servidor y hay internet: camino normal
  const todosConServidor = lineas.every((l) => l.producto.id_servidor)

  if (todosConServidor) {
    try {
      const respuesta = await api.registrarVenta({
        productos: lineas.map((l) => ({
          producto_id: l.producto.id_servidor,
          unidades: l.unidades,
          es_mayor: l.es_mayor,
        })),
        metodo_pago,
      })
      await aplicarVentaLocal(m, lineas, metodo_pago, respuesta.venta, true)
      return { venta: respuesta.venta, sincronizada: true }
    } catch (error) {
      if (!esSinConexion(error)) throw error
    }
  }

  // Sin conexión (o con productos locales sin subir): la venta queda local
  const venta = await aplicarVentaLocal(m, lineas, metodo_pago, null, false)
  await m.encolar({
    tipo: 'venta',
    id_local: venta.id_local,
    datos: {
      items: lineas.map((l) => ({
        id_local: l.producto.id_local,
        unidades: l.unidades,
        es_mayor: l.es_mayor,
      })),
      metodo_pago,
    },
  })
  return { venta, sincronizada: false }
}

/**
 * Guarda una venta en la base local y descuenta el stock local.
 * @param {object} m - El motor
 * @param {object[]} lineas - [ { producto, unidades, es_mayor } ]
 * @param {string} metodoPago
 * @param {object|null} ventaServidor - La venta que devolvió el servidor
 * @param {boolean} sincronizada
 */
async function aplicarVentaLocal(m, lineas, metodoPago, ventaServidor, sincronizada) {
  const idLocal = ventaServidor ? `srv_${ventaServidor.id}` : nuevoIdLocal()
  const hora = new Date()
  const fecha = hora.toISOString().slice(0, 10)
  const horaTexto = hora.toTimeString().slice(0, 8)

  let totalVes = 0
  let totalUsd = 0
  let gananciaVes = 0
  let gananciaUsd = 0

  const detalles = []

  for (const linea of lineas) {
    const calculo = calcularLinea(linea.producto, linea.unidades, linea.es_mayor)

    const costoVes = Number(linea.producto.precio_compra_ves) || 0
    const costoUsd = Number(linea.producto.precio_compra_usd) || 0

    const gananciaLineaVes =
      Math.round((calculo.precioUnitarioVes - costoVes) * linea.unidades * 100) / 100
    const gananciaLineaUsd =
      Math.round((calculo.precioUnitarioUsd - costoUsd) * linea.unidades * 100) / 100

    totalVes += calculo.subtotalVes
    totalUsd += calculo.subtotalUsd
    gananciaVes += gananciaLineaVes
    gananciaUsd += gananciaLineaUsd

    detalles.push({
      id_local: nuevoIdLocal(),
      venta_local: idLocal,
      producto_local: linea.producto.id_local,
      producto_nombre: linea.producto.nombre,
      unidades: linea.unidades,
      precio_unitario_ves: calculo.precioUnitarioVes,
      precio_unitario_usd: calculo.precioUnitarioUsd,
      costo_unitario_ves: costoVes,
      costo_unitario_usd: costoUsd,
      subtotal_ves: calculo.subtotalVes,
      subtotal_usd: calculo.subtotalUsd,
      ganancia_ves: gananciaLineaVes,
      ganancia_usd: gananciaLineaUsd,
      es_mayor: calculo.esMayor,
      unidades_por_bulto: linea.producto.unidades_por_bulto || 1,
      descuento_porcentaje: calculo.descuentoPorcentaje,
    })

    // Se descuenta el stock en la base local
    await m.escribirProductos([
      { ...linea.producto, stock: linea.producto.stock - linea.unidades },
    ])
  }

  const venta = {
    id_local: idLocal,
    id_servidor: ventaServidor ? ventaServidor.id : null,
    fecha,
    hora: horaTexto,
    metodo_pago: metodoPago,
    total_ves: Math.round(totalVes * 100) / 100,
    total_usd: Math.round(totalUsd * 100) / 100,
    ganancia_ves: Math.round(gananciaVes * 100) / 100,
    ganancia_usd: Math.round(gananciaUsd * 100) / 100,
    sincronizado: sincronizada,
  }

  await m.upsertVenta(venta)
  await m.escribirDetalles(detalles)

  return venta
}

/**
 * Calcula el resumen del día con los datos locales (para cuando no hay
 * internet y la pantalla de Inicio no puede pedir el resumen al servidor).
 * @returns {Promise<object>}
 */
export async function resumenHoyLocal() {
  const m = await asegurarMotor()
  const [ventas, detalles] = await Promise.all([m.leerVentas(), m.leerDetalles()])
  const hoy = new Date().toISOString().slice(0, 10)

  const ventasHoy = ventas.filter((v) => v.fecha === hoy)
  const idsHoy = new Set(ventasHoy.map((v) => v.id_local))

  const totales = ventasHoy.reduce(
    (acumulado, venta) => ({
      ventas: acumulado.ventas + 1,
      ingresos_ves: acumulado.ingresos_ves + Number(venta.total_ves),
      ingresos_usd: acumulado.ingresos_usd + Number(venta.total_usd),
      ganancia_ves: acumulado.ganancia_ves + Number(venta.ganancia_ves),
      ganancia_usd: acumulado.ganancia_usd + Number(venta.ganancia_usd),
    }),
    { ventas: 0, ingresos_ves: 0, ingresos_usd: 0, ganancia_ves: 0, ganancia_usd: 0 },
  )

  const productos = detalles.filter((d) => idsHoy.has(d.venta_local))

  return { totales, productos }
}

// ============================================================
// SINCRONIZACIÓN
// ============================================================

/** Cuenta las operaciones que están esperando para subir al servidor. */
export async function contarPendientes() {
  const cola = await (await asegurarMotor()).leerCola()
  return cola.length
}

/**
 * Sube al servidor todo lo que quedó en la cola y luego baja el inventario
 * actualizado. Si algo falla por falta de internet se detiene y se
 * reintenta en la próxima oportunidad.
 * @returns {Promise<{subidas:number, productos:number}>}
 */
export async function sincronizar() {
  const m = await asegurarMotor()
  const cola = await m.leerCola()
  let subidas = 0

  for (const operacion of cola) {
    try {
      await procesarOperacion(m, operacion)
      await m.borrarDeCola(operacion.id)
      subidas += 1
    } catch (error) {
      if (esSinConexion(error)) {
        // Sin internet: se corta y se reintenta después
        throw error
      }
      // Error de negocio (el servidor rechazó la operación): se descarta
      // para no quedar en un ciclo infinito, dejando constancia del error.
      await m.escribirMeta({
        clave: 'errores_sync',
        datos: {
          operacion: operacion.tipo,
          mensaje: error.message,
          cuando: new Date().toISOString(),
        },
      })
      await m.borrarDeCola(operacion.id)
    }
  }

  const productos = await bajarProductos(m)
  return { subidas, productos }
}

/**
 * Ejecuta una operación de la cola contra el servidor.
 * @param {object} m - El motor
 * @param {object} operacion
 */
async function procesarOperacion(m, operacion) {
  if (operacion.tipo === 'producto_crear') {
    const respuesta = await api.crearProducto(operacion.datos)
    const productos = await m.leerProductos()
    const local = productos.find((p) => p.id_local === operacion.id_local)

    if (local) {
      await m.escribirProductos([
        { ...local, id_servidor: respuesta.producto.id, sincronizado: true },
      ])
    }
    return
  }

  if (operacion.tipo === 'producto_editar') {
    const productos = await m.leerProductos()
    const local = productos.find((p) => p.id_local === operacion.id_local)

    if (local?.id_servidor) {
      await api.editarProducto(local.id_servidor, operacion.datos)
      await m.escribirProductos([{ ...local, sincronizado: true }])
    }
    return
  }

  if (operacion.tipo === 'producto_eliminar') {
    if (operacion.id_servidor) await api.eliminarProducto(operacion.id_servidor)
    await m.borrarProducto(operacion.id_local)
    return
  }

  if (operacion.tipo === 'venta') {
    const productos = await m.leerProductos()

    // Se traduce cada línea local a su id de servidor
    const itemsServidor = operacion.datos.items.map((item) => {
      const producto = productos.find((p) => p.id_local === item.id_local)
      if (!producto?.id_servidor) {
        throw new Error('No se pudo sincronizar una venta con un producto sin subir.')
      }
      return {
        producto_id: producto.id_servidor,
        unidades: item.unidades,
        es_mayor: item.es_mayor,
      }
    })

    const respuesta = await api.registrarVenta({
      productos: itemsServidor,
      metodo_pago: operacion.datos.metodo_pago,
    })

    const ventas = await m.leerVentas()
    const ventaLocal = ventas.find((v) => v.id_local === operacion.id_local)

    if (ventaLocal) {
      await m.upsertVenta({
        ...ventaLocal,
        id_servidor: respuesta.venta.id,
        sincronizado: true,
      })
    }
  }
}

/**
 * Baja el inventario del servidor a la base local.
 *
 * Regla de combinación:
 *   - Lo que ya existe localmente se actualiza con los datos del servidor.
 *   - Lo que solo está en el servidor se agrega.
 *   - Lo que solo está localmente y no tiene operación pendiente se borra
 *     (quiere decir que se borró desde otro dispositivo).
 *   - Lo que está local sin subir (pendiente en la cola) se conserva.
 * @param {object} m - El motor
 * @returns {Promise<number>} - Cuántos productos quedaron
 */
async function bajarProductos(m) {
  const respuesta = await api.listarProductos()
  const delServidor = respuesta.productos || []
  const locales = await m.leerProductos()
  const cola = await m.leerCola()

  const idsPendientes = new Set(cola.map((op) => op.id_local))
  const idsServidor = new Set(delServidor.map((p) => p.id))

  const resultado = []

  // Productos del servidor
  for (const producto of delServidor) {
    const local = locales.find((p) => p.id_servidor === producto.id)

    if (local) {
      resultado.push({
        ...local,
        ...datosDeProducto(producto),
        id_servidor: producto.id,
        sincronizado: true,
      })
    } else {
      resultado.push(desdeServidor(producto))
    }
  }

  // Productos locales que todavía no han subido (se conservan)
  for (const local of locales) {
    if (!local.id_servidor && idsPendientes.has(local.id_local)) {
      resultado.push(local)
    } else if (local.id_servidor && !idsServidor.has(local.id_servidor)) {
      // Estaba sincronizado pero ya no está en el servidor: se borró afuera.
      // Solo se conserva si tiene una operación pendiente.
      if (idsPendientes.has(local.id_local)) resultado.push(local)
    }
  }

  await m.borrarTodosProductos()
  await m.escribirProductos(resultado)
  await m.escribirMeta({ clave: 'ultima_sync', datos: new Date().toISOString() })

  return resultado.length
}

/**
 * Sincroniza sin lanzar errores: útil para llamar al arrancar la app o
 * cuando vuelve la conexión, sin que un fallo rompa la pantalla.
 * @returns {Promise<{subidas:number, productos:number}|null>}
 */
export async function sincronizarEnSilencio() {
  try {
    return await sincronizar()
  } catch {
    return null
  }
}
