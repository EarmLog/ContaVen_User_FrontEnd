/*
 * (main.jsx)
 * Punto de entrada de la app de usuarios de ContaVen.
 *
 * Aquí se monta React, se envuelve con el ProveedorSesion (que guarda
 * el login, la licencia y el precio del dólar) y con el BrowserRouter
 * (que maneja las rutas de la app).
 */

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'

import App from './App'
import { ProveedorSesion } from './context/SesionProveedor'
import './index.css'

// Se lee el tema que se guardó en el navegador para aplicarlo de una vez
const temaGuardado = localStorage.getItem('contaven_tema')
if (temaGuardado === 'oscuro') {
  document.documentElement.classList.add('oscuro')
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <ProveedorSesion>
        <App />
      </ProveedorSesion>
    </BrowserRouter>
  </StrictMode>,
)
