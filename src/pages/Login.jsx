/*
 * (Login.jsx)
 * Pantalla de inicio de sesión de la app de usuarios.
 *
 * Solo tiene dos campos: correo y contraseña.
 * Si todo está bien, entra al Dashboard (Inicio).
 */

import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import * as api from '../services/api'
import Aviso from '../components/Aviso'
import { useSesion } from '../context/SesionProveedor'
import { validarLogin } from '../utils/validaciones'

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

  // Para pasar a la pantalla de Inicio cuando el login sale bien
  const navegar = useNavigate()

  // Se trae la función de entrar de la sesión
  const { entrar } = useSesion()

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

    setEnviando(true)

    try {
      // Se inicia sesión en Supabase
      const datosSesion = await api.iniciarSesion(datos.correo.trim(), datos.contrasena)

      // Se guarda la sesión en el contexto de la app
      await entrar(datosSesion)

      // Si todo salió bien se entra al Dashboard
      navegar('/inicio', { replace: true })
    } catch (error) {
      setErrorGeneral(error.message)
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
            {errores.correo && (
              <p className="mt-1 text-xs text-red-600">{errores.correo}</p>
            )}
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
          </div>

          {/* Botón de entrar */}
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
            <Link to="/registro" className="font-medium text-marca-600 hover:underline">
              Regístrate aquí
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
