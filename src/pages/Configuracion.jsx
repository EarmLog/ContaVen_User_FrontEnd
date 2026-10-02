/*
 * (Configuracion.jsx)
 * Pantalla de Configuración de la app de usuarios.
 *
 * Tiene tres opciones:
 *   1. Modo claro / Modo oscuro (empieza en claro)
 *   2. Actualización automática de precios según el dólar
 *   3. Copia de seguridad en Google Drive
 */

import { useEffect, useState } from 'react'

import * as api from '../services/api'
import Aviso from '../components/Aviso'
import Cargando from '../components/Cargando'
import { useSesion } from '../context/SesionProveedor'
import { fechaLegible, formatearUsd, formatearVes } from '../utils/formato'

/**
 * Componente de la pantalla de configuración.
 * @returns {JSX.Element}
 */
export default function Configuracion() {
  // Se traen el tema y las funciones de la sesión
  const { tema, cambiarTema, refrescar, perfil } = useSesion()

  // --- Estado de la pantalla ---
  const [ajustes, setAjustes] = useState({
    tema: tema,
    actualizar_precios_auto: '0',
    nombre_negocio: 'Mi negocio',
  })
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [exito, setExito] = useState('')

  // --- Estado del dólar ---
  const [tasa, setTasa] = useState('')
  const [actualizandoDolar, setActualizandoDolar] = useState(false)

  // --- Estado del conversor USD <-> VES ---
  const [monto, setMonto] = useState('')
  const [direccion, setDireccion] = useState('VES')   // la moneda en la que está el monto
  const [convertido, setConvertido] = useState(null)
  const [convirtiendo, setConvirtiendo] = useState(false)

  // --- Estado de Google Drive ---
  const [drive, setDrive] = useState(null)
  const [creandoCopia, setCreandoCopia] = useState(false)
  const [conectandoDrive, setConectandoDrive] = useState(false)

  /**
   * Carga los ajustes guardados, el precio del dólar y el estado de Drive.
   */
  useEffect(() => {
    let montado = true

    async function cargar() {
      try {
        const [config, dolar, estadoDrive] = await Promise.all([
          api.leerConfiguracion(),
          api.leerDolar(),
          api.estadoDrive(),
        ])

        if (!montado) return

        setAjustes(config.configuracion)
        setTasa(String(dolar.precio_ves))
        setDrive(estadoDrive)

        // Si el tema guardado no es el que tiene el navegador, se aplica
        cambiarTema(config.configuracion.tema)

      } catch (errorCarga) {
        if (montado) setError(errorCarga.message)
      } finally {
        if (montado) setCargando(false)
      }
    }

    cargar()
    return () => { montado = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /**
   * Cambia el tema de la app de inmediato, sin esperar al backend.
   * @param {string} nuevoTema - 'claro' u 'oscuro'
   */
  async function manejarTema(nuevoTema) {
    // Se aplica en la pantalla de una vez
    cambiarTema(nuevoTema)
    setAjustes((anterior) => ({ ...anterior, tema: nuevoTema }))

    // Y se guarda en el backend
    await guardarAjustes({ tema: nuevoTema })
  }

  /**
   * Activa o desactiva la actualización automática de precios.
   * @param {object} evento - El evento del checkbox
   */
  async function manejarAutoPrecios(evento) {
    const nuevoValor = evento.target.checked ? '1' : '0'
    setAjustes((anterior) => ({ ...anterior, actualizar_precios_auto: nuevoValor }))
    await guardarAjustes({ actualizar_precios_auto: nuevoValor })
  }

  /**
   * Cambia el nombre del negocio.
   * @param {object} evento - El evento del input
   */
  function manejarNombreNegocio(evento) {
    setAjustes((anterior) => ({ ...anterior, nombre_negocio: evento.target.value }))
  }

  /**
   * Guarda los ajustes en el backend.
   * @param {object} cambios - Los campos que cambiaron
   */
  async function guardarAjustes(cambios) {
    setGuardando(true)
    setError('')
    setExito('')

    try {
      await api.guardarConfiguracion({ ...ajustes, ...cambios })
      setExito('Cambios guardados.')
      // Se refresca el navbar para que tome el tema nuevo
      await refrescar()
    } catch (errorGuardar) {
      setError(errorGuardar.message)
    } finally {
      setGuardando(false)
      // El mensaje de éxito se quita solo después de un rato
      setTimeout(() => setExito(''), 2500)
    }
  }

  /**
   * Guarda la tasa del dólar que escribió el usuario a mano.
   * @param {object} evento - El evento del formulario
   */
  async function manejarGuardarTasa(evento) {
    evento.preventDefault()
    setActualizandoDolar(true)
    setError('')
    setExito('')

    try {
      const respuesta = await api.guardarDolar(Number(tasa))
      setExito(`Precio del dólar guardado: Bs. ${formatearVes(respuesta.precio_ves)}.`)
      await refrescar()
    } catch (errorTasa) {
      setError(errorTasa.message)
    } finally {
      setActualizandoDolar(false)
    }
  }

  /**
   * Pide la tasa del dólar por internet.
   * Solo funciona si la actualización automática está activada.
   */
  async function actualizarDolarAhora() {
    setActualizandoDolar(true)
    setError('')
    setExito('')

    try {
      const respuesta = await api.actualizarDolar()
      setTasa(String(respuesta.precio_ves))
      setExito(`Dólar actualizado: Bs. ${formatearVes(respuesta.precio_ves)}.`)
      await refrescar()
    } catch (errorDolar) {
      setError(errorDolar.message)
    } finally {
      setActualizandoDolar(false)
    }
  }

  /**
   * Convierte un monto entre dólares y bolívares con la tasa guardada.
   * @param {object} evento - El evento del formulario
   */
  async function manejarConvertir(evento) {
    evento.preventDefault()
    setConvirtiendo(true)
    setError('')

    try {
      const respuesta = await api.convertirMonto({
        valor: Number(monto),
        origen: direccion,
        destino: direccion === 'VES' ? 'USD' : 'VES',
      })

      setConvertido(respuesta)
    } catch (errorConvertir) {
      setError(errorConvertir.message)
      setConvertido(null)
    } finally {
      setConvirtiendo(false)
    }
  }

  /**
   * Pide una copia de seguridad y la sube a Google Drive.
   */
  async function crearCopia() {
    setCreandoCopia(true)
    setError('')
    setExito('')

    try {
      const respuesta = await api.crearCopiaDrive()
      setExito(`${respuesta.mensaje} (${respuesta.archivo})`)
    } catch (errorCopia) {
      setError(errorCopia.message)
    } finally {
      setCreandoCopia(false)
    }
  }

  /**
   * Abre la ventana de Google para autorizar la cuenta.
   *
   * Google manda al usuario a su propia página y luego vuelve a una
   * ventana aparte, así que se abre una ventana emergente y se espera
   * a que termine la autorización revisando el estado cada 1,5 s.
   */
  async function conectarDrive() {
    setConectandoDrive(true)
    setError('')
    setExito('')

    try {
      const { url } = await api.conectarDrive()

      const ventana = window.open(
        url,
        'contaven_drive',
        'width=560,height=720,menubar=no,toolbar=no',
      )

      if (!ventana) {
        setError('El navegador bloqueó la ventana emergente. Allowísela e intenta de nuevo.')
        return
      }

      const avisarConectado = (estado) => {
        clearInterval(revisor)
        ventana.close()
        setDrive(estado)
        setConectandoDrive(false)
        setExito(`Google Drive conectado. Tus copias van a "${estado.nombre_carpeta}".`)
      }

      // Se revisa cada 1,5 s hasta que el backend diga que ya quedó conectado
      const revisor = setInterval(async () => {
        // Si el usuario cerró la ventana sin autorizar, se avisa
        if (ventana.closed) {
          clearInterval(revisor)

          try {
            const estado = await api.estadoDrive()
            setDrive(estado)
            setConectandoDrive(false)

            if (!estado.conectado) {
              setError('No se completó la conexión con Google Drive.')
            }
          } catch (errorEstado) {
            setConectandoDrive(false)
            setError(errorEstado.message)
          }

          return
        }

        try {
          const estado = await api.estadoDrive()
          if (estado.conectado) avisarConectado(estado)
        } catch {
          // Si falla la consulta se reintenta al siguiente intervalo
        }
      }, 1500)

    } catch (errorConectar) {
      setError(errorConectar.message)
      setConectandoDrive(false)
    }
  }

  // Mientras carga se muestra el spinner
  if (cargando) return <Cargando mensaje="Cargando la configuración..." />

  return (
    <div className="space-y-6">

      {/* --- Encabezado --- */}
      <div>
        <h1 className="text-2xl font-semibold">Configuración</h1>
        <p className="mt-1 text-sm texto-suave">
          Ajusta cómo se ve y cómo funciona tu app.
        </p>
      </div>

      <Aviso tipo="error" mensaje={error} alCerrar={() => setError('')} />
      <Aviso tipo="exito" mensaje={exito} alCerrar={() => setExito('')} />

      {/* ============ 1. MODO CLARO / OSCURO ============ */}
      <section className="tarjeta p-6">
        <h2 className="font-semibold">Apariencia</h2>
        <p className="mt-0.5 text-sm texto-suave">
          La app empieza en modo claro. Puedes cambiarlo cuando quieras.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <button
            onClick={() => manejarTema('claro')}
            className={`flex items-center gap-3 rounded-lg border p-4 text-left transition ${
              ajustes.tema === 'claro'
                ? 'border-marca-600 bg-marca-50'
                : 'border-[var(--borde)] hover:bg-[var(--fondo)]'
            }`}
          >
            {/* Ícono del sol */}
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-amber-100 text-lg">
              ☀
            </span>
            <span>
              <span className="block text-sm font-medium">Modo claro</span>
              <span className="block text-xs texto-suave">Fondo blanco, texto oscuro</span>
            </span>
          </button>

          <button
            onClick={() => manejarTema('oscuro')}
            className={`flex items-center gap-3 rounded-lg border p-4 text-left transition ${
              ajustes.tema === 'oscuro'
                ? 'border-marca-600 bg-marca-50'
                : 'border-[var(--borde)] hover:bg-[var(--fondo)]'
            }`}
          >
            {/* Ícono de la luna */}
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-slate-200 text-lg">
              ☾
            </span>
            <span>
              <span className="block text-sm font-medium">Modo oscuro</span>
              <span className="block text-xs texto-suave">Fondo oscuro, texto claro</span>
            </span>
          </button>
        </div>
      </section>

      {/* ============ 2. PRECIO DEL DÓLAR ============ */}
      <section className="tarjeta p-6">
        <h2 className="font-semibold">Precio del dólar</h2>
        <p className="mt-0.5 text-sm texto-suave">
          La tasa actual es la base para calcular los precios de tus productos.
        </p>

        {/* Interruptor de actualización automática */}
        <label className="mt-5 flex cursor-pointer items-center justify-between rounded-lg border border-[var(--borde)] p-4">
          <span>
            <span className="block text-sm font-medium">
              Actualizar los precios automáticamente
            </span>
            <span className="block text-xs texto-suave">
              Cuando está activo, la app consulta la tasa del dólar por internet.
            </span>
          </span>

          <span className="relative ml-4 inline-flex">
            <input
              type="checkbox"
              checked={ajustes.actualizar_precios_auto === '1'}
              onChange={manejarAutoPrecios}
              className="peer sr-only"
            />
            <span className="h-6 w-11 rounded-full bg-gray-300 transition peer-checked:bg-marca-600" />
            <span className="absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition peer-checked:translate-x-5" />
          </span>
        </label>

        {/* El precio del dólar y los botones */}
        <form onSubmit={manejarGuardarTasa} className="mt-5 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">
              Precio de 1 USD en bolívares
            </label>
            <div className="flex flex-wrap gap-3">
              <input
                type="number"
                step="0.01"
                min="0"
                value={tasa}
                onChange={(e) => setTasa(e.target.value)}
                className="campo max-w-xs"
              />

              <button
                type="submit"
                disabled={actualizandoDolar || !tasa}
                className="rounded-lg border border-[var(--borde)] px-5 py-2 text-sm font-medium transition hover:bg-[var(--fondo)] disabled:opacity-60"
              >
                Guardar tasa
              </button>

              {/* Este botón solo aparece si la actualización automática está activa */}
              {ajustes.actualizar_precios_auto === '1' && (
                <button
                  type="button"
                  onClick={actualizarDolarAhora}
                  disabled={actualizandoDolar}
                  className="rounded-lg bg-marca-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-marca-700 disabled:opacity-60"
                >
                  {actualizandoDolar ? 'Consultando...' : 'Actualizar ahora'}
                </button>
              )}
            </div>
          </div>
        </form>
      </section>

      {/* ============ 3. CONVERSOR DE MONEDAS ============ */}
      <section className="tarjeta p-6">
        <h2 className="font-semibold">Convertir entre dólares y bolívares</h2>
        <p className="mt-0.5 text-sm texto-suave">
          Usa la tasa que tienes guardada para saber cuánto vale un monto
          en la otra moneda.
        </p>

        <form onSubmit={manejarConvertir} className="mt-5 space-y-4">
          {/* Se elige en qué moneda está el monto escrito */}
          <div className="inline-flex rounded-lg border border-[var(--borde)] p-1">
            <button
              type="button"
              onClick={() => { setDireccion('VES'); setConvertido(null) }}
              className={`rounded-md px-4 py-1.5 text-sm font-medium transition ${
                direccion === 'VES' ? 'bg-marca-600 text-white' : 'hover:bg-[var(--fondo)]'
              }`}
            >
              Tengo bolívares
            </button>
            <button
              type="button"
              onClick={() => { setDireccion('USD'); setConvertido(null) }}
              className={`rounded-md px-4 py-1.5 text-sm font-medium transition ${
                direccion === 'USD' ? 'bg-marca-600 text-white' : 'hover:bg-[var(--fondo)]'
              }`}
            >
              Tengo dólares
            </button>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Monto en {direccion === 'VES' ? 'bolívares' : 'dólares'}
            </label>
            <div className="flex flex-wrap gap-3">
              <input
                type="number"
                step="0.01"
                min="0"
                value={monto}
                onChange={(e) => { setMonto(e.target.value); setConvertido(null) }}
                placeholder="0.00"
                className="campo max-w-xs"
              />

              <button
                type="submit"
                disabled={convirtiendo || monto === ''}
                className="rounded-lg bg-marca-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-marca-700 disabled:opacity-60"
              >
                {convirtiendo ? 'Convirtiendo...' : 'Convertir'}
              </button>
            </div>
          </div>

          {/* Resultado de la conversión */}
          {convertido && (
            <div className="rounded-lg border border-[var(--borde)] bg-[var(--fondo)] p-4">
              <p className="text-sm">
                <span className="font-medium">
                  {convertido.origen === 'VES' ? 'Bs. ' : ''}
                  {formatearVes(convertido.valor)}
                </span>
                <span className="texto-suave">
                  {' '}={convertido.origen === 'USD' ? '$ ' : ''}
                </span>
                <span className="font-semibold text-marca-600">
                  {convertido.destino === 'VES' ? `Bs. ${formatearVes(convertido.resultado)}` : formatearUsd(convertido.resultado)}
                </span>
              </p>
              <p className="mt-1 text-xs texto-suave">
                Tasa usada: Bs. {formatearVes(convertido.tasa_usd_ves)} por dólar.
              </p>
            </div>
          )}
        </form>
      </section>

      {/* ============ 4. GOOGLE DRIVE ============ */}
      <section className="tarjeta p-6">
        <h2 className="font-semibold">Copia de seguridad en Google Drive</h2>
        <p className="mt-0.5 text-sm texto-suave">
          Guarda una copia de tu inventario y tus ventas en tu Google Drive,
          en una carpeta que pertenece solo a tu cuenta.
        </p>

        {/* La carpeta donde van a caer los respaldos */}
        <div className="mt-4 flex items-center gap-3 rounded-lg border border-[var(--borde)] p-4">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-marca-50 text-lg">
            📁
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-medium">
              Carpeta: {drive?.nombre_carpeta || '—'}
            </span>
            <span className="block text-xs texto-suave">
              Tus respaldos se guardan ahí con la fecha y la hora en el nombre.
            </span>
          </span>
        </div>

        {/* Si todavía no conectó su cuenta, se muestra el botón de autorizar */}
        {drive?.configurado && !drive?.conectado && (
          <div className="mt-4">
            <button
              onClick={conectarDrive}
              disabled={conectandoDrive}
              className="rounded-lg bg-marca-600 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-marca-700 disabled:opacity-60"
            >
              {conectandoDrive ? 'Esperando a Google...' : 'Conectar mi cuenta de Google Drive'}
            </button>
            <p className="mt-2 text-xs texto-suave">
              Se abrirá una ventana de Google para autorizar el acceso. Google solo
              te pedirá permiso sobre los archivos que cree ContaVen.
            </p>
          </div>
        )}

        {/* Botón de crear la copia */}
        <div className="mt-4">
          <button
            onClick={crearCopia}
            disabled={!drive?.configurado || !drive?.conectado || creandoCopia}
            className="rounded-lg bg-exito-500 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-exito-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {creandoCopia ? 'Subiendo copia...' : 'Crear copia de seguridad ahora'}
          </button>

          {/* Avisos según en qué punto esté la configuración */}
          {!drive?.configurado && (
            <p className="mt-2 text-xs texto-suave">
              Falta configurar las llaves de Google Cloud (GOOGLE_CLIENT_ID y
              GOOGLE_CLIENT_SECRET) en el archivo .env del backend.
            </p>
          )}

          {drive?.configurado && !drive?.conectado && (
            <p className="mt-2 text-xs texto-suave">
              Primero conecta tu cuenta de Google Drive con el botón de arriba.
            </p>
          )}

          {drive?.conectado && (
            <p className="mt-2 text-xs texto-suave">
              Tu cuenta está conectada. Puedes crear tantas copias como quieras.
            </p>
          )}
        </div>
      </section>

      {/* ============ INFORMACIÓN DE LA CUENTA ============ */}
      <section className="tarjeta p-6">
        <h2 className="font-semibold">Mi negocio</h2>
        <p className="mt-0.5 text-sm texto-suave">
          Este nombre aparece en los reportes y las copias de seguridad.
        </p>

        <form
          onSubmit={(evento) => {
            evento.preventDefault()
            guardarAjustes({ nombre_negocio: ajustes.nombre_negocio })
          }}
          className="mt-4 flex flex-wrap gap-3"
        >
          <input
            type="text"
            value={ajustes.nombre_negocio}
            onChange={manejarNombreNegocio}
            placeholder="Mi negocio"
            className="campo max-w-xs"
          />
          <button
            type="submit"
            disabled={guardando}
            className="rounded-lg bg-marca-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-marca-700 disabled:opacity-60"
          >
            {guardando ? 'Guardando...' : 'Guardar nombre'}
          </button>
        </form>
      </section>

      {/* ============ INFORMACIÓN DE LA CUENTA ============ */}
      <section className="tarjeta p-6">
        <h2 className="font-semibold">Mi cuenta</h2>

        <div className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="texto-suave">Nombre</span>
            <span className="font-medium">{perfil?.nombre}</span>
          </div>
          <div className="flex justify-between">
            <span className="texto-suave">Correo</span>
            <span className="font-medium">{perfil?.correo}</span>
          </div>
          <div className="flex justify-between">
            <span className="texto-suave">Teléfono</span>
            <span className="font-medium">{perfil?.telefono || '—'}</span>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="texto-suave">Carpeta de Drive</span>
            <span className="break-all font-medium">
              {drive?.nombre_carpeta || '—'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="texto-suave">Licencia hasta</span>
            <span className="font-medium">{fechaLegible(perfil?.fecha_fin_licencia)}</span>
          </div>
        </div>
      </section>
    </div>
  )
}
