'use client'

/*
 * (layout.jsx)
 * Layout de las pantallas que necesitan sesión.
 *
 * Envuelve todo con RutaProtegida (que manda al login si hace falta),
 * dibuja la barra de navegación y avisa por medio de toasts cuando se
 * recupera la conexión o cuando terminan de subir los cambios.
 *
 * La carpeta se llama "(app)" entre paréntesis para que no aparezca en
 * la dirección: /inicio sigue siendo /inicio, no /app/inicio.
 */

import { useEffect, useRef } from 'react'

import Navbar from '../../components/Navbar'
import RutaProtegida from '../../components/RutaProtegida'
import { useDatos } from '../../context/DbContext'
import { useToasts } from '../../components/ui/Toasts'

/**
 * Estructura común de las pantallas con sesión.
 * @param {object} props - { children }
 * @returns {JSX.Element}
 */
export default function LayoutApp({ children }) {
  return (
    <RutaProtegida>
      {/* Avisos flotantes de la conexión y la sincronización */}
      <AvisosDeSync />

      <div className="min-h-screen">
        <Navbar />
        <main className="mx-auto max-w-7xl px-4 pb-10">{children}</main>
      </div>
    </RutaProtegida>
  )
}

/**
 * Muestra avisos flotantes cuando cambia el estado de la conexión o
 * cuando los cambios pendientes terminan de subir al servidor.
 * @returns {null}
 */
function AvisosDeSync() {
  const { pendientes } = useDatos()
  const { avisar } = useToasts()

  // Se recuerda cuántos pendientes había la vez anterior
  const pendientesAnteriores = useRef(pendientes)

  // Aviso cuando los pendientes bajan a cero (se sincronizó todo)
  useEffect(() => {
    if (pendientesAnteriores.current > 0 && pendientes === 0) {
      avisar('Datos sincronizados con el servidor.', 'exito')
    }
    pendientesAnteriores.current = pendientes
  }, [pendientes, avisar])

  // Avisos cuando se cae o vuelve el internet
  useEffect(() => {
    function alConectar() {
      avisar('Conexión restablecida. Sincronizando...', 'info')
    }

    function alDesconectar() {
      avisar('Sin conexión. Tus cambios se guardan en el equipo.', 'info')
    }

    window.addEventListener('online', alConectar)
    window.addEventListener('offline', alDesconectar)

    return () => {
      window.removeEventListener('online', alConectar)
      window.removeEventListener('offline', alDesconectar)
    }
  }, [avisar])

  return null
}
