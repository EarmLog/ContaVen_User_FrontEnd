/*
 * (Modal.jsx)
 * Ventanaemergente que se abre encima de la pantalla actual.
 *
 * Se usa en el inventario para agregar y editar productos sin salir
 * de la lista. Se cierra con el botón X, con el botón Cancelar,
 * tocando el fondo oscuro, o presionando la tecla Escape.
 */

import { useEffect } from 'react'

/**
 * Muestra una ventana emergente con el contenido de los hijos.
 * @param {object} props - { abierto, titulo, alCerrar, children, ancho }
 * @returns {JSX.Element|null} - La ventana, o null si está cerrada
 */
export default function Modal({ abierto, titulo, alCerrar, children, ancho = 'max-w-2xl' }) {
  // Mientras la ventana está abierta se cierra con la tecla Escape
  useEffect(() => {
    if (!abierto) return

    function alPresionarEscape(evento) {
      if (evento.key === 'Escape') alCerrar()
    }

    document.addEventListener('keydown', alPresionarEscape)

    // Se bloquea el scroll del fondo para que no se mueva detrás de la ventana
    const scrollAnterior = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', alPresionarEscape)
      document.body.style.overflow = scrollAnterior
    }
  }, [abierto, alCerrar])

  // Si la ventana está cerrada no se dibuja nada
  if (!abierto) return null

  return (
    // El fondo oscuro cierra la ventana al tocarlo
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/50"
      onClick={alCerrar}
    >
      {/* Contenedor que centra la ventana y evita que se salga de la pantalla */}
      <div className="flex min-h-full items-center justify-center p-3 sm:p-4">
        <div
          // Se detiene la propagación para que tocar dentro no cierre la ventana
          onClick={(evento) => evento.stopPropagation()}
          className={`tarjeta flex max-h-[calc(100dvh-1.5rem)] w-full ${ancho} flex-col shadow-xl`}
          role="dialog"
          aria-modal="true"
        >
          {/* --- Encabezado de la ventana --- */}
          <div className="flex shrink-0 items-center justify-between border-b border-[var(--borde)] px-5 py-4 sm:px-6">
            <h2 className="text-lg font-semibold">{titulo}</h2>
            <button
              onClick={alCerrar}
              className="text-xl leading-none texto-suave transition hover:text-[var(--texto)]"
              title="Cerrar"
              aria-label="Cerrar"
            >
              ×
            </button>
          </div>

          {/* --- Contenido de la ventana (con scroll propio si es muy alto) --- */}
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
        </div>
      </div>
    </div>
  )
}