/*
 * (ModalProducto.jsx)
 * Ventana emergente para registrar o editar un producto del inventario.
 *
 * El mismo formulario sirve para las dos cosas: si recibe un producto
 * muestra sus datos y el botón dice "Guardar cambios"; si no lo recibe,
 * es un producto nuevo y el botón dice "Registrar producto".
 *
 * Tiene dos modos, según cómo se venda el producto:
 *   - "unidad": el producto se vende suelto. Se escriben los precios por
 *     unidad y, si se quiere, un descuento por cantidad (un % que aplica
 *     a partir de cierta cantidad de unidades).
 *   - "bulto":  el producto se vende por bulto (una caja con varias
 *     unidades). Se escribe cuántas unidades trae el bulto y el precio
 *     del bulto; el precio por unidad se calcula solo (bulto ÷ unidades).
 *     Además se puede poner un descuento por comprar el bulto completo y
 *     un precio al mayor.
 *
 * Los precios de VES y USD se calculan solos entre sí con la tasa del dólar.
 * En el modo bulto lo mismo pasa con el precio del bulto y el de compra.
 */

import { useState } from 'react'

import ModalContainer from './ui/ModalContainer'
import { formatearUsd, formatearVes, redondear, usdAVes, vesAUsd } from '../lib/formato'

// Un producto sin datos, para empezar el formulario vacío
const PRODUCTO_VACIO = {
  nombre: '',
  stock: '',
  tipo: '',
  marca: '',
  variante: '',
  descripcion: '',
  sku: '',
  precio_ves: '',
  precio_usd: '',
  precio_compra_ves: '',
  precio_compra_usd: '',
  unidades_por_bulto: '',
  cantidad_mayor: '',
  precio_mayor_ves: '',
  precio_mayor_usd: '',
  descuento_unidad_porcentaje: '',
  descuento_unidad_desde: '',
  descuento_bulto_porcentaje: '',
  // Campos que solo existen en la pantalla del modo bulto: aquí se escribe
  // el precio del bulto y de ahí sale el precio por unidad.
  precio_bulto_ves: '',
  precio_bulto_usd: '',
  precio_compra_bulto_ves: '',
  precio_compra_bulto_usd: '',
}

// Cada campo de precio y el campo de la otra moneda que se calcula con él
const PARES_DE_PRECIO = {
  precio_ves: 'precio_usd',
  precio_usd: 'precio_ves',
  precio_compra_ves: 'precio_compra_usd',
  precio_compra_usd: 'precio_compra_ves',
  precio_mayor_ves: 'precio_mayor_usd',
  precio_mayor_usd: 'precio_mayor_ves',
  precio_bulto_ves: 'precio_bulto_usd',
  precio_bulto_usd: 'precio_bulto_ves',
  precio_compra_bulto_ves: 'precio_compra_bulto_usd',
  precio_compra_bulto_usd: 'precio_compra_bulto_ves',
}

/**
 * Prepara los datos del formulario a partir del producto que se está editando.
 * @param {object|null} producto - El producto a editar, o null si es nuevo
 * @returns {object} - Los valores iniciales de los campos
 */
function datosIniciales(producto) {
  if (!producto) return { ...PRODUCTO_VACIO }

  const unidades = Number(producto.unidades_por_bulto) || 1

  return {
    nombre: producto.nombre || '',
    stock: String(producto.stock ?? ''),
    tipo: producto.tipo || '',
    marca: producto.marca || '',
    variante: producto.variante || '',
    descripcion: producto.descripcion || '',
    sku: producto.sku || '',
    precio_ves: String(producto.precio_ves ?? ''),
    precio_usd: String(producto.precio_usd ?? ''),
    precio_compra_ves: String(producto.precio_compra_ves ?? ''),
    precio_compra_usd: String(producto.precio_compra_usd ?? ''),
    // Los campos de bulto se muestran vacíos cuando valen 1 (el valor normal)
    unidades_por_bulto: unidades > 1 ? String(unidades) : '',
    cantidad_mayor:
      producto.cantidad_mayor && producto.cantidad_mayor > 1
        ? String(producto.cantidad_mayor)
        : '',
    precio_mayor_ves: producto.precio_mayor_ves ? String(producto.precio_mayor_ves) : '',
    precio_mayor_usd: producto.precio_mayor_usd ? String(producto.precio_mayor_usd) : '',
    descuento_unidad_porcentaje: producto.descuento_unidad_porcentaje
      ? String(producto.descuento_unidad_porcentaje)
      : '',
    descuento_unidad_desde:
      producto.descuento_unidad_desde && producto.descuento_unidad_desde > 1
        ? String(producto.descuento_unidad_desde)
        : '',
    descuento_bulto_porcentaje: producto.descuento_bulto_porcentaje
      ? String(producto.descuento_bulto_porcentaje)
      : '',
    // El precio del bulto se arma con el precio por unidad y la cantidad
    precio_bulto_ves: producto.precio_ves
      ? String(redondear(Number(producto.precio_ves) * unidades))
      : '',
    precio_bulto_usd: producto.precio_usd
      ? String(redondear(Number(producto.precio_usd) * unidades))
      : '',
    precio_compra_bulto_ves: producto.precio_compra_ves
      ? String(redondear(Number(producto.precio_compra_ves) * unidades))
      : '',
    precio_compra_bulto_usd: producto.precio_compra_usd
      ? String(redondear(Number(producto.precio_compra_usd) * unidades))
      : '',
  }
}

