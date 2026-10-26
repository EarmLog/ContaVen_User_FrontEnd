'use client'

/*
 * (Login.jsx)
 * Pantalla de inicio de sesión de la app de usuarios.
 *
 * Solo tiene dos campos: correo y contraseña.
 * Si el usuario intenta entrar sin el captcha resuelto, se abre una
 * ventana modal con el reto de seguridad. Al aceptarlo, el login verifica
 * la contraseña y, si todo está bien, entra al Dashboard (Inicio).
 */

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

import Aviso from '../../components/ui/Aviso'
import Captcha from '../../components/Captcha'
import ModalContainer from '../../components/ui/ModalContainer'
import { useSesion } from '../../context/AuthContext'
import * as api from '../../lib/api'
import { validarLogin } from '../../lib/validaciones'

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

  // --- Estado del captcha ---
  const [captchaOk, setCaptchaOk] = useState(false)
  const [reiniciarCaptcha, setReiniciarCaptcha] = useState(0)

  // Correo con el que se resolvió el captcha actual; si el usuario cambia
  // el correo después de escribir el código, se invalida el captcha.
  const correoCaptchaRef = useRef(null)

  // Modal con el reto de seguridad: se pide cuando el usuario intenta entrar
  const [captchaModalAbierto, setCaptchaModalAbierto] = useState(false)

  // Referencia al formulario, para enviar el login cuando se acepta el captcha
  const refFormulario = useRef(null)

  // Evita que el efecto de "ya hay sesión" navegue antes de que termine
  // de entrar (perfil + primera sincronización del inventario).
  const redirigiendoManual = useRef(false)

  // Para pasar a la pantalla de Inicio cuando el login sale bien
  const navegar = useRouter()

  // Se traen la función de entrar y el estado de la sesión
  const { entrar, cargando, estaLogueado } = useSesion()

  // Cierra el modal con el reto de seguridad y pide uno nuevo por seguridad
  function cerrarModalCaptcha() {
    setCaptchaModalAbierto(false)
    setCaptchaOk(false)
    setReiniciarCaptcha((n) => n + 1)
  }

  // Al aceptar el reto se cierra el modal y se envía el login. El envío
  // revisa el captcha y, si sigue válido, verifica la contraseña y entra.
  function aceptarCaptcha() {
    if (!captchaOk) return
    setCaptchaModalAbierto(false)
    refFormulario.current?.requestSubmit()
  }

  // Si ya hay sesión, no tiene sentido quedarse en el login
  useEffect(() => {
    if (cargando || !estaLogueado) return
    // Cuando el usuario acaba de iniciar sesión, la navegación la hace
    // el propio formulario después de sincronizar los datos.
    if (redirigiendoManual.current) return
    navegar.replace('/inicio')
  }, [cargando, estaLogueado, navegar])

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

    const correoActual = datos.correo.trim().toLowerCase()

    // Si el correo cambió después de resolver el captcha, se pide uno nuevo
    if (captchaOk && correoActual !== correoCaptchaRef.current) {
      setCaptchaOk(false)
      setReiniciarCaptcha((n) => n + 1)
    }

    // Sin el captcha resuelto no se intenta entrar: se abre el modal con el reto
    if (!captchaOk) {
      setCaptchaModalAbierto(true)
      return
    }

    setEnviando(true)

    // A partir de aquí la navegación la controla este formulario
    redirigiendoManual.current = true

    try {
      // Se inicia sesión en Supabase
      const datosSesion = await api.iniciarSesion(datos.correo.trim(), datos.contrasena)

      // Se guarda la sesión en el contexto de la app (esto también deja
      // el inventario del servidor en la base local)
      await entrar(datosSesion)

      // Si todo salió bien se entra al Dashboard
      navegar.replace('/inicio')
    } catch (error) {
      redirigiendoManual.current = false
      setErrorGeneral(error.message)
      // Si algo falla, se pide un captcha nuevo por seguridad
      setCaptchaOk(false)
      setReiniciarCaptcha((n) => n + 1)
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
        <form ref={refFormulario} onSubmit={manejarEnvio} className="tarjeta space-y-4 p-6">

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

          {/* Botón de entrar: si el captcha no está resuelto se abre el modal */}
          <button
            type="submit"
            disabled={enviando}
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

        {/* --- Modal con el reto de seguridad (captcha) --- */}
        <ModalContainer
          abierto={captchaModalAbierto}
          titulo="Código de seguridad"
          alCerrar={cerrarModalCaptcha}
          ancho="max-w-md"
        >
          <div className="space-y-4">
            {/* Reto de seguridad: obligatorio para todas las cuentas */}
            <Captcha
              alValidar={(ok) => {
                setCaptchaOk(ok)
                if (ok) correoCaptchaRef.current = datos.correo.trim().toLowerCase()
              }}
              reiniciar={reiniciarCaptcha}
            />

            {/* Botón para aceptar el reto y continuar con el login */}
            <button
              type="button"
              onClick={aceptarCaptcha}
              disabled={enviando || !captchaOk}
              className="w-full rounded-lg bg-marca-600 py-2.5 text-sm font-medium text-white transition hover:bg-marca-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Aceptar
            </button>
          </div>
        </ModalContainer>
      </div>
    </div>
  )
}
