/*
 * (App.jsx)
 * Rutas de la app de usuarios de ContaVen.
 *
 * - "/"        -> manda al Inicio
 * - "/login"   -> pantalla de inicio de sesión
 * - "/registro"-> pantalla de registro
 * - Las demás pantallas (inicio, inventario, pos, análisis y configuración)
 *   están protegidas: si el usuario no tiene sesión, lo mandan al login.
 */

import { Navigate, Route, Routes } from 'react-router-dom'

import NavBar from './components/NavBar'
import RutaProtegida from './components/RutaProtegida'
import Analisis from './pages/Analisis'
import Configuracion from './pages/Configuracion'
import Inicio from './pages/Inicio'
import Inventario from './pages/Inventario'
import Login from './pages/Login'
import Pos from './pages/Pos'
import Registro from './pages/Registro'

/**
 * Componente con todas las rutas de la app.
 * @returns {JSX.Element}
 */
export default function App() {
  return (
    <Routes>

      {/* --- Pantallas de acceso (no necesitan sesión) --- */}
      <Route path="/login" element={<Login />} />
      <Route path="/registro" element={<Registro />} />

      {/* --- Pantallas de la app (necesitan sesión) --- */}
      <Route
        path="/inicio"
        element={
          <RutaProtegida>
            <ConNavbar>
              <Inicio />
            </ConNavbar>
          </RutaProtegida>
        }
      />

      <Route
        path="/inventario"
        element={
          <RutaProtegida>
            <ConNavbar>
              <Inventario />
            </ConNavbar>
          </RutaProtegida>
        }
      />

      <Route
        path="/pos"
        element={
          <RutaProtegida>
            <ConNavbar>
              <Pos />
            </ConNavbar>
          </RutaProtegida>
        }
      />

      <Route
        path="/analisis"
        element={
          <RutaProtegida>
            <ConNavbar>
              <Analisis />
            </ConNavbar>
          </RutaProtegida>
        }
      />

      <Route
        path="/configuracion"
        element={
          <RutaProtegida>
            <ConNavbar>
              <Configuracion />
            </ConNavbar>
          </RutaProtegida>
        }
      />

      {/* --- La raíz manda al Inicio --- */}
      <Route path="/" element={<Navigate to="/inicio" replace />} />

      {/* --- Cualquier ruta que no exista vuelve al Inicio --- */}
      <Route path="*" element={<Navigate to="/inicio" replace />} />
    </Routes>
  )
}

/**
 * Pone la barra de navegación arriba de la pantalla.
 * @param {object} props - { children }
 * @returns {JSX.Element}
 */
function ConNavbar({ children }) {
  return (
    <div className="min-h-screen">
      <NavBar />
      <main className="mx-auto max-w-7xl px-4 pb-10">
        {children}
      </main>
    </div>
  )
}
