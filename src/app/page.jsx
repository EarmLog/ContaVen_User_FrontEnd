'use client'

/*
 * (page.jsx)
 * Página raíz. Manda al usuario al Inicio.
 *
 * En un sitio estático (output: 'export') la redirección se hace del lado
 * del navegador, por eso se hace con un efecto y un pequeño spinner.
 */

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

/**
 * Redirige a la pantalla de Inicio.
 * @returns {JSX.Element}
 */
export default function PantallaRaiz() {
  const navegar = useRouter()

  useEffect(() => {
    navegar.replace('/inicio')
  }, [navegar])

  return (
    <div className="grid min-h-screen place-items-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-marca-200 border-t-marca-600" />
    </div>
  )
}
