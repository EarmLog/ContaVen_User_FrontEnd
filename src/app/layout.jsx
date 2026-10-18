/*
 * (layout.jsx)
 * Layout raíz de la app de usuarios de ContaVen.
 *
 * Aquí se envuelve toda la app con los contextos (sesión, datos y avisos)
 * y se deja preparado el modo claro u oscuro desde antes de pintar la
 * pantalla, para que no haya un parpadeo cuando el usuario eligió oscuro.
 */

import Proveedores from './proveedores'
import '../styles/globals.css'

// Título y descripción que se ven en la pestaña del navegador
export const metadata = {
  title: 'ContaVen',
  description: 'Inventario, punto de venta y análisis para tu negocio.',
}

/*
 * Este pedacito de código se ejecuta antes de dibujar la pantalla.
 * Lee el tema guardado y pone la clase "oscuro" si hace falta, así la
 * app se abre directo en el modo correcto.
 */
const scriptTema = `
try {
  var tema = localStorage.getItem('contaven_tema');
  if (tema === 'oscuro') document.documentElement.classList.add('oscuro');
} catch (e) {}
`

/**
 * Estructura base de todas las páginas.
 * @param {object} props - { children }
 * @returns {JSX.Element}
 */
export default function RootLayout({ children }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        {/* Se aplica el tema guardado antes de pintar */}
        <script dangerouslySetInnerHTML={{ __html: scriptTema }} />
      </head>
      <body>
        <Proveedores>{children}</Proveedores>
      </body>
    </html>
  )
}
