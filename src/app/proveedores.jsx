'use client'

/*
 * (proveedores.jsx)
 * Junta todos los contextos de la app en un solo lugar.
 *
 * Orden de los proveedores:
 *   1. Toasts    -> para los avisos flotantes
 *   2. Sesión    -> para el login, la licencia y el tema
 *   3. Datos     -> para la base local y la sincronización
 *
 * El layout raíz usa este componente para que cualquier pantalla
 * tenga acceso a los tres.
 */

import { ProveedorSesion } from '../context/AuthContext'
import { ProveedorDatos } from '../context/DbContext'
import { ProveedorToasts } from '../components/ui/Toasts'

/**
 * Envuelve los hijos con todos los contextos de la app.
 * @param {object} props - { children }
 * @returns {JSX.Element}
 */
export default function Proveedores({ children }) {
  return (
    <ProveedorToasts>
      <ProveedorSesion>
        <ProveedorDatos>{children}</ProveedorDatos>
      </ProveedorSesion>
    </ProveedorToasts>
  )
}
