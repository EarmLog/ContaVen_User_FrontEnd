/*
 * (not-found.jsx)
 * Página que Next.js muestra cuando alguien entra a una dirección que no
 * existe (cualquier ruta que no esté definida en src/app).
 */

import Link from 'next/link'

/**
 * Pantalla de "página no encontrada".
 * @returns {JSX.Element}
 */
export default function NoEncontrado() {
  return (
    <main className="grid min-h-screen place-items-center bg-[var(--fondo)] px-6 py-12">
      <div className="w-full max-w-md text-center">
        <p className="text-6xl font-bold text-marca-600">404</p>

        <h1 className="mt-3 text-xl font-semibold">Esta página no existe</h1>

        <p className="mt-2 text-sm texto-suave">
          Puede que el enlace esté equivocado o que esa pantalla se haya movido
          de lugar.
        </p>

        <div className="mt-6 flex flex-col gap-3">
          <Link
            href="/inicio"
            className="rounded-lg bg-marca-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-marca-700"
          >
            Volver al inicio
          </Link>

          <Link
            href="/login"
            className="text-sm font-medium text-marca-600 hover:underline"
          >
            Ir a iniciar sesión
          </Link>
        </div>
      </div>
    </main>
  )
}
