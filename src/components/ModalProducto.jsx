/*
 * (ModalProducto.jsx)
 * Ventana emergente para registrar o editar un producto del inventario.
 *
 * El mismo formulario sirve para las dos cosas: si recibe un producto
 * muestra sus datos y el botón dice "Guardar cambios"; si no lo recibe,
 * es un producto nuevo y el botón dice "Registrar producto".
 *
 * Los precios de VES y USD se calculan solos entre sí con la tasa del dólar.
 */

import { useState } from 'react'

import Modal from './Modal'
import { redondear, usdAVes, vesAUsd } from '../utils/formato'

// Un producto sin datos, para empezar el formulario vacío
const PRODUCTO_VACIO = {
  nombre: '',
  stock: '',
  tipo: '',
  descripcion: '',
  sku: '',
  precio_ves: '',
  precio_usd: '',
  precio_compra_ves: '',
  precio_compra_usd: '',
}

/**
 * Prepara los datos del formulario a partir del producto que se está editando.
 * @param {object|null} producto - El producto a editar, o null si es nuevo
 * @returns {object} - Los valores iniciales de los campos
 */
function datosIniciales(producto) {
  if (!producto) return PRODUCTO_VACIO

  return {
    nombre: producto.nombre || '',
    stock: String(producto.stock ?? ''),
    tipo: producto.tipo || '',
    descripcion: producto.descripcion || '',
    sku: producto.sku || '',
    precio_ves: String(producto.precio_ves ?? ''),
    precio_usd: String(producto.precio_usd ?? ''),
    precio_compra_ves: String(producto.precio_compra_ves ?? ''),
    precio_compra_usd: String(producto.precio_compra_usd ?? ''),
  }
}

/**
 * Muestra la ventana con el formulario del producto.
 *
 * La pantalla de Inventario le pasa una "key" que cambia cada vez que se abre
 * la ventana con otro producto. Eso hace que React monte este componente de
 * nuevo y el formulario empiece siempre con los datos correctos, sin usar un
 * efecto para eso.
 *
 * @param {object} props - {
 *   abierto, producto, tasa, guardando,
 *   alGuardar, alCerrar
 * }
 * @returns {JSX.Element}
 */
