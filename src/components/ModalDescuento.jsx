'use client'

/*
 * (ModalDescuento.jsx)
 * Ventana emergente para aplicar un descuento a un producto que no se vende.
 *
 * Se abre desde la pantalla de Análisis, en la lista de "Productos sin vender".
 * Solo cambia el descuento por unidad del producto (el % y desde cuántas
 * unidades aplica), sin tocar el resto de sus datos.
 */

import { useState } from 'react'

import ModalContainer from './ui/ModalContainer'
import { formatearVes } from '../lib/formato'

/**
 * Ventana para editar el descuento de un producto.
 * @param {object} props - { abierto, producto, guardando, alGuardar, alCerrar }
 * @returns {JSX.Element|null}
 */
export default function ModalDescuento({ abierto, producto, guardando, alGuardar, alCerrar }) {
  // El descuento arranca con lo que ya tenía el producto (o vacío)
  const [porcentaje, setPorcentaje] = useState(
    Number(producto?.descuento_unidad_porcentaje) > 0
      ? String(producto.descuento_unidad_porcentaje)
      : '',
  )
  const [desde, setDesde] = useState(
    Number(producto?.descuento_unidad_desde) > 1
      ? String(producto.descuento_unidad_desde)
      : '5',
  )
  const [error, setError] = useState('')

  if (!producto) return null

  /**
   * Revisa que el descuento sea válido y lo manda a guardar.
   * @param {Event} evento
   */
  function manejarEnvio(evento) {
    evento.preventDefault()
    setError('')

    const valor = Number(porcentaje)

    if (!(valor > 0) || valor > 100) {
      setError('El porcentaje de descuento debe estar entre 1 y 100.')
      return
    }

    if ((Number(desde) || 0) < 2) {
      setError('El descuento por cantidad aplica desde 2 unidades o más.')
      return
    }

    // Solo se envían los datos del producto con el descuento actualizado
    alGuardar(producto.id, {
      ...producto,
      descuento_unidad_porcentaje: valor,
      descuento_unidad_desde: Number(desde),
    })
  }

  // Precio con el descuento aplicado, para que el dueño vea el efecto
  const precioConDescuento =
    Number(producto.precio_ves) > 0 && Number(porcentaje) > 0
      ? Number(producto.precio_ves) * (1 - Number(porcentaje) / 100)
      : 0

  return (
    <ModalContainer
      abierto={abierto}
      titulo="Descuento para producto sin ventas"
      alCerrar={alCerrar}
      ancho="max-w-lg"
    >
      <form onSubmit={manejarEnvio} className="space-y-4">
        {/* --- Datos del producto --- */}
        <div className="rounded-lg bg-[var(--fondo)] p-4">
          <p className="font-semibold">{producto.nombre}</p>
          <p className="mt-0.5 text-sm texto-suave">
            {producto.sku ? `${producto.sku} · ` : ''}
            Precio actual: Bs. {formatearVes(producto.precio_ves)}
          </p>
        </div>

        {error && (
          <p className="rounded-md bg-red-500/10 px-3 py-2 text-sm text-red-600">{error}</p>
        )}

        {/* --- Campos del descuento --- */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">Descuento (%)</label>
            <input
              type="number"
              step="0.01"
              min="1"
              max="100"
              value={porcentaje}
              onChange={(e) => setPorcentaje(e.target.value)}
              placeholder="10"
              autoFocus
              className="campo"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Desde cuántas unidades</label>
            <input
              type="number"
              min="2"
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
              placeholder="5"
              className="campo"
            />
          </div>
        </div>

        {precioConDescuento > 0 && (
          <div className="rounded-md bg-exito-500/10 px-3 py-2 text-sm">
            <span className="texto-suave">Precio con descuento: </span>
            <span className="font-semibold text-exito-600">
              Bs. {formatearVes(precioConDescuento)}
            </span>
          </div>
        )}

        <p className="text-xs texto-suave">
          El punto de venta aplicará este descuento cuando el cliente se lleve esa cantidad de
          unidades o más. Ayuda a mover los productos que se están quedando en el inventario.
        </p>

        {/* --- Botones --- */}
        <div className="flex justify-end gap-3 border-t border-[var(--borde)] pt-4">
          <button
            type="button"
            onClick={alCerrar}
            className="rounded-lg border border-[var(--borde)] px-5 py-2.5 text-sm font-medium transition hover:bg-[var(--fondo)]"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={guardando}
            className="rounded-lg bg-marca-600 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-marca-700 disabled:opacity-60"
          >
            {guardando ? 'Guardando...' : 'Guardar descuento'}
          </button>
        </div>
      </form>
    </ModalContainer>
  )
}
