'use client'

/*
 * (Recuperar.jsx)
 * Pantalla para pedir el correo de recuperación de contraseña.
 *
 * El usuario escribe su correo y Supabase le manda un enlace para crear
 * una contraseña nueva.
 *
 * Nota: Supabase solo deja enviar unos pocos correos por hora con su
 * servidor de pruebas. Para uso real hay que configurar un SMTP propio.
 */

import Link from 'next/link'
import { useState } from 'react'

import Aviso from '../../components/ui/Aviso'
import * as api from '../../lib/api'
import { validarCorreo } from '../../lib/validaciones'

/**
 * Componente con el formulario de recuperación.
 * @returns {JSX.Element}
 */
export default function Recuperar() {
  // --- Estado del formulario ---
  const [correo, setCorreo] = useState('')
  const [error, setError] = useState('')
  const [exito, setExito] = useState('')
  const [enviando, setEnviando] = useState(false)

  /**
   * Manda el correo de recuperación si el correo está bien escrito.
   * @param {object} evento - El evento del formulario
   */
  async function manejarEnvio(evento) {
    evento.preventDefault()
    setError('')
    setExito('')

    // Se revisa el formato del correo
    const errorCorreo = validarCorreo(correo)
    if (errorCorreo) {
      setError(errorCorreo)
      return
    }

    setEnviando(true)

    try {
      await api.enviarCorreoRecuperacion(correo.trim().toLowerCase())
      setExito(
        'Si ese correo está registrado, te llegará un enlace para cambiar tu contraseña. ' +
          'Revisa también la carpeta de spam.',
      )
      setCorreo('')
    } catch (errorEnvio) {
      setError(errorEnvio.message)
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
          <h1 className="text-2xl font-semibold">Recuperar contraseña</h1>
          <p className="mt-1 text-sm texto-suave">Te enviaremos un enlace a tu correo</p>
        </div>

        {/* --- Formulario --- */}
        <form onSubmit={manejarEnvio} className="tarjeta space-y-4 p-6">

          {/* Mensajes de error y de éxito */}
          <Aviso tipo="error" mensaje={error} alCerrar={() => setError('')} />
          <Aviso tipo="exito" mensaje={exito} />

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
              value={correo}
              onChange={(evento) => setCorreo(evento.target.value)}
              placeholder="tucorreo@ejemplo.com"
              className="campo"
            />
          </div>

          {/* Botón para enviar */}
          <button
            type="submit"
            disabled={enviando}
            className="w-full rounded-lg bg-marca-600 py-2.5 text-sm font-medium text-white transition hover:bg-marca-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {enviando ? 'Enviando...' : 'Enviarme el enlace'}
          </button>

          {/* Enlace para volver al login */}
          <p className="text-center text-sm texto-suave">
            <Link href="/login" className="font-medium text-marca-600 hover:underline">
              Volver a iniciar sesión
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
