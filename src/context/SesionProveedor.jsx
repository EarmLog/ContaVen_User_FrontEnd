/*
 * (SesionProveedor.jsx)
 * Contexto de React que guarda la sesión del usuario en toda la app.
 *
 * Qué maneja aquí:
 *  - Si el usuario tiene una sesión activa o no
 *  - Sus datos de perfil y licencia (días restantes, bloqueado)
 *  - El precio del dólar que se muestra en el navbar
 *  - El tema claro u oscuro que eligió en Configuración
 *
 * Sirve para que el Navbar y las pantallas lean los mismos datos
 * sin tener que pedirlos otra vez.
 */

import { createContext, useCallback, useContext, useEffect, useState } from 'react'

import * as api from '../services/api'
import supabase from '../services/supabase'

// Se crea el contexto que se va a compartir en toda la app
const ContextoSesion = createContext(null)

/**
 * Componente que envuelve la app y guarda el estado de la sesión.
 * Se usa en main.jsx rodeando al componente <App />.
 */
export function ProveedorSesion({ children }) {
  // --- Estado de la app ---
  const [cargando, setCargando] = useState(true)   // true mientras se revisa la sesión
  const [sesion, setSesion] = useState(null)      // sesión de Supabase
  const [perfil, setPerfil] = useState(null)      // datos del usuario y su licencia
  const [dolar, setDolar] = useState(null)        // { precio_ves, origen, actualizado_en }
  const [tema, setTema] = useState('claro')       // 'claro' u 'oscuro'

  /**
   * Carga el perfil del usuario y el precio del dólar.
   * Se llama apenas se confirma que hay una sesión activa.
   */
  const cargarDatosUsuario = useCallback(async () => {
    try {
      // Se piden el perfil y el dólar al backend al mismo tiempo
      const [datosPerfil, datosDolar] = await Promise.all([
        api.obtenerMiPerfil(),
        api.leerDolar(),
      ])

      setPerfil(datosPerfil)
      setDolar(datosDolar)
    } catch (error) {
      // Si el backend dice que está bloqueado se guarda para avisarle
      setPerfil((anterior) => anterior || { error: error.message, bloqueado: true })
    }
  }, [])

  /**
   * Revisa si el usuario ya tiene una sesión guardada en Supabase.
   * Si la tiene, carga su perfil; si no, deja la app en pantalla de login.
   */
  useEffect(() => {
    // Se ejecuta apenas se monta la app
    let montado = true

    // Se le pregunta a Supabase si hay sesión activa
    supabase.auth.getSession().then(async ({ data }) => {
      if (!montado) return

      if (data.session) {
        setSesion(data.session)
        await cargarDatosUsuario()
      }

      setCargando(false)
    })

    // Se queda escuchando por si la sesión se cierra desde otra pestaña
    const { data: canal } = supabase.auth.onAuthStateChange(async (evento, nuevaSesion) => {
      if (!montado) return

      if (evento === 'SIGNED_OUT' || !nuevaSesion) {
        setSesion(null)
        setPerfil(null)
        return
      }

      // Si acaba de entrar se carga su perfil
      if (evento === 'SIGNED_IN' || evento === 'TOKEN_REFRESHED') {
        setSesion(nuevaSesion)
        if (evento === 'SIGNED_IN') await cargarDatosUsuario()
      }
    })

    return () => {
      montado = false
      canal?.subscription?.unsubscribe()
    }
  }, [cargarDatosUsuario])

  /**
   * Aplica el tema en la página.
   * Guarda la clase "oscuro" en el <html> cuando el usuario elige modo oscuro.
   */
  useEffect(() => {
    document.documentElement.classList.toggle('oscuro', tema === 'oscuro')
  }, [tema])

  /**
   * Guarda el tema en el navegador para que se recuerde al recargar.
   */
  useEffect(() => {
    localStorage.setItem('contaven_tema', tema)
  }, [tema])

  /**
   * Elige el tema claro u oscuro.
   * @param {string} nuevoTema - 'claro' u 'oscuro'
   */
  function cambiarTema(nuevoTema) {
    setTema(nuevoTema)
  }

  /**
   * Guarda la sesión en el estado y carga el perfil del usuario.
   * Se llama después de un login exitoso.
   * @param {object} nuevaSesion
   */
  async function entrar(nuevaSesion) {
    setSesion(nuevaSesion)
    await cargarDatosUsuario()
  }

  /**
   * Cierra la sesión y limpia los datos de la pantalla.
   */
  async function salir() {
    await supabase.auth.signOut()
    setSesion(null)
    setPerfil(null)
  }

  /**
   * Vuelve a pedir el perfil y el dólar al backend.
   * Se usa para refrescar el navbar sin recargar la página.
   */
  async function refrescar() {
    await cargarDatosUsuario()
  }

  return (
    <ContextoSesion.Provider
      value={{
        cargando,        // true mientras se revisa la sesión
        sesion,          // sesión activa o null
        usuario: sesion?.user || null,
        perfil,          // datos del usuario y su licencia
        dolar,           // precio actual del dólar
        tema,            // 'claro' u 'oscuro'
        cambiarTema,     // función para cambiar el tema
        entrar,          // se llama tras un login exitoso
        salir,           // cierra la sesión
        refrescar,       // vuelve a pedir perfil y dólar
        estaLogueado: Boolean(sesion),
        estaBloqueado: Boolean(perfil?.bloqueado),
        licenciaVencida: Boolean(perfil?.licencia_vencida),
        diasRestantes: perfil?.dias_restantes ?? 0,
      }}
    >
      {children}
    </ContextoSesion.Provider>
  )
}

/**
 * Permite usar el contexto de la sesión desde cualquier pantalla.
 * @returns {object} - Todos los datos y funciones de la sesión
 */
export function useSesion() {
  const valor = useContext(ContextoSesion)

  if (!valor) {
    throw new Error('useSesion debe usarse dentro de ProveedorSesion')
  }

  return valor
}
