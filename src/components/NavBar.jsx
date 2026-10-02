/*
 * (NavBar.jsx)
 * Barra de navegación superior de la app de usuarios.
 *
 * En pantallas grandes muestra los enlaces en una fila:
 *   1. El logo de ContaVen
 *   2. Los enlaces: Inicio, Inventario, POS, Análisis, Configuración
 *   3. El precio del dólar (USD a VES)
 *   4. Los días de licencia que le quedan al usuario
 *   5. El botón de cerrar sesión
 *
 * En pantallas pequeñas (teléfonos) los enlaces se esconden y aparece
 * un botón de tres líneas (hamburguesa) que abre un panel lateral por
 * la izquierda con todas las opciones.
 */

import { useEffect, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'

import { useSesion } from '../context/SesionProveedor'
import { formatearVes } from '../utils/formato'

// Las opciones del menú, en el orden en que se muestran
const ENLACES = [
  { ruta: '/inicio', texto: 'Inicio' },
  { ruta: '/inventario', texto: 'Inventario' },
  { ruta: '/pos', texto: 'POS' },
  { ruta: '/analisis', texto: 'Análisis' },
  { ruta: '/configuracion', texto: 'Configuración' },
]

/**
 * Componente que dibuja la barra de navegación.
 * @returns {JSX.Element}
 */
export default function NavBar() {
  // Se traen los datos de la sesión
  const { perfil, dolar, diasRestantes, licenciaVencida, salir, usuario } = useSesion()

  // Para poder cambiar de pantalla al cerrar sesión
  const navegar = useNavigate()

  // Controla si el panel lateral del teléfono está abierto
  const [menuAbierto, setMenuAbierto] = useState(false)

  // Mientras el panel está abierto se cierra con Escape y no se mueve el fondo
  useEffect(() => {
    if (!menuAbierto) return

    function alPresionarEscape(evento) {
      if (evento.key === 'Escape') setMenuAbierto(false)
    }

    document.addEventListener('keydown', alPresionarEscape)

    const scrollAnterior = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', alPresionarEscape)
      document.body.style.overflow = scrollAnterior
    }
  }, [menuAbierto])

  /**
   * Cierra la sesión del usuario y lo manda a la pantalla de login.
   */
  async function manejarSalir() {
    setMenuAbierto(false)
    await salir()
    navegar('/login', { replace: true })
  }

  return (
    <>
      <header className="tarjeta sticky top-0 z-40 mb-4 rounded-none border-x-0 border-t-0 md:mb-6">
        <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-3 sm:gap-3">

          {/* --- Botón de hamburguesa (solo en teléfonos) --- */}
          <button
            onClick={() => setMenuAbierto(true)}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-[var(--borde)] transition hover:bg-[var(--fondo)] md:hidden"
            aria-label="Abrir menú"
            aria-expanded={menuAbierto}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>

          {/* --- 1. Logo --- */}
          <NavLink to="/inicio" className="flex shrink-0 items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-marca-600 font-bold text-white">
              CV
            </span>
            <span className="hidden text-lg font-semibold sm:inline">ContaVen</span>
          </NavLink>

          {/* --- 2. Enlaces de navegación (escritorio) --- */}
          <nav className="hidden flex-1 items-center gap-1 md:flex">
            {ENLACES.map((enlace) => (
              <EnlaceNav key={enlace.ruta} ruta={enlace.ruta} texto={enlace.texto} />
            ))}
          </nav>

          {/* --- Zona derecha: dólar, licencia, usuario y salir --- */}
          <div className="ml-auto flex items-center gap-2 md:gap-3">

            {/* --- 3. Precio del dólar --- */}
            <div
              className="flex items-center gap-1.5 rounded-lg bg-marca-50 px-2.5 py-1.5 text-sm"
              title={dolar?.actualizado_en ? `Actualizado: ${dolar.actualizado_en}` : 'Tasa por defecto'}
            >
              <span className="hidden font-semibold text-marca-700 sm:inline">USD/VES</span>
              <span className="font-mono text-xs font-bold sm:text-sm">
                {dolar ? formatearVes(dolar.precio_ves) : '...'}
              </span>
            </div>

            {/* --- 4. Licencia (se oculta en pantallas muy pequeñas) --- */}
            <div className="hidden sm:block">
              <AvisoLicencia
                licenciaVencida={licenciaVencida}
                diasRestantes={diasRestantes}
                fechaFin={perfil?.fecha_fin_licencia}
              />
            </div>

            {/* --- 5. Usuario y botón de salir (solo escritorio) --- */}
            <div className="hidden items-center gap-3 md:flex">
              <span className="hidden text-sm texto-suave lg:inline" title={usuario?.email}>
                {perfil?.nombre || usuario?.email}
              </span>
              <button
                onClick={manejarSalir}
                className="rounded-lg border border-[var(--borde)] px-3 py-1.5 text-sm font-medium transition hover:bg-error-500/10 hover:text-error-600"
              >
                Salir
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* --- Panel lateral del teléfono --- */}
      <div
        className={`fixed inset-0 z-50 md:hidden ${menuAbierto ? '' : 'pointer-events-none'}`}
        aria-hidden={!menuAbierto}
      >
        {/* Fondo oscuro que cierra el panel al tocarlo */}
        <div
          onClick={() => setMenuAbierto(false)}
          className={`absolute inset-0 bg-black/50 transition-opacity duration-300 ${
            menuAbierto ? 'opacity-100' : 'opacity-0'
          }`}
        />

        {/* El panel que entra desde la izquierda */}
        <aside
          className={`absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-[var(--superficie)] shadow-xl transition-transform duration-300 ${
            menuAbierto ? 'translate-x-0' : '-translate-x-full'
          }`}
          role="dialog"
          aria-modal="true"
        >
          {/* Cabecera del panel */}
          <div className="flex items-center justify-between border-b border-[var(--borde)] px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-marca-600 font-bold text-white">
                CV
              </span>
              <span className="text-lg font-semibold">ContaVen</span>
            </div>
            <button
              onClick={() => setMenuAbierto(false)}
              className="grid h-8 w-8 place-items-center rounded-lg text-xl leading-none texto-suave transition hover:bg-[var(--fondo)] hover:text-[var(--texto)]"
              aria-label="Cerrar menú"
            >
              ×
            </button>
          </div>

          {/* Datos del usuario */}
          <div className="border-b border-[var(--borde)] px-4 py-3">
            <p className="truncate text-sm font-medium">{perfil?.nombre || 'Mi negocio'}</p>
            <p className="truncate text-xs texto-suave">{usuario?.email}</p>
          </div>

          {/* Opciones de navegación */}
          <nav className="flex-1 space-y-1 overflow-y-auto p-3">
            {ENLACES.map((enlace) => (
              <NavLink
                key={enlace.ruta}
                to={enlace.ruta}
                onClick={() => setMenuAbierto(false)}
                className={({ isActive }) =>
                  [
                    'block rounded-lg px-3 py-2.5 text-sm font-medium transition',
                    isActive
                      ? 'bg-marca-600 text-white'
                      : 'texto-suave hover:bg-[var(--fondo)] hover:text-[var(--texto)]',
                  ].join(' ')
                }
              >
                {enlace.texto}
              </NavLink>
            ))}
          </nav>

          {/* Pie: licencia y cerrar sesión */}
          <div className="space-y-3 border-t border-[var(--borde)] p-4">
            <AvisoLicencia
              licenciaVencida={licenciaVencida}
              diasRestantes={diasRestantes}
              fechaFin={perfil?.fecha_fin_licencia}
              ancho
            />

            <button
              onClick={manejarSalir}
              className="w-full rounded-lg border border-[var(--borde)] px-3 py-2.5 text-sm font-medium transition hover:bg-error-500/10 hover:text-error-600"
            >
              Cerrar sesión
            </button>
          </div>
        </aside>
      </div>
    </>
  )
}

