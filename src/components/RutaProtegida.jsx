/*
 * (RutaProtegida.jsx)
 * Envuelve las pantallas que necesitan que el usuario haya iniciado sesión.
 *
 * Si no hay sesión, lo manda a la pantalla de login.
 * Si el administrador lo bloqueó, le muestra la pantalla de acceso bloqueado.
 */

import { Navigate } from 'react-router-dom'

import { useSesion } from '../context/SesionProveedor'

/**
 * Revisa si el usuario puede ver la pantalla que está pidiendo.
 * @param {object} props - { children }
 * @returns {JSX.Element}
 */
export default function RutaProtegida({ children }) {
  // Se traen los datos de la sesión
  const { cargando, estaLogueado, estaBloqueado } = useSesion()

  // Mientras se revisa si hay sesión se muestra el spinner
  if (cargando) {
    return (
      <div className="grid min-h-screen place-items-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-marca-200 border-t-marca-600" />
      </div>
    )
  }

  // Si el administrador lo bloqueó se muestra el aviso de acceso bloqueado
  if (estaBloqueado) {
    return <PantallaBloqueado />
  }

  // Si no hay sesión se lo manda al login
  if (!estaLogueado) {
    return <Navigate to="/login" replace />
  }

  return children
}

/**
 * Pantalla que se muestra cuando el administrador bloqueó el acceso
 * del usuario. Le explica que debe pagar la licencia para continuar.
 * @returns {JSX.Element}
 */
function PantallaBloqueado() {
  const { perfil } = useSesion()

  return (
    <div className="grid min-h-screen place-items-center p-4">
      <div className="tarjeta w-full max-w-md p-8 text-center">
        {/* El ícono de candado */}
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-red-100 text-3xl">
          🔒
        </div>

        <h1 className="text-xl font-semibold text-error-600">Acceso bloqueado</h1>

        <p className="mt-3 text-sm texto-suave">
          {perfil?.error || 'Tu cuenta fue bloqueada por el administrador.'}
        </p>

        <p className="mt-4 text-sm">
          Ponte en contacto con el administrador de ContaVen para regularizar tu licencia
          y volver a tener acceso.
        </p>

        <button
          onClick={() => window.location.reload()}
          className="mt-6 w-full rounded-lg bg-marca-600 py-2.5 text-sm font-medium text-white transition hover:bg-marca-700"
        >
          Volver a intentar
        </button>
      </div>
    </div>
  )
}
