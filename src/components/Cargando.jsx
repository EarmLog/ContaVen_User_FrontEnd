/*
 * (Cargando.jsx)
 * Componente que se muestra mientras una pantalla espera los datos del servidor.
 */

/**
 * Muestra un spinner con un mensaje mientras se cargan los datos.
 * @param {object} props - { mensaje }
 * @returns {JSX.Element}
 */
export default function Cargando({ mensaje = 'Cargando...' }) {
  return (
    <div className="grid place-items-center gap-3 py-16">
      {/* El círculo que gira */}
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-marca-200 border-t-marca-600" />
      <p className="text-sm texto-suave">{mensaje}</p>
    </div>
  )
}