function limpiarTextoSKU(texto = '') {
  return (texto || '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
}

function generarSkuPreview({ nombre = '', tipo = '', marca = '', variante = '' } = {}) {
  const limpioNombre = limpiarTextoSKU(nombre)
  const base = (limpioNombre.slice(0, 3) || 'PRD')
  let extra = limpiarTextoSKU(marca)
  if (!extra) extra = limpiarTextoSKU(variante)
  if (!extra) extra = limpiarTextoSKU(tipo)
  if (extra) return `${base}-${extra.slice(0, 3)}-###`
  return `${base}-###`
}

/**
 * Ventana para registrar o editar un producto.
 * @param {object} props - { abierto, producto, tasa, modo, guardando, alGuardar, alCerrar }
 * @returns {JSX.Element}
 */
export default function ModalProducto({
  abierto,
  producto,
  tasa,
  modo = 'unidad',
  guardando,
  alGuardar,
  alCerrar,
}) {
  // Se traen los datos del producto al formulario (una sola vez al abrir)
  const [formulario, setFormulario] = useState(() => datosIniciales(producto))
  const [errores, setErrores] = useState({})

  // Si el producto ya trae descuentos, las casillas arrancan marcadas
  const [descuentoUnidadActivo, setDescuentoUnidadActivo] = useState(
    Number(producto?.descuento_unidad_porcentaje) > 0,
  )
  const [descuentoBultoActivo, setDescuentoBultoActivo] = useState(
    Number(producto?.descuento_bulto_porcentaje) > 0,
  )

  const esBulto = modo === 'bulto'

  const skuPreview = generarSkuPreview({
    nombre: formulario.nombre,
    tipo: formulario.tipo,
    marca: formulario.marca,
    variante: formulario.variante,
  })

  // Valores derivados del modo bulto: el precio por unidad y la ganancia
  // se calculan solos a partir del precio del bulto.
  const unidades = Number(formulario.unidades_por_bulto) || 1
  const precioBultoVes = Number(formulario.precio_bulto_ves) || 0
  const precioBultoUsd = Number(formulario.precio_bulto_usd) || 0
  const compraBultoVes = Number(formulario.precio_compra_bulto_ves) || 0
  const compraBultoUsd = Number(formulario.precio_compra_bulto_usd) || 0

  const precioUnidadVes = redondear(precioBultoVes / unidades)
  const precioUnidadUsd = redondear(precioBultoUsd / unidades)
  const compraUnidadVes = redondear(compraBultoVes / unidades)
  const compraUnidadUsd = redondear(compraBultoUsd / unidades)
  const gananciaBultoVes = redondear(precioBultoVes - compraBultoVes)
  const gananciaUnidadVes = redondear(precioUnidadVes - compraUnidadVes)

  /**
   * Cambia un campo cualquiera del formulario.
   * @param {Event} evento
   */
  function manejarCambio(evento) {
    const { name, value } = evento.target
    setFormulario((anterior) => ({ ...anterior, [name]: value }))
  }

  /**
   * Cambia un campo de precio y calcula el de la otra moneda.
   * Sirve para el precio normal, el de compra, el del bulto y el al mayor.
   * @param {Event} evento
   */
  function manejarCambioPrecio(evento) {
    const { name, value } = evento.target
    const pareja = PARES_DE_PRECIO[name]

    if (!pareja) return

    // Si se deja en blanco, también se limpia el de la otra moneda
    if (value === '') {
      setFormulario((anterior) => ({ ...anterior, [name]: '', [pareja]: '' }))
      return
    }

    const numero = Number(value)

    // Sin tasa del dólar solo se guarda lo que escribió el usuario
    if (!tasa) {
      setFormulario((anterior) => ({ ...anterior, [name]: value }))
      return
    }

    const esVes = name.endsWith('_ves')
    setFormulario((anterior) => ({
      ...anterior,
      [name]: value,
      [pareja]: String(redondear(esVes ? vesAUsd(numero, tasa) : usdAVes(numero, tasa))),
    }))
  }

  /**
   * Marca o desmarca el descuento por cantidad del modo unidad.
   * @param {boolean} estaActivo
   */
  function alternarDescuentoUnidad(estaActivo) {
    setDescuentoUnidadActivo(estaActivo)
    if (!estaActivo) {
      setFormulario((anterior) => ({
        ...anterior,
        descuento_unidad_porcentaje: '',
        descuento_unidad_desde: '',
      }))
    }
  }

  /**
   * Marca o desmarca el descuento por comprar el bulto completo.
   * @param {boolean} estaActivo
   */
  function alternarDescuentoBulto(estaActivo) {
    setDescuentoBultoActivo(estaActivo)
    if (!estaActivo) {
      setFormulario((anterior) => ({ ...anterior, descuento_bulto_porcentaje: '' }))
    }
  }

  /**
   * Revisa que los datos estén completos antes de guardar.
   * @returns {boolean}
   */
  function validar() {
    const nuevos = {}

    if (!formulario.nombre.trim()) {
      nuevos.nombre = 'El nombre del producto es obligatorio.'
    }

    if (formulario.stock === '') {
      nuevos.stock = 'El stock es obligatorio.'
    } else if (Number(formulario.stock) < 0) {
      nuevos.stock = 'El stock no puede ser negativo.'
    }

    if (esBulto) {
      if (!formulario.unidades_por_bulto || unidades < 2) {
        nuevos.unidades_por_bulto = 'Un bulto debe traer al menos 2 unidades.'
      }
      if (precioBultoVes <= 0 && precioBultoUsd <= 0) {
        nuevos.precio = 'Debes colocar el precio del bulto en VES o en USD.'
      }
    } else if (Number(formulario.precio_ves) <= 0 && Number(formulario.precio_usd) <= 0) {
      nuevos.precio = 'Debes colocar el precio de venta en VES o en USD.'
    }

    if (descuentoUnidadActivo) {
      const porcentaje = Number(formulario.descuento_unidad_porcentaje)
      if (!(porcentaje > 0) || porcentaje > 100) {
        nuevos.descuento = 'El porcentaje de descuento debe estar entre 1 y 100.'
      }
      if ((Number(formulario.descuento_unidad_desde) || 0) < 2) {
        nuevos.descuento = 'El descuento por cantidad aplica desde 2 unidades o más.'
      }
    }

    if (descuentoBultoActivo) {
      const porcentaje = Number(formulario.descuento_bulto_porcentaje)
      if (!(porcentaje > 0) || porcentaje > 100) {
        nuevos.descuentoBulto = 'El porcentaje de descuento debe estar entre 1 y 100.'
      }
    }

    setErrores(nuevos)
    return Object.keys(nuevos).length === 0
  }

  /**
   * Arma los datos que se mandan a guardar y los envía.
   * @param {Event} evento
   */
  function manejarEnvio(evento) {
    evento.preventDefault()

    if (!validar()) return

    // Datos que valen para los dos modos
    const comunes = {
      nombre: formulario.nombre.trim(),
      stock: Number(formulario.stock),
      tipo: formulario.tipo.trim(),
      marca: formulario.marca.trim(),
      variante: formulario.variante.trim(),
      descripcion: formulario.descripcion.trim(),
      sku: formulario.sku.trim() || null, // Se genera automáticamente si está vacío
      cantidad_mayor: Number(formulario.cantidad_mayor) || 1,
      precio_mayor_ves: Number(formulario.precio_mayor_ves) || 0,
      precio_mayor_usd: Number(formulario.precio_mayor_usd) || 0,
    }

    if (esBulto) {
      // El precio por unidad que se guarda es el del bulto entre las unidades
      alGuardar({
        ...comunes,
        precio_ves: redondear(precioBultoVes / unidades),
        precio_usd: redondear(precioBultoUsd / unidades),
        precio_compra_ves: redondear(compraBultoVes / unidades),
        precio_compra_usd: redondear(compraBultoUsd / unidades),
        unidades_por_bulto: unidades,
        descuento_bulto_porcentaje: descuentoBultoActivo
          ? Number(formulario.descuento_bulto_porcentaje) || 0
          : 0,
        descuento_unidad_porcentaje: 0,
        descuento_unidad_desde: 1,
      })
      return
    }

    alGuardar({
      ...comunes,
      precio_ves: Number(formulario.precio_ves) || 0,
      precio_usd: Number(formulario.precio_usd) || 0,
      precio_compra_ves: Number(formulario.precio_compra_ves) || 0,
      precio_compra_usd: Number(formulario.precio_compra_usd) || 0,
      unidades_por_bulto: 1,
      descuento_unidad_porcentaje: descuentoUnidadActivo
        ? Number(formulario.descuento_unidad_porcentaje) || 0
        : 0,
      descuento_unidad_desde: descuentoUnidadActivo
        ? Number(formulario.descuento_unidad_desde) || 1
        : 1,
      descuento_bulto_porcentaje: 0,
    })
  }

  return (
    <ModalContainer
      abierto={abierto}
      titulo={producto ? 'Editar producto' : esBulto ? 'Registrar por bulto' : 'Registrar por unidad'}
      alCerrar={alCerrar}
    >
      <form onSubmit={manejarEnvio} className="space-y-5">

        {/* --- Datos básicos --- */}
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Nombre (obligatorio) */}
          <div>
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

          {/* Variante / Presentación */}
          <div>
            <label className="mb-1 block text-sm font-medium">Variante / Presentación</label>
            <input
              name="variante"
              type="text"
              value={formulario.variante}
              onChange={manejarCambio}
              placeholder="Grano largo, 5kg, Rojo..."
              className="campo"
            />
            <p className="mt-1 text-xs texto-suave">
              Se usa junto con nombre/marca para generar el SKU automáticamente.
            </p>
          </div>

          {/* Stock (obligatorio) */}
          <div>
            <label className="mb-1 block text-sm font-medium">
              Stock en unidades <span className="text-error-500">*</span>
            </label>
            <input
              name="stock"
              type="number"
              min="0"
              value={formulario.stock}
              onChange={manejarCambio}
              placeholder="1"
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

          {/* Marca (opcional) */}
          <div>
            <label className="mb-1 block text-sm font-medium">Marca</label>
            <input
              name="marca"
              type="text"
              value={formulario.marca}
              onChange={manejarCambio}
              placeholder="Marca del producto"
              className="campo"
            />
          </div>

          {/* Variante (opcional) */}
          <div>
            <label className="mb-1 block text-sm font-medium">Variante / Presentación</label>
            <input
              name="variante"
              type="text"
              value={formulario.variante}
              onChange={manejarCambio}
              placeholder="Sabor, color, tamaño..."
              className="campo"
            />
          </div>

          {/* Código SKU (se genera automáticamente) */}
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium">
              Código SKU{' '}
              <span className="texto-suave font-normal">(se genera automáticamente con nombre/marca/variante)</span>
            </label>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <input
                name="sku"
                type="text"
                value={formulario.sku}
                onChange={manejarCambio}
                placeholder={producto ? 'Dejar vacío para regenerar' : skuPreview}
                className="campo flex-1"
              />
              <div className="rounded-lg border border-[var(--borde)] px-3 py-2 text-xs texto-suave">
                Vista previa: <span className="font-mono font-semibold text-[var(--texto)]">{skuPreview}</span>
              </div>
            </div>
            <p className="mt-1 text-xs texto-suave">
              Si lo dejas vacío, el backend lo genera automáticamente al guardar.
            </p>
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

        {/* ============================================================ */}
        {/* MODO BULTO: cómo está compuesto el bulto y su precio        */}
        {/* ------------------------------------------------------------ */}
        {esBulto && (
          <div className="rounded-lg border border-[var(--borde)] p-4">
            <p className="mb-1 text-sm font-semibold">Datos del bulto</p>
            <p className="mb-3 text-xs texto-suave">
              Escribe cuántas unidades trae el bulto y cuánto cuesta el bulto
              completo. El precio por unidad se calcula solo.
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2 sm:max-w-[16rem]">
                <label className="mb-1 block text-sm font-medium">
                  Unidades por bulto <span className="text-error-500">*</span>
                </label>
                <input
                  name="unidades_por_bulto"
                  type="number"
                  min="2"
                  value={formulario.unidades_por_bulto}
                  onChange={manejarCambio}
                  placeholder="12"
                  className={`campo ${errores.unidades_por_bulto ? 'border-red-400' : ''}`}
                />
                {errores.unidades_por_bulto && (
                  <p className="mt-1 text-xs text-red-600">{errores.unidades_por_bulto}</p>
                )}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Precio del bulto en VES</label>
                <input
                  name="precio_bulto_ves"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formulario.precio_bulto_ves}
                  onChange={manejarCambioPrecio}
                  placeholder="0.00"
                  className={`campo ${errores.precio ? 'border-red-400' : ''}`}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Precio del bulto en USD</label>
                <input
                  name="precio_bulto_usd"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formulario.precio_bulto_usd}
                  onChange={manejarCambioPrecio}
                  placeholder="0.00"
                  className={`campo ${errores.precio ? 'border-red-400' : ''}`}
                />
              </div>
            </div>
            {errores.precio && <p className="mt-1 text-xs text-red-600">{errores.precio}</p>}

            {/* Precio por unidad calculado */}
            <div className="mt-3 rounded-md bg-[var(--fondo)] px-3 py-2 text-sm">
              <span className="texto-suave">Precio por unidad: </span>
              <span className="font-semibold text-marca-700">
                Bs. {formatearVes(precioUnidadVes)}
              </span>
              <span className="texto-suave"> / {formatearUsd(precioUnidadUsd)}</span>
            </div>

            {tasa && (
              <p className="mt-2 text-xs texto-suave">
                Se usa la tasa de Bs. {tasa} por dólar. Escribe en una moneda y la otra se
                calcula sola.
              </p>
            )}

            {/* Precio de compra del bulto (para la ganancia) */}
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">Compra del bulto en VES</label>
                <input
                  name="precio_compra_bulto_ves"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formulario.precio_compra_bulto_ves}
                  onChange={manejarCambioPrecio}
                  placeholder="0.00"
                  className="campo"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Compra del bulto en USD</label>
                <input
                  name="precio_compra_bulto_usd"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formulario.precio_compra_bulto_usd}
                  onChange={manejarCambioPrecio}
                  placeholder="0.00"
                  className="campo"
                />
              </div>
            </div>

            {/* Ganancia calculada */}
            <div className="mt-3 rounded-lg bg-[var(--fondo)] p-3 text-sm">
              <p>
                <span className="texto-suave">Costo por unidad: </span>
                <span className="font-medium">Bs. {formatearVes(compraUnidadVes)}</span>
                <span className="texto-suave"> / {formatearUsd(compraUnidadUsd)}</span>
              </p>
              <p className="mt-1">
                <span className="texto-suave">Ganancia del bulto: </span>
                <span className={gananciaBultoVes > 0 ? 'font-semibold text-exito-600' : 'font-medium'}>
                  Bs. {formatearVes(gananciaBultoVes)}
                </span>
              </p>
              <p className="mt-1">
                <span className="texto-suave">Ganancia por unidad: </span>
                <span className={gananciaUnidadVes > 0 ? 'font-semibold text-exito-600' : 'font-medium'}>
                  Bs. {formatearVes(gananciaUnidadVes)}
                </span>
              </p>
            </div>
          </div>
        )}

        {/* --- Precios de venta (solo modo unidad) --- */}
        {!esBulto && (
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
                Se usa la tasa de Bs. {tasa} por dólar. Escribe en una moneda y la otra se
                calcula sola.
              </p>
            )}
          </div>
        )}

        {/* --- Precio de compra (solo modo unidad) --- */}
        {!esBulto && (
          <div className="rounded-lg border border-[var(--borde)] p-4">
            <p className="mb-3 text-sm font-semibold">
              Precio de compra{' '}
              <span className="texto-suave font-normal">(opcional, para saber la ganancia)</span>
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
        )}

        {/* --- Descuento por cantidad (modo unidad) --- */}
        {!esBulto && (
          <div className="rounded-lg border border-[var(--borde)] p-4">
            <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
              <input
                type="checkbox"
                checked={descuentoUnidadActivo}
                onChange={(e) => alternarDescuentoUnidad(e.target.checked)}
                className="h-4 w-4 rounded border-[var(--borde)]"
              />
              Ofrecer descuento por cantidad
            </label>

            {descuentoUnidadActivo && (
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium">Descuento (%)</label>
                  <input
                    name="descuento_unidad_porcentaje"
                    type="number"
                    step="0.01"
                    min="1"
                    max="100"
                    value={formulario.descuento_unidad_porcentaje}
                    onChange={manejarCambio}
                    placeholder="10"
                    className={`campo ${errores.descuento ? 'border-red-400' : ''}`}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Desde cuántas unidades</label>
                  <input
                    name="descuento_unidad_desde"
                    type="number"
                    min="2"
                    value={formulario.descuento_unidad_desde}
                    onChange={manejarCambio}
                    placeholder="5"
                    className={`campo ${errores.descuento ? 'border-red-400' : ''}`}
                  />
                </div>
              </div>
            )}

            {errores.descuento && <p className="mt-1 text-xs text-red-600">{errores.descuento}</p>}

            <p className="mt-2 text-xs texto-suave">
              El punto de venta aplica este descuento solo cuando el cliente se lleva esa
              cantidad de unidades o más.
            </p>
          </div>
        )}

        {/* --- Descuento por bulto completo (modo bulto) --- */}
        {esBulto && (
          <div className="rounded-lg border border-[var(--borde)] p-4">
            <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
              <input
                type="checkbox"
                checked={descuentoBultoActivo}
                onChange={(e) => alternarDescuentoBulto(e.target.checked)}
                className="h-4 w-4 rounded border-[var(--borde)]"
              />
              Ofrecer descuento al comprar el bulto completo
            </label>

            {descuentoBultoActivo && (
              <div className="mt-3">
                <label className="mb-1 block text-sm font-medium">Descuento (%)</label>
                <input
                  name="descuento_bulto_porcentaje"
                  type="number"
                  step="0.01"
                  min="1"
                  max="100"
                  value={formulario.descuento_bulto_porcentaje}
                  onChange={manejarCambio}
                  placeholder="10"
                  className={`campo ${errores.descuentoBulto ? 'border-red-400' : ''}`}
                />
                {errores.descuentoBulto && (
                  <p className="mt-1 text-xs text-red-600">{errores.descuentoBulto}</p>
                )}
              </div>
            )}

            <p className="mt-3 text-xs texto-suave">
              El POS aplica este % solo si el cliente se lleva todas las unidades del bulto
              ({unidades} unidades).
            </p>
          </div>
        )}

        {/* --- Precio al mayor (en los dos modos) --- */}
        <div className="rounded-lg border border-[var(--borde)] p-4">
          <p className="mb-1 text-sm font-semibold">
            Precio al mayor <span className="texto-suave font-normal">(opcional)</span>
          </p>
          <p className="mb-3 text-xs texto-suave">
            Si se vende al mayor, indica desde cuántas unidades aplica el precio especial.
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Desde cuántas unidades</label>
              <input
                name="cantidad_mayor"
                type="number"
                min="1"
                value={formulario.cantidad_mayor}
                onChange={manejarCambio}
                placeholder="1"
                className="campo"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Precio al mayor en VES</label>
              <input
                name="precio_mayor_ves"
                type="number"
                step="0.01"
                min="0"
                value={formulario.precio_mayor_ves}
                onChange={manejarCambioPrecio}
                placeholder="0.00"
                className="campo"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Precio al mayor en USD</label>
              <input
                name="precio_mayor_usd"
                type="number"
                step="0.01"
                min="0"
                value={formulario.precio_mayor_usd}
                onChange={manejarCambioPrecio}
                placeholder="0.00"
                className="campo"
              />
            </div>
          </div>

          <p className="mt-3 text-xs texto-suave">
            Si dejas los precios al mayor en blanco, el producto solo se venderá al detal.
          </p>
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
    </ModalContainer>
  )
}
