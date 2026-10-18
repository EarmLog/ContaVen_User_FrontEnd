'use client'

/*
 * (ActualizarContrasena.jsx)
 * Pantalla a la que llega el usuario desde el enlace del correo.
 *
 * Supabase deja una sesión temporal activa cuando el usuario abre el
 * enlace de recuperación. Con esa sesión se puede cambiar la contraseña.
 * Si no hay sesión, se avisa que el enlace no es válido o ya venció.
 */

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

import Aviso from '../../components/ui/Aviso'
import Cargando from '../../components/ui/Cargando'
import * as api from '../../lib/api'
import supabase from '../../lib/supabaseClient'
import { validarContrasena } from '../../lib/validaciones'

/**
 * Componente para escribir la contraseña nueva.
 * @returns {JSX.Element}
 */
export default function ActualizarContrasena() {
  // --- Estado de la pantalla ---
  const [listo, setListo] = useState(false) // si ya se revisó la sesión
  const [haySesion, setHaySesion] = useState(false) // si vino del enlace del correo
  const [contrasena, setContrasena] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [verContrasena, setVerContrasena] = useState(false)
  const [error, setError] = useState('')
  const [exito, setExito] = useState('')
  const [guardando, setGuardando] = useState(false)

  const navegar = useRouter()

  /**
   * Revisa si Supabase ya dejó una sesión de recuperación activa.
   *
   * Cuando el usuario abre el enlace, Supabase lee el token que viene en
   * la dirección y crea la sesión. Eso puede tardar un instante, así que
   * además de revisar de una vez se espera a que avise por el canal.
   */
  useEffect(() => {
    let montado = true

    // Si Supabase avisa que entró (por el enlace), ya se puede cambiar
    const { data: canal } = supabase.auth.onAuthStateChange((evento, sesion) => {
      if (!montado) return
      if (sesion) {
        setHaySesion(true)
        setListo(true)
      }
    })

    // Por si la sesión ya estaba lista antes de escuchar
    supabase.auth.getSession().then(({ data }) => {
      if (!montado) return
      if (data.session) {
        setHaySesion(true)
        setListo(true)
      }
    })

    // Si después de un momento no hay sesión, el enlace no sirve
    const temporizador = setTimeout(() => {
      if (montado) setListo(true)
    }, 1500)

    return () => {
      montado = false
      clearTimeout(temporizador)
      canal?.subscription?.unsubscribe()
    }
  }, [])

  /**
   * Guarda la contraseña nueva.
   * @param {object} evento - El evento del formulario
   */
  async function manejarEnvio(evento) {
    evento.preventDefault()
    setError('')
    setExito('')

    // Se revisa que la contraseña sea segura
    const errorContrasena = validarContrasena(contrasena)
    if (errorContrasena) {
      setError(errorContrasena)
      return
    }

    // Y que las dos sean iguales
    if (contrasena !== confirmar) {
      setError('Las contraseñas no coinciden.')
      return
    }

    setGuardando(true)

    try {
      await api.actualizarContrasena(contrasena)
      setExito('Tu contraseña se cambió. Ya puedes entrar con la nueva.')
      setTimeout(() => navegar.replace('/inicio'), 1800)
    } catch (errorGuardar) {
      setError(errorGuardar.message)
    } finally {
      setGuardando(false)
    }
  }

  // Mientras se revisa la sesión se muestra el spinner
  if (!listo) return <Cargando mensaje="Revisando el enlace..." />

  return (
    <div className="grid min-h-screen place-items-center p-4">
      <div className="w-full max-w-md">

        {/* --- Encabezado con el logo --- */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-xl bg-marca-600 text-xl font-bold text-white">
            CV
          </div>
          <h1 className="text-2xl font-semibold">Nueva contraseña</h1>
          <p className="mt-1 text-sm texto-suave">Escribe y confirma tu contraseña nueva</p>
        </div>

        {/* --- Si el enlace no es válido --- */}
        {!haySesion ? (
          <div className="tarjeta space-y-4 p-6 text-center">
            <p className="text-sm texto-suave">
              Este enlace no es válido o ya venció. Pide uno nuevo para continuar.
            </p>
            <Link
              href="/recuperar"
              className="inline-block w-full rounded-lg bg-marca-600 py-2.5 text-sm font-medium text-white transition hover:bg-marca-700"
            >
              Pedir otro enlace
            </Link>
            <Link href="/login" className="block text-sm texto-suave hover:underline">
              Volver a iniciar sesión
            </Link>
          </div>
        ) : (
          /* --- Formulario de contraseña nueva --- */
          <form onSubmit={manejarEnvio} className="tarjeta space-y-4 p-6">
            <Aviso tipo="error" mensaje={error} alCerrar={() => setError('')} />
            <Aviso tipo="exito" mensaje={exito} />

            {/* Contraseña nueva */}
            <div>
              <label htmlFor="contrasena" className="mb-1 block text-sm font-medium">
                Contraseña nueva
              </label>
              <div className="relative">
                <input
                  id="contrasena"
                  name="contrasena"
                  type={verContrasena ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={contrasena}
                  onChange={(evento) => setContrasena(evento.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  className="campo pr-12"
                />
                <button
                  type="button"
                  onClick={() => setVerContrasena(!verContrasena)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-xs texto-suave hover:text-[var(--texto)]"
                >
                  {verContrasena ? 'Ocultar' : 'Ver'}
                </button>
              </div>
              <p className="mt-1 text-xs texto-suave">
                Debe tener 8 caracteres, una mayúscula, una minúscula y un número.
              </p>
            </div>

            {/* Confirmar contraseña */}
            <div>
              <label htmlFor="confirmar" className="mb-1 block text-sm font-medium">
                Repetir contraseña
              </label>
              <input
                id="confirmar"
                name="confirmar"
                type={verContrasena ? 'text' : 'password'}
                autoComplete="new-password"
                value={confirmar}
                onChange={(evento) => setConfirmar(evento.target.value)}
                placeholder="Repite tu contraseña"
                className="campo"
              />
            </div>

            {/* Botón para guardar */}
            <button
              type="submit"
              disabled={guardando}
              className="w-full rounded-lg bg-marca-600 py-2.5 text-sm font-medium text-white transition hover:bg-marca-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {guardando ? 'Guardando...' : 'Cambiar contraseña'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
