'use client'

/*
 * (Toasts.jsx)
 * Avisos flotantes que aparecen arriba a la derecha y se van solos.
 *
 * Sirven para avisar cosas rápidas sin cortar lo que el usuario está
 * haciendo: por ejemplo "Datos sincronizados" o "Sin conexión".
 *
 * Se usan así:
 *   const { avisar } = useToasts()
 *   avisar('Venta registrada', 'exito')
 */

import { createContext, useCallback, useContext, useState } from 'react'

// Se crea el contexto de los avisos flotantes
const ContextoToasts = createContext(null)

// Tipos de aviso y sus colores
const ESTILOS = {
  info: 'border-marca-200 bg-marca-50 text-marca-800',
  exito: 'border-green-200 bg-green-50 text-green-800',
  error: 'border-red-200 bg-red-50 text-red-800',
}

// Cuánto dura cada aviso en pantalla (en milisegundos)
const DURACION_MS = 3200

/**
 * Envuelve la app y deja disponible la función para mostrar avisos.
 * @param {object} props - { children }
 * @returns {JSX.Element}
 */
export function ProveedorToasts({ children }) {
  const [avisos, setAvisos] = useState([])

  /**
   * Quita un aviso de la pantalla.
   * @param {number} id
   */
  const quitar = useCallback((id) => {
    setAvisos((anteriores) => anteriores.filter((aviso) => aviso.id !== id))
  }, [])

  /**
   * Muestra un aviso flotante.
   * @param {string} mensaje - El texto del aviso
   * @param {'info'|'exito'|'error'} tipo
   */
  const avisar = useCallback(
    (mensaje, tipo = 'info') => {
      const id = Date.now() + Math.random()
      setAvisos((anteriores) => [...anteriores, { id, mensaje, tipo }])

      // Se quita solo después de un rato
      setTimeout(() => quitar(id), DURACION_MS)
    },
    [quitar],
  )

  return (
    <ContextoToasts.Provider value={{ avisar }}>
      {children}

      {/* --- Contenedor de los avisos flotantes --- */}
      <div className="pointer-events-none fixed right-4 top-4 z-[60] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2">
        {avisos.map((aviso) => (
          <div
            key={aviso.id}
            onClick={() => quitar(aviso.id)}
            className={`pointer-events-auto cursor-pointer rounded-lg border px-4 py-3 text-sm shadow-lg transition-all duration-200 ${
              ESTILOS[aviso.tipo] || ESTILOS.info
            }`}
          >
            {aviso.mensaje}
          </div>
        ))}
      </div>
    </ContextoToasts.Provider>
  )
}

/**
 * Permite mostrar avisos flotantes desde cualquier pantalla.
 * @returns {{ avisar: function(string, string): void }}
 */
export function useToasts() {
  const valor = useContext(ContextoToasts)

  if (!valor) {
    throw new Error('useToasts debe usarse dentro de ProveedorToasts')
  }

  return valor
}
