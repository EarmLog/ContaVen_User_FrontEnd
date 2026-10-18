/*
 * (dexieSchema.js)
 * Motor de base de datos local para el navegador (IndexedDB con Dexie).
 *
 * Este motor guarda una copia de trabajo del inventario y las ventas
 * directamente en el navegador del usuario. Así la app puede seguir
 * funcionando cuando no hay internet y sincronizar después.
 *
 * Expone un "motor" con una interfaz fija (las mismas funciones que el
 * motor de SQLite nativo), para que dbAdapter pueda usar cualquiera de
 * los dos sin cambiar el resto de la app.
 */

import Dexie from 'dexie'

// Nombre de la base local en el navegador
const NOMBRE_DB = 'contaven'

/**
 * Estructura de las tablas locales:
 *  - productos: copia del inventario del servidor + productos creados sin conexión
 *  - ventas:    cabecera de cada venta (incluidas las hechas sin conexión)
 *  - detalles:  qué productos lleva cada venta
 *  - cola:      operaciones pendientes de mandar al servidor (offline)
 *  - meta:      valores sueltos (última sincronización, errores, etc.)
 *
 * El índice que va primero es la clave primaria.
 */
const esquema = {
  productos: 'id_local, id_servidor, nombre',
  ventas: 'id_local, id_servidor, fecha, sincronizado',
  detalles: 'id_local, venta_local, producto_local',
  cola: '++id, tipo',
  meta: 'clave',
}

/**
 * Crea (si hace falta) y abre la base de datos local.
 * @returns {Promise<Dexie>}
 */
export function abrirDexie() {
  const db = new Dexie(NOMBRE_DB)
  db.version(1).stores(esquema)
  return db.open().then(() => db)
}

/**
 * Arma el motor de IndexedDB con la interfaz común.
 * @returns {object} - El motor listo para usar por dbAdapter
 */
export async function crearMotorDexie() {
  const db = await abrirDexie()

  return {
    nombre: 'dexie',

    // ---- Productos ----
    leerProductos: () => db.table('productos').toArray(),
    escribirProductos: (filas) =>
      db.table('productos').bulkPut(filas),
    borrarTodosProductos: () => db.table('productos').clear(),
    borrarProducto: (idLocal) => db.table('productos').delete(idLocal),

    // ---- Ventas ----
    leerVentas: () => db.table('ventas').toArray(),
    upsertVenta: (venta) => db.table('ventas').put(venta),

    // ---- Detalles de venta ----
    leerDetalles: () => db.table('detalles').toArray(),
    escribirDetalles: (filas) => db.table('detalles').bulkPut(filas),
    borrarTodosDetalles: () => db.table('detalles').clear(),

    // ---- Cola de sincronización ----
    leerCola: () => db.table('cola').orderBy('id').toArray(),
    encolar: (operacion) => db.table('cola').add(operacion),
    borrarDeCola: (id) => db.table('cola').delete(id),

    // ---- Meta ----
    leerMeta: (clave) => db.table('meta').get(clave),
    escribirMeta: (registro) => db.table('meta').put(registro),

    // ---- Utilidad ----
    cerrar: () => db.close(),
  }
}
