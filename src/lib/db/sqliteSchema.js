/*
 * (sqliteSchema.js)
 * Motor de base de datos local para las apps nativas.
 *
 * Se usa SQLite tanto en Tauri (escritorio) como en Capacitor (Android).
 * Cada motor se carga de forma dinámica y solo cuando la plataforma es
 * la correcta, así el build del sitio web no arrastra código nativo.
 *
 * Para no repetir el esquema en cada motor, las filas se guardan como
 * JSON dentro de dos tablas genéricas:
 *   - registros (tabla, clave, datos): productos, ventas, detalles y meta
 *   - cola      (id, datos):           operaciones pendientes de sincronizar
 *
 * Esto es suficiente porque la app lee toda la tabla y filtra en memoria.
 */

// Nombre del archivo SQLite local
const NOMBRE_DB = 'contaven.db'

// Tablas "lógicas" que viven dentro de la tabla genérica "registros"
const TABLAS_LOGICAS = ['productos', 'ventas', 'detalles', 'meta']

/**
 * Lanza el motor de SQLite del WebView de Tauri.
 * @returns {Promise<object>} - Un objeto con ejecutar/consultar
 */
async function abrirTauri() {
  // Se pide el módulo en tiempo de ejecución. webpackIgnore evita que el
  // compilador del sitio web intente empaquetar un paquete que solo existe
  // en la app nativa.
  const ruta = '@tauri-apps/' + 'plugin-sql'
  const modulo = await import(/* webpackIgnore: true */ ruta)
  const Database = modulo.default

  const conexion = await Database.load(`sqlite:${NOMBRE_DB}`)

  return {
    ejecutar: (sql, valores = []) => conexion.execute(sql, valores),
    consultar: (sql, valores = []) => conexion.select(sql, valores),
  }
}

/**
 * Lanza el motor de SQLite de Capacitor (Android).
 * @returns {Promise<object>} - Un objeto con ejecutar/consultar
 */
async function abrirCapacitor() {
  const ruta = '@capacitor-community/' + 'sqlite'
  const modulo = await import(/* webpackIgnore: true */ ruta)
  const { CapacitorSQLite, SQLiteConnection } = modulo

  const conexionSqlite = new SQLiteConnection(CapacitorSQLite)
  const conexion = await conexionSqlite.createConnection(
    'contaven',
    false,
    'no-encryption',
    1,
    false,
  )
  await conexion.open()

  // Capacitor devuelve { values: [...] } y a veces wantsTransaction; se
  // normaliza para que el resto del motor vea siempre un arreglo de filas.
  return {
    ejecutar: (sql, valores = []) => conexion.run(sql, valores),
    consultar: async (sql, valores = []) => {
      const resultado = await conexion.query(sql, valores)
      return resultado.values || []
    },
  }
}

/**
 * Crea las tablas genéricas si todavía no existen.
 * @param {object} conexion - { ejecutar, consultar }
 */
async function prepararTablas(conexion) {
  await conexion.ejecutar(`
    CREATE TABLE IF NOT EXISTS registros (
      tabla TEXT NOT NULL,
      clave TEXT NOT NULL,
      datos TEXT NOT NULL,
      PRIMARY KEY (tabla, clave)
    )
  `)

  await conexion.ejecutar(`
    CREATE TABLE IF NOT EXISTS cola (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      datos TEXT NOT NULL
    )
  `)

  // Un renglón por tabla lógica, para que el motor sepa que ya está lista
  for (const tabla of TABLAS_LOGICAS) {
    // No se hace nada; las tablas lógicas son solo etiquetas en "registros"
    void tabla
  }
}

/**
 * Arma el motor de SQLite (Tauri o Capacitor) con la interfaz común.
 * @param {'tauri'|'capacitor'} plataforma
 * @returns {Promise<object>} - El motor listo para usar por dbAdapter
 */
export async function crearMotorSqlite(plataforma) {
  const conexion = plataforma === 'tauri' ? await abrirTauri() : await abrirCapacitor()
  await prepararTablas(conexion)

  /**
   * Lee todos los renglones de una tabla lógica.
   * @param {string} tabla
   */
  async function leerTodo(tabla) {
    const filas = await conexion.consultar(
      'SELECT clave, datos FROM registros WHERE tabla = ?',
      [tabla],
    )
    return filas.map((fila) => JSON.parse(fila.datos))
  }

  /**
   * Guarda (o reemplaza) un renglón por su clave.
   * @param {string} tabla
   * @param {string} clave
   * @param {object} datos
   */
  async function guardarUno(tabla, clave, datos) {
    await conexion.ejecutar(
      'INSERT OR REPLACE INTO registros (tabla, clave, datos) VALUES (?, ?, ?)',
      [tabla, String(clave), JSON.stringify(datos)],
    )
  }

  return {
    nombre: `sqlite-${plataforma}`,

    // ---- Productos ----
    leerProductos: () => leerTodo('productos'),
    escribirProductos: async (filas) => {
      for (const fila of filas) await guardarUno('productos', fila.id_local, fila)
    },
    borrarTodosProductos: () =>
      conexion.ejecutar('DELETE FROM registros WHERE tabla = ?', ['productos']),
    borrarProducto: (idLocal) =>
      conexion.ejecutar('DELETE FROM registros WHERE tabla = ? AND clave = ?', [
        'productos',
        String(idLocal),
      ]),

    // ---- Ventas ----
    leerVentas: () => leerTodo('ventas'),
    upsertVenta: (venta) => guardarUno('ventas', venta.id_local, venta),

    // ---- Detalles de venta ----
    leerDetalles: () => leerTodo('detalles'),
    escribirDetalles: async (filas) => {
      for (const fila of filas) await guardarUno('detalles', fila.id_local, fila)
    },
    borrarTodosDetalles: () =>
      conexion.ejecutar('DELETE FROM registros WHERE tabla = ?', ['detalles']),

    // ---- Cola de sincronización ----
    leerCola: async () => {
      const filas = await conexion.consultar('SELECT id, datos FROM cola ORDER BY id')
      return filas.map((fila) => ({ ...JSON.parse(fila.datos), id: fila.id }))
    },
    encolar: async (operacion) => {
      await conexion.ejecutar('INSERT INTO cola (datos) VALUES (?)', [
        JSON.stringify(operacion),
      ])
    },
    borrarDeCola: (id) => conexion.ejecutar('DELETE FROM cola WHERE id = ?', [id]),

    // ---- Meta ----
    leerMeta: async (clave) => {
      const filas = await conexion.consultar(
        'SELECT datos FROM registros WHERE tabla = ? AND clave = ?',
        ['meta', String(clave)],
      )
      return filas[0] ? JSON.parse(filas[0].datos) : undefined
    },
    escribirMeta: (registro) => guardarUno('meta', registro.clave, registro),

    // ---- Utilidad ----
    cerrar: async () => {},
  }
}