export default function ModalProducto({ abierto, producto, tasa, guardando, alGuardar, alCerrar }) {
  // --- Estado del formulario ---
  const [formulario, setFormulario] = useState(() => datosIniciales(producto))
  const [errores, setErrores] = useState({})

  /**
   * Escribe en un campo normal.
   * @param {object} evento - El evento del input
   */
  function manejarCambio(evento) {
    const { name, value } = evento.target
    setFormulario((anterior) => ({ ...anterior, [name]: value }))
  }

  /**
   * Escribe en un campo de precio y calcula el de la otra moneda.
   * @param {object} evento - El evento del input
   */
  function manejarCambioPrecio(evento) {
    const { name, value } = evento.target

    // Si el campo quedó vacío, se vacía también el del otro lado
    if (value === '') {
      setFormulario((anterior) => {
        const copia = { ...anterior, [name]: '' }
        if (name === 'precio_ves') copia.precio_usd = ''
        if (name === 'precio_usd') copia.precio_ves = ''
        if (name === 'precio_compra_ves') copia.precio_compra_usd = ''
        if (name === 'precio_compra_usd') copia.precio_compra_ves = ''
        return copia
      })
      return
    }

    const monto = Number(value)

    // Sin tasa del dólar se guarda el monto tal como está
    if (!tasa) {
      setFormulario((anterior) => ({ ...anterior, [name]: value }))
      return
    }

    // Se escribe en VES y se calcula el USD
    if (name === 'precio_ves') {
      setFormulario((anterior) => ({
        ...anterior,
        precio_ves: redondear(monto),
        precio_usd: vesAUsd(monto, tasa),
      }))
      return
    }

    // Se escribe en USD y se calcula el VES
    if (name === 'precio_usd') {
      setFormulario((anterior) => ({
        ...anterior,
        precio_usd: redondear(monto),
        precio_ves: usdAVes(monto, tasa),
      }))
      return
    }

    // Compra en VES -> se calcula el USD
    if (name === 'precio_compra_ves') {
      setFormulario((anterior) => ({
        ...anterior,
        precio_compra_ves: redondear(monto),
        precio_compra_usd: vesAUsd(monto, tasa),
      }))
      return
    }

    // Compra en USD -> se calcula el VES
    setFormulario((anterior) => ({
      ...anterior,
      precio_compra_usd: redondear(monto),
      precio_compra_ves: usdAVes(monto, tasa),
    }))
  }

  /**
   * Revisa que los campos obligatorios estén completos.
   * @returns {boolean} - Si el formulario está válido
   */
  function validar() {
    const nuevosErrores = {}

    if (!formulario.nombre.trim()) {
      nuevosErrores.nombre = 'El nombre es obligatorio.'
    }

    if (formulario.stock === '') {
      nuevosErrores.stock = 'El stock es obligatorio.'
    } else if (Number(formulario.stock) < 0) {
      nuevosErrores.stock = 'El stock no puede ser negativo.'
    }

    if (!formulario.precio_ves && !formulario.precio_usd) {
      nuevosErrores.precio = 'Coloca el precio de venta en VES o en USD.'
    }

    setErrores(nuevosErrores)
    return Object.keys(nuevosErrores).length === 0
  }

  /**
   * Manda el producto al backend.
   * @param {object} evento - El evento del formulario
   */
  function manejarEnvio(evento) {
    evento.preventDefault()

    if (!validar()) return

    alGuardar({
      nombre: formulario.nombre.trim(),
      stock: Number(formulario.stock),
      tipo: formulario.tipo.trim(),
      descripcion: formulario.descripcion.trim(),
      sku: formulario.sku.trim(),
      precio_ves: Number(formulario.precio_ves) || 0,
      precio_usd: Number(formulario.precio_usd) || 0,
      precio_compra_ves: Number(formulario.precio_compra_ves) || 0,
      precio_compra_usd: Number(formulario.precio_compra_usd) || 0,
    })
  }

  return (
    <Modal abierto={abierto} titulo={producto ? 'Editar producto' : 'Registrar producto'} alCerrar={alCerrar}>
      <form onSubmit={manejarEnvio} className="space-y-5">

        {/* --- Datos básicos --- */}
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Nombre (obligatorio) */}
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium">
              Nombre <span className="text-error-500">*</span>
            </label>
            <input
              name="nombre"
              type="text"
              value={formulario.nombre}
              onChange={manejarCambio}
              placeholder="Arroz"
              autoFocus
              className={`campo ${errores.nombre ? 'border-red-400' : ''}`}
            />
            {errores.nombre && <p className="mt-1 text-xs text-red-600">{errores.nombre}</p>}
          </div>

          {/* Stock (obligatorio) */}
          <div>
            <label className="mb-1 block text-sm font-medium">
              Stock <span className="text-error-500">*</span>
            </label>
            <input
              name="stock"
              type="number"
              min="0"
              value={formulario.stock}
              onChange={manejarCambio}
              placeholder="50"
              className={`campo ${errores.stock ? 'border-red-400' : ''}`}
            />
            {errores.stock && <p className="mt-1 text-xs text-red-600">{errores.stock}</p>}
          </div>

          {/* Tipo (opcional) */}
          <div>
            <label className="mb-1 block text-sm font-medium">Tipo</label>
            <input
              name="tipo"
              type="text"
              value={formulario.tipo}
              onChange={manejarCambio}
              placeholder="Alimento, Bebida..."
              className="campo"
            />
          </div>

          {/* Código SKU (opcional) */}
          <div>
            <label className="mb-1 block text-sm font-medium">Código SKU</label>
            <input
              name="sku"
              type="text"
              value={formulario.sku}
              onChange={manejarCambio}
              placeholder="ARR-001"
              className="campo"
            />
          </div>

          {/* Descripción (opcional) */}
          <div>
            <label className="mb-1 block text-sm font-medium">Descripción</label>
            <input
              name="descripcion"
              type="text"
              value={formulario.descripcion}
              onChange={manejarCambio}
              placeholder="Arroz blanco de 5kg"
              className="campo"
            />
          </div>
        </div>

        {/* --- Precios de venta --- */}
        <div className="rounded-lg border border-[var(--borde)] p-4">
          <p className="mb-3 text-sm font-semibold">Precios de venta</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Precio en VES</label>
              <input
                name="precio_ves"
                type="number"
                step="0.01"
                min="0"
                value={formulario.precio_ves}
                onChange={manejarCambioPrecio}
                placeholder="0.00"
                className={`campo ${errores.precio ? 'border-red-400' : ''}`}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Precio en USD</label>
              <input
                name="precio_usd"
                type="number"
                step="0.01"
                min="0"
                value={formulario.precio_usd}
                onChange={manejarCambioPrecio}
                placeholder="0.00"
                className={`campo ${errores.precio ? 'border-red-400' : ''}`}
              />
            </div>
          </div>
          {errores.precio && <p className="mt-1 text-xs text-red-600">{errores.precio}</p>}
          {tasa && (
            <p className="mt-2 text-xs texto-suave">
              Se usa la tasa de Bs. {tasa} por dólar. Escribe en una moneda y la otra se calcula sola.
            </p>
          )}
        </div>

        {/* --- Precios de compra (opcionales) --- */}
        <div className="rounded-lg border border-[var(--borde)] p-4">
          <p className="mb-3 text-sm font-semibold">
            Precios de compra{' '}
            <span className="texto-suave font-normal">(opcional, se usa para calcular la ganancia)</span>
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Compra en VES</label>
              <input
                name="precio_compra_ves"
                type="number"
                step="0.01"
                min="0"
                value={formulario.precio_compra_ves}
                onChange={manejarCambioPrecio}
                placeholder="0.00"
                className="campo"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Compra en USD</label>
              <input
                name="precio_compra_usd"
                type="number"
                step="0.01"
                min="0"
                value={formulario.precio_compra_usd}
                onChange={manejarCambioPrecio}
                placeholder="0.00"
                className="campo"
              />
            </div>
          </div>
        </div>

        {/* --- Botones --- */}
        <div className="flex flex-wrap justify-end gap-3 border-t border-[var(--borde)] pt-4">
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
            {guardando ? 'Guardando...' : producto ? 'Guardar cambios' : 'Registrar producto'}
          </button>
        </div>
      </form>
    </Modal>
  )
}