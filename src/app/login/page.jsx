'use client'

/*
 * (Login.jsx)
 * Pantalla de inicio de sesión de la app de usuarios.
 *
 * Solo tiene dos campos: correo y contraseña.
 * Si todo está bien, entra al Dashboard (Inicio).
 */

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'

import Aviso from '../../components/ui/Aviso'
import { useSesion } from '../../context/AuthContext'
import * as api from '../../lib/api'
import { validarLogin } from '../../lib/validaciones'

const CORREO_SIN_CAPTCHA = 'earm2771@gmail.com'
const YANDEX_SITE_KEY = process.env.NEXT_PUBLIC_YANDEX_SMARTCAPTCHA_SITEKEY || ''

/**
 * Componente con el formulario de login.
 * @returns {JSX.Element}
 */
export default function Login() {
  // --- Estado del formulario ---
  const [datos, setDatos] = useState({ correo: '', contrasena: '' })
  const [errores, setErrores] = useState({})
  const [errorGeneral, setErrorGeneral] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [verContrasena, setVerContrasena] = useState(false)

  // --- Estado del Yandex SmartCaptcha ---
  const [yandexToken, setYandexToken] = useState('')
  const contenedorCaptcha = useRef(null)
  const widgetId = useRef(null)

  // Para pasar a la pantalla de Inicio cuando el login sale bien
  const navegar = useRouter()

  // Se traen la función de entrar y el estado de la sesión
  const { entrar, cargando, estaLogueado } = useSesion()

  const esCorreoSinCaptcha = (datos.correo || '').trim().toLowerCase() === CORREO_SIN_CAPTCHA.toLowerCase()
  const necesitaCaptcha = !esCorreoSinCaptcha

  const inicializarCaptcha = useCallback(() => {
    if (!necesitaCaptcha || !contenedorCaptcha.current || !YANDEX_SITE_KEY) return
    if (typeof window === 'undefined') return
    if (widgetId.current !== null) return

    const smartCaptcha = window.smartCaptcha
    if (!smartCaptcha) return

    try {
      widgetId.current = smartCaptcha.render(contenedorCaptcha.current, {
        sitekey: YANDEX_SITE_KEY,
        callback: (token) => {
          setYandexToken(token || '')
        },
        hl: 'es',
      })
    } catch (error) {
      // Si ya está renderizado o falla, lo ignoramos
    }
  }, [necesitaCaptcha])

  const resetearCaptcha = useCallback(() => {
    setYandexToken('')
    if (!necesitaCaptcha) return
    if (typeof window === 'undefined') return
    const smartCaptcha = window.smartCaptcha
    if (smartCaptcha && widgetId.current !== null) {
      try {
        smartCaptcha.reset(widgetId.current)
      } catch (error) {
        // Ignorar
      }
    }
  }, [necesitaCaptcha])

  // Si ya hay sesión, no tiene sentido quedarse en el login
  useEffect(() => {
    if (!cargando && estaLogueado) navegar.replace('/inicio')
  }, [cargando, estaLogueado, navegar])

  useEffect(() => {
    if (!necesitaCaptcha) {
      setYandexToken('')
      return
    }

    const scriptId = 'yandex-smartcaptcha-script'
    if (document.getElementById(scriptId)) {
      inicializarCaptcha()
      return
    }

    const script = document.createElement('script')
    script.id = scriptId
    script.src = 'https://smartcaptcha.yandexcloud.net/captcha.js'
    script.async = true
    script.defer = true
    script.onload = inicializarCaptcha
    document.body.appendChild(script)
  }, [necesitaCaptcha, inicializarCaptcha])

  useEffect(() => {
    if (necesitaCaptcha) {
      inicializarCaptcha()
    }
  }, [necesitaCaptcha, inicializarCaptcha])

  /**
   * Escribe un valor en un campo del formulario.
   * @param {object} evento - El evento del input
   */
  function manejarCambio(evento) {
    const { name, value } = evento.target
    setDatos((anterior) => ({ ...anterior, [name]: value }))
  }

  /**
   * Revisa los campos y luego intenta iniciar sesión con Supabase.
   * @param {object} evento - El evento del formulario
   */
  async function manejarEnvio(evento) {
    evento.preventDefault()
    setErrorGeneral('')

    // Se validan los campos antes de llamar al servidor
    const nuevosErrores = validarLogin(datos)
    setErrores(nuevosErrores)

    // Si hay algún error de validación se detiene aquí
    if (nuevosErrores.correo || nuevosErrores.contrasena) return

    // Sin el captcha resuelto no se intenta entrar (excepto cuenta maestra)
    if (necesitaCaptcha) {
      if (!YANDEX_SITE_KEY) {
        setErrorGeneral('Falta configurar la clave de Yandex SmartCaptcha.')
        return
      }
      if (!yandexToken) {
        setErrorGeneral('Resuelve el captcha para continuar.')
        return
      }
    }

    setEnviando(true)

    try {
      // Se inicia sesión en Supabase
      const datosSesion = await api.iniciarSesion(datos.correo.trim(), datos.contrasena)

      // Se guarda la sesión en el contexto de la app
      await entrar(datosSesion)

      // Si todo salió bien se entra al Dashboard
      navegar.replace('/inicio')
    } catch (error) {
      setErrorGeneral(error.message)
      // Si algo falla, se pide un captcha nuevo por seguridad
      resetearCaptcha()
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="grid min-h-screen place-items-center p-4">
      <div className="w-full max-w-md">

        {/* --- Encabezado con el logo --- */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-xl bg-marca-600 text-xl font-bold text-white">
            CV
          </div>
          <h1 className="text-2xl font-semibold">ContaVen</h1>
          <p className="mt-1 text-sm texto-suave">Inventario, punto de venta y análisis</p>
        </div>

        {/* --- Formulario de login --- */}
        <form onSubmit={manejarEnvio} className="tarjeta space-y-4 p-6">

          {/* Mensaje de error si algo salió mal */}
          <Aviso tipo="error" mensaje={errorGeneral} alCerrar={() => setErrorGeneral('')} />

          {/* Campo del correo */}
          <div>
            <label htmlFor="correo" className="mb-1 block text-sm font-medium">
              Correo
            </label>
            <input
              id="correo"
              name="correo"
              type="email"
              autoComplete="email"
              value={datos.correo}
              onChange={manejarCambio}
              placeholder="tucorreo@ejemplo.com"
              className={`campo ${errores.correo ? 'border-red-400' : ''}`}
            />
            {errores.correo && <p className="mt-1 text-xs text-red-600">{errores.correo}</p>}
          </div>

          {/* Campo de la contraseña */}
          <div>
            <label htmlFor="contrasena" className="mb-1 block text-sm font-medium">
              Contraseña
            </label>
            <div className="relative">
              <input
                id="contrasena"
                name="contrasena"
                type={verContrasena ? 'text' : 'password'}
                autoComplete="current-password"
                value={datos.contrasena}
                onChange={manejarCambio}
                placeholder="Tu contraseña"
                className={`campo pr-12 ${errores.contrasena ? 'border-red-400' : ''}`}
              />
              {/* Botón para mostrar u ocultar la contraseña */}
              <button
                type="button"
                onClick={() => setVerContrasena(!verContrasena)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-xs texto-suave hover:text-[var(--texto)]"
              >
                {verContrasena ? 'Ocultar' : 'Ver'}
              </button>
            </div>
            {errores.contrasena && (
              <p className="mt-1 text-xs text-red-600">{errores.contrasena}</p>
            )}

            {/* Enlace para recuperar la contraseña */}
            <div className="mt-2 text-right">
              <Link href="/recuperar" className="text-xs font-medium text-marca-600 hover:underline">
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
          </div>

          {/* Reto de seguridad para frenar intentos automáticos */}
          {necesitaCaptcha && (
            <div className="space-y-2">
              <p className="text-center text-sm font-medium">Verificación de seguridad</p>
              <div ref={contenedorCaptcha} className="flex justify-center" />
              {!YANDEX_SITE_KEY && (
                <p className="text-center text-xs text-red-600">
                  Falta NEXT_PUBLIC_YANDEX_SMARTCAPTCHA_SITEKEY en .env
                </p>
              )}
            </div>
          )}

          {/* Botón de entrar */}
          <button
            type="submit"
            disabled={enviando || (necesitaCaptcha && (!yandexToken || !YANDEX_SITE_KEY))}
            className="w-full rounded-lg bg-marca-600 py-2.5 text-sm font-medium text-white transition hover:bg-marca-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {enviando ? 'Entrando...' : 'Iniciar sesión'}
          </button>

          {/* Enlace para ir al registro */}
          <p className="text-center text-sm texto-suave">
            ¿No tienes cuenta?{' '}
            <Link href="/registro" className="font-medium text-marca-600 hover:underline">
              Regístrate aquí
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