/**
 * Un enlace individual de la barra de navegación (escritorio).
 * Se pone azul cuando la pantalla está activa.
 * @param {object} props - { ruta, texto }
 * @returns {JSX.Element}
 */
function EnlaceNav({ ruta, texto }) {
  return (
    <NavLink
      to={ruta}
      className={({ isActive }) =>
        [
          'rounded-lg px-3 py-1.5 text-sm font-medium transition',
          isActive
            ? 'bg-marca-600 text-white'
            : 'texto-suave hover:bg-[var(--fondo)] hover:text-[var(--texto)]',
        ].join(' ')
      }
    >
      {texto}
    </NavLink>
  )
}

/**
 * Aviso de licencia: dice cuántos días quedan o si ya venció.
 * @param {object} props - { licenciaVencida, diasRestantes, fechaFin, ancho }
 * @returns {JSX.Element}
 */
function AvisoLicencia({ licenciaVencida, diasRestantes, fechaFin, ancho = false }) {
  if (licenciaVencida) {
    return (
      <div
        className={`rounded-lg bg-amber-100 px-3 py-1.5 text-xs font-medium text-amber-800 ${
          ancho ? 'text-center' : ''
        }`}
        title="Tu licencia venció. Puedes seguir usando la app."
      >
        Licencia vencida
      </div>
    )
  }

  return (
    <div
      className={`rounded-lg bg-exito-500/10 px-3 py-1.5 text-xs font-medium text-exito-600 ${
        ancho ? 'text-center' : ''
      }`}
      title={`Tu licencia vence el ${fechaFin?.slice(0, 10) || '—'}`}
    >
      {diasRestantes} {diasRestantes === 1 ? 'día' : 'días'} de licencia
    </div>
  )
}
