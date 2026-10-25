/*
 * (main.cjs)
 * Punto de entrada de la versión de escritorio de ContaVen para Windows.
 *
 * La app web se exporta como sitio estático en "out/". Para que las rutas
 * absolutas de Next.js y las llamadas a la API funcionen igual que en el
 * navegador, se levanta un pequeño servidor HTTP local (solo en 127.0.0.1)
 * y se abre esa dirección dentro de Electron.
 *
 * Se usa Electron 22 porque es la última versión que funciona en Windows 7
 * y Windows 10 sin instalar WebView2 ni ningún otro componente.
 */

const http = require('node:http')
const fs = require('node:fs')
const path = require('node:path')
const { app, BrowserWindow, Menu, dialog, shell } = require('electron')

// Puerto fijo: IndexedDB guarda los datos por origen, así que debe ser
// siempre el mismo para no perder la información local entre arranques.
const PUERTO = 41731
const ORIGEN = `http://127.0.0.1:${PUERTO}`

const TIPOS_CONTENIDO = {
  '.css': 'text/css; charset=utf-8',
  '.csv': 'text/csv; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
}

let ventana = null
let servidor = null

/**
 * Devuelve el archivo real que corresponde a una ruta de la URL.
 * Next.js exporta cada página como "<ruta>/index.html".
 * @param {string} rutaRelativa
 * @returns {string|null}
 */
function buscarArchivo(rutaRelativa) {
  const carpetaSalida = path.join(app.getAppPath(), 'out')
  const limpia = rutaRelativa.replace(/^\/+/, '')
  const candidatos = []

  if (!limpia) {
    candidatos.push('index.html')
  } else if (limpia.endsWith('/')) {
    candidatos.push(path.join(limpia, 'index.html'))
  } else {
    candidatos.push(limpia, `${limpia}.html`, path.join(limpia, 'index.html'))
  }

  for (const candidato of candidatos) {
    const archivo = path.resolve(carpetaSalida, candidato)
    const dentroDeSalida =
      archivo === carpetaSalida || archivo.startsWith(`${carpetaSalida}${path.sep}`)

    if (!dentroDeSalida) continue

    try {
      if (fs.statSync(archivo).isFile()) return archivo
    } catch {
      // Se prueba el siguiente candidato.
    }
  }

  return null
}

/**
 * Envía un archivo al navegador interno.
 * @param {import('node:http').ServerResponse} respuesta
 * @param {string} archivo
 * @param {number} estado
 */
function enviarArchivo(respuesta, archivo, estado = 200) {
  const extension = path.extname(archivo).toLowerCase()
  const tipo = TIPOS_CONTENIDO[extension] || 'application/octet-stream'
  const cache =
    archivo.includes(`${path.sep}_next${path.sep}static${path.sep}`)
      ? 'public, max-age=31536000, immutable'
      : 'no-cache'

  respuesta.writeHead(estado, {
    'Content-Type': tipo,
    'Cache-Control': cache,
  })

  fs.createReadStream(archivo)
    .on('error', () => {
      if (!respuesta.headersSent) respuesta.writeHead(500)
      respuesta.end()
    })
    .pipe(respuesta)
}

/**
 * Responde las peticiones del servidor local.
 * @param {import('node:http').IncomingMessage} peticion
 * @param {import('node:http').ServerResponse} respuesta
 */
function responder(peticion, respuesta) {
  let ruta
  try {
    ruta = decodeURIComponent(new URL(peticion.url || '/', ORIGEN).pathname)
  } catch {
    respuesta.writeHead(400)
    respuesta.end('Solicitud inválida')
    return
  }

  const archivo = buscarArchivo(ruta)
  if (archivo) {
    enviarArchivo(respuesta, archivo)
    return
  }

  const pagina404 = buscarArchivo('/404.html')
  if (pagina404) {
    enviarArchivo(respuesta, pagina404, 404)
    return
  }

  respuesta.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
  respuesta.end('No encontrado')
}

/**
 * Levanta el servidor local y resuelve cuando ya está escuchando.
 * @returns {Promise<void>}
 */
function iniciarServidor() {
  return new Promise((resolve, reject) => {
    servidor = http.createServer(responder)
    servidor.once('error', reject)
    servidor.listen(PUERTO, '127.0.0.1', () => {
      servidor.off('error', reject)
      resolve()
    })
  })
}

/**
 * Crea la ventana principal de la app.
 */
function crearVentana() {
  ventana = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 640,
    show: false,
    backgroundColor: '#f4f6fa',
    autoHideMenuBar: true,
    title: 'ContaVen',
    icon: path.join(__dirname, 'icon.ico'),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  // La app no necesita el menú tradicional de Electron.
  Menu.setApplicationMenu(null)

  // Los enlaces externos se abren en el navegador del sistema, no dentro
  // de la ventana de ContaVen.
  ventana.webContents.setWindowOpenHandler(({ url }) => {
    if (!url.startsWith(ORIGEN)) shell.openExternal(url)
    return { action: 'deny' }
  })

  ventana.webContents.on('will-navigate', (evento, url) => {
    if (!url.startsWith(ORIGEN)) {
      evento.preventDefault()
      shell.openExternal(url)
    }
  })

  ventana.once('ready-to-show', () => ventana.show())
  ventana.on('closed', () => {
    ventana = null
  })

  ventana.loadURL(`${ORIGEN}/`)
}

// Una sola instancia evita que dos ventanas intenten usar el mismo puerto
// y la misma base de datos local.
const tieneInstanciaUnica = app.requestSingleInstanceLock()

if (!tieneInstanciaUnica) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (!ventana) return
    if (ventana.isMinimized()) ventana.restore()
    ventana.focus()
  })

  app.whenReady().then(async () => {
    try {
      await iniciarServidor()
      crearVentana()
    } catch (error) {
      const mensaje =
        error && error.code === 'EADDRINUSE'
          ? `El puerto ${PUERTO} ya está ocupado por otro programa. Cierra la otra aplicación y vuelve a abrir ContaVen.`
          : `No se pudo iniciar ContaVen.\n\n${error?.message || error}`

      dialog.showErrorBox('No se pudo abrir ContaVen', mensaje)
      app.quit()
    }

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) crearVentana()
    })
  })

  app.on('window-all-closed', () => {
    if (servidor) servidor.close()
    app.quit()
  })
}
