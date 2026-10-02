/*
 * (Registro.jsx)
 * Pantalla de registro de la app de usuarios.
 *
 * Campos: nombre (obligatorio), correo (obligatorio),
 * contraseña (obligatoria) y número de teléfono (opcional).
 *
 * Al registrarse bien, se crea la cuenta con 30 días de licencia
 * y se manda al usuario a la pantalla de login.
 */

import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import * as api from '../services/api'
import Aviso from '../components/Aviso'
import { validarRegistro } from '../utils/validaciones'

/**
 * Componente con el formulario de registro.
 * @returns {JSX.Element}
 */
export default function Registro() {
  // --- Estado del formulario ---
  const [datos, setDatos] = useState({
    nombre: '',
    correo: '',
    contrasena: '',
    confirmarContrasena: '',
    telefono: '',
  })
  const [errores, setErrores] = useState({})
  const [errorGeneral, setErrorGeneral] = useState('')
  const [exito, setExito] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [verContrasena, setVerContrasena] = useState(false)

  // Para mandar al usuario al login cuando termine el registro
  const navegar = useNavigate()

  /**
   * Escribe un valor en un campo del formulario.
   * @param {object} evento - El evento del input
   */
  function manejarCambio(evento) {
    const { name, value } = evento.target
    setDatos((anterior) => ({ ...anterior, [name]: value }))
  }

  /**
   * Revisa todos los campos y luego manda el registro al backend.
   * @param {object} evento - El evento del formulario
   */
  async function manejarEnvio(evento) {
    evento.preventDefault()
    setErrorGeneral('')
    setExito('')

    // Se validan los campos
    const nuevosErrores = validarRegistro(datos)

    // Se revisa que las dos contraseñas sean iguales
    if (datos.contrasena !== datos.confirmarContrasena) {
      nuevosErrores.confirmarContrasena = 'Las contraseñas no coinciden.'
    }

    setErrores(nuevosErrores)

    // Si hay algún error se detiene aquí
    if (Object.values(nuevosErrores).some(Boolean)) return

    setEnviando(true)

    try {
      // Se manda el registro al backend Flask
      const respuesta = await api.registrar({
        nombre: datos.nombre.trim(),
        correo: datos.correo.trim().toLowerCase(),
        contrasena: datos.contrasena,
        telefono: datos.telefono.trim() || null,
      })

      // Si todo salió bien se muestra el aviso y se manda al login
      setExito(respuesta.mensaje)
      setTimeout(() => navegar('/login', { replace: true }), 1800)
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
          <h1 className="text-2xl font-semibold">Crea tu cuenta</h1>
          <p className="mt-1 text-sm texto-suave">30 días gratis, sin compromiso</p>
        </div>

        {/* --- Formulario de registro --- */}
        <form onSubmit={manejarEnvio} className="tarjeta space-y-4 p-6">

          {/* Mensajes de error y de éxito */}
          <Aviso tipo="error" mensaje={errorGeneral} alCerrar={() => setErrorGeneral('')} />
          <Aviso tipo="exito" mensaje={exito} />

          {/* Campo del nombre (obligatorio) */}
          <div>
            <label htmlFor="nombre" className="mb-1 block text-sm font-medium">
              Nombre <span className="text-error-500">*</span>
            </label>
            <input
              id="nombre"
              name="nombre"
              type="text"
              autoComplete="name"
              value={datos.nombre}
              onChange={manejarCambio}
              placeholder="Juan Pérez"
              className={`campo ${errores.nombre ? 'border-red-400' : ''}`}
            />
            {errores.nombre && <p className="mt-1 text-xs text-red-600">{errores.nombre}</p>}
          </div>

          {/* Campo del correo (obligatorio) */}
          <div>
            <label htmlFor="correo" className="mb-1 block text-sm font-medium">
              Correo <span className="text-error-500">*</span>
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

          {/* Campo de la contraseña (obligatorio) */}
          <div>
            <label htmlFor="contrasena" className="mb-1 block text-sm font-medium">
              Contraseña <span className="text-error-500">*</span>
            </label>
            <div className="relative">
              <input
                id="contrasena"
                name="contrasena"
                type={verContrasena ? 'text' : 'password'}
                autoComplete="new-password"
                value={datos.contrasena}
                onChange={manejarCambio}
                placeholder="Mínimo 8 caracteres"
                className={`campo pr-12 ${errores.contrasena ? 'border-red-400' : ''}`}
              />
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
            <p className="mt-1 text-xs texto-suave">
              Debe tener 8 caracteres, una mayúscula, una minúscula y un número.
            </p>
          </div>

          {/* Campo de confirmar la contraseña */}
          <div>
            <label htmlFor="confirmarContrasena" className="mb-1 block text-sm font-medium">
              Repetir contraseña <span className="text-error-500">*</span>
            </label>
            <input
              id="confirmarContrasena"
              name="confirmarContrasena"
              type={verContrasena ? 'text' : 'password'}
              autoComplete="new-password"
              value={datos.confirmarContrasena}
              onChange={manejarCambio}
              placeholder="Repite tu contraseña"
              className={`campo ${errores.confirmarContrasena ? 'border-red-400' : ''}`}
            />
            {errores.confirmarContrasena && (
              <p className="mt-1 text-xs text-red-600">{errores.confirmarContrasena}</p>
            )}
          </div>

          {/* Campo del teléfono (opcional) */}
          <div>
            <label htmlFor="telefono" className="mb-1 block text-sm font-medium">
              Número de teléfono <span className="texto-suave">(opcional)</span>
            </label>
            <input
              id="telefono"
              name="telefono"
              type="tel"
              autoComplete="tel"
              value={datos.telefono}
              onChange={manejarCambio}
              placeholder="04141234567"
              className={`campo ${errores.telefono ? 'border-red-400' : ''}`}
            />
            {errores.telefono && <p className="mt-1 text-xs text-red-600">{errores.telefono}</p>}
          </div>

          {/* Botón de registrarse */}
          <button
            type="submit"
            disabled={enviando}
            className="w-full rounded-lg bg-marca-600 py-2.5 text-sm font-medium text-white transition hover:bg-marca-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {enviando ? 'Creando cuenta...' : 'Registrarme'}
          </button>

          {/* Enlace para ir al login */}
          <p className="text-center text-sm texto-suave">
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className="font-medium text-marca-600 hover:underline">
              Inicia sesión
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
