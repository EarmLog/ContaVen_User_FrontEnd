/*
 * (Inicio.jsx)
 * Pantalla de Inicio (Dashboard) de la app de usuarios.
 *
 * Muestra un resumen rápido:
 *  - Ventas y ganancia de hoy (en VES y USD)
 *  - Productos vendidos hoy
 *  - Productos con poco stock
 *  - Precio del dólar actual
 */

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import * as api from '../services/api'
import Aviso from '../components/Aviso'
import Cargando from '../components/Cargando'
import { useSesion } from '../context/SesionProveedor'
import { formatearUsd, formatearVes } from '../utils/formato'

/**
 * Componente del Dashboard.
 * @returns {JSX.Element}
 */
export default function Inicio() {
  // Se traen los datos del usuario y el precio del dólar
  const { perfil, dolar } = useSesion()

  // --- Estado de la pantalla ---
  const [datos, setDatos] = useState(null)
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(true)

  /**
   * Pide al backend lo que se vendió hoy y el resumen general.
   */
  useEffect(() => {
    let montado = true

    async function cargar() {
      try {
        const [delDia, resumen] = await Promise.all([
          api.obtenerVentasDelDia(),
          api.obtenerResumen(),
        ])

        if (montado) setDatos({ delDia, resumen })
      } catch (errorCarga) {
        if (montado) setError(errorCarga.message)
      } finally {
        if (montado) setCargando(false)
      }
    }

    cargar()
    return () => { montado = false }
  }, [])

  // Mientras llegan los datos se muestra el spinner
  if (cargando) return <Cargando mensaje="Cargando tu resumen..." />

  const totales = datos?.delDia.totales || {}
  const productos = datos?.delDia.productos || []
  const stockBajo = datos?.resumen.stock_bajo || []

  return (
    <div className="space-y-6">

      {/* --- Saludo con el nombre del usuario --- */}
      <div>
        <h1 className="text-2xl font-semibold">Hola, {perfil?.nombre?.split(' ')[0]}</h1>
        <p className="mt-1 text-sm texto-suave">Este es el resumen de tu negocio hoy.</p>
      </div>

      <Aviso tipo="error" mensaje={error} alCerrar={() => setError('')} />

      {/* --- Tarjetas con las cifras de hoy --- */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

        <Tarjeta
          titulo="Ventas de hoy"
          valor_ves={totales.ingresos_ves}
          valor_usd={totales.ingresos_usd}
          detalle={`${totales.ventas || 0} venta(s) realizadas`}
        />

        <Tarjeta
          titulo="Ganancia de hoy"
          valor_ves={totales.ganancia_ves}
          valor_usd={totales.ganancia_usd}
          detalle="Venta menos costo de compra"
          esGanancia
        />

        <Tarjeta
          titulo="Precio del dólar"
          valor_ves={dolar?.precio_ves}
          solo_ves
          detalle={dolar?.origen === 'internet' ? 'Actualizado por internet' : 'Tasa configurada'}
        />

        <Tarjeta
          titulo="Licencia"
          valor_texto={perfil?.licencia_vencida ? 'Vencida' : `${perfil?.dias_restantes ?? 0} días`}
          texto_principal={perfil?.licencia_vencida}
          detalle={perfil?.licencia_vencida ? 'Puedes seguir trabajando' : 'Licencia activa'}
        />
      </div>

      {/* --- Productos vendidos hoy --- */}
      <section className="tarjeta overflow-hidden">
        <div className="flex items-center justify-between border-b border-[var(--borde)] px-5 py-4">
          <h2 className="font-semibold">Productos vendidos hoy</h2>
          <Link to="/pos" className="text-sm font-medium text-marca-600 hover:underline">
            Ir al POS
          </Link>
        </div>

        {productos.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm texto-suave">
            Todavía no has vendido nada hoy.
          </p>
        ) : (
          <>
            {/* --- Vista de tabla (pantallas medianas y grandes) --- */}
            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full text-sm">
                <thead className="bg-[var(--fondo)] text-left text-xs texto-suave uppercase">
                  <tr>
                    <th className="px-5 py-2 font-medium">Producto</th>
                    <th className="px-5 py-2 text-right font-medium">Unidades</th>
                    <th className="px-5 py-2 text-right font-medium">Precio unitario</th>
                    <th className="px-5 py-2 text-right font-medium">Subtotal</th>
                    <th className="px-5 py-2 text-right font-medium">Ganancia</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--borde)]">
                  {productos.map((producto, indice) => (
                    <tr key={indice}>
                      <td className="px-5 py-2.5 font-medium">{producto.producto_nombre}</td>
                      <td className="px-5 py-2.5 text-right">{producto.unidades}</td>
                      <td className="px-5 py-2.5 text-right texto-suave">
                        {formatearVes(producto.precio_unitario_ves)}
                      </td>
                      <td className="px-5 py-2.5 text-right font-medium">
                        {formatearVes(producto.subtotal_ves)}
                      </td>
                      <td className="px-5 py-2.5 text-right font-medium text-exito-600">
                        {formatearVes(producto.ganancia_ves)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* --- Vista de tarjetas (teléfonos) --- */}
            <ul className="divide-y divide-[var(--borde)] sm:hidden">
              {productos.map((producto, indice) => (
                <li key={indice} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-medium">{producto.producto_nombre}</p>
                    <span className="shrink-0 rounded-full bg-[var(--fondo)] px-2.5 py-1 text-xs font-medium">
                      {producto.unidades} und.
                    </span>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                    <span className="texto-suave">
                      Precio: {formatearVes(producto.precio_unitario_ves)}
                    </span>
                    <span className="font-medium">
                      Subtotal: {formatearVes(producto.subtotal_ves)}
                    </span>
                    <span className="font-medium text-exito-600">
                      Ganancia: {formatearVes(producto.ganancia_ves)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      {/* --- Productos con poco stock --- */}
      {stockBajo.length > 0 && (
        <section className="tarjeta overflow-hidden">
          <div className="flex items-center justify-between border-b border-[var(--borde)] px-5 py-4">
            <h2 className="font-semibold">Productos con poco stock</h2>
            <Link to="/inventario" className="text-sm font-medium text-marca-600 hover:underline">
              Ir al inventario
            </Link>
          </div>

          <div className="flex flex-wrap gap-2 p-5">
            {stockBajo.map((producto) => (
              <span
                key={producto.id}
                className="rounded-lg bg-amber-50 px-3 py-1.5 text-sm text-amber-800"
              >
                {producto.nombre}: <strong>{producto.stock}</strong> und.
              </span>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

/**
 * Tarjeta con una cifra del resumen.
 * @param {object} props - { titulo, valor_ves, valor_usd, solo_ves, valor_texto, detalle, esGanancia, texto_principal }
 * @returns {JSX.Element}
 */
function Tarjeta({ titulo, valor_ves, valor_usd, solo_ves, valor_texto, detalle, esGanancia, texto_principal }) {
  return (
    <div className="tarjeta p-5">
      <p className="text-xs font-medium texto-suave uppercase">{titulo}</p>

      {/* Si se pasó texto en vez de monto (ejemplo: "30 días") */}
      {valor_texto !== undefined ? (
        <p className={`mt-2 text-2xl font-bold ${texto_principal ? 'text-amber-600' : ''}`}>
          {valor_texto}
        </p>
      ) : (
        <>
          {/* Monto en bolívares */}
          <p className={`mt-2 text-2xl font-bold ${esGanancia ? 'text-exito-600' : ''}`}>
            Bs. {formatearVes(valor_ves || 0)}
          </p>

          {/* Monto en dólares, si no se pidió solo VES */}
          {!solo_ves && (
            <p className="mt-0.5 text-sm texto-suave">{formatearUsd(valor_usd || 0)}</p>
          )}
        </>
      )}

      {detalle && <p className="mt-2 text-xs texto-suave">{detalle}</p>}
    </div>
  )
}
