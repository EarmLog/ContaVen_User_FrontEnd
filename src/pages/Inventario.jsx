/*
 * (Inventario.jsx)
 * Pantalla de inventario de la app de usuarios.
 *
 * Muestra la tabla con todos los productos y un buscador.
 * El formulario para registrar o editar un producto vive en una ventana
 * emergente (components/ModalProducto.jsx), así la lista siempre está visible.
 *
 * Los datos se guardan en la base de datos local (SQLite) del backend.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'

import * as api from '../services/api'
import Aviso from '../components/Aviso'
import Cargando from '../components/Cargando'
import ModalProducto from '../components/ModalProducto'
import { useSesion } from '../context/SesionProveedor'
import { formatearUsd, formatearVes, redondear } from '../utils/formato'

/**
 * Componente de la pantalla de inventario.
 * @returns {JSX.Element}
 */
export default function Inventario() {
  // Se trae la tasa del dólar del contexto de la sesión
  const { dolar } = useSesion()

  // --- Estado de la pantalla ---
  const [productos, setProductos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [exito, setExito] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [busqueda, setBusqueda] = useState('')     // filtro de la tabla

  // --- Estado de la ventana emergente ---
  const [ventanaAbierta, setVentanaAbierta] = useState(false)
  const [productoEditando, setProductoEditando] = useState(null)  // null = producto nuevo

  // La tasa del dólar, con un valor por si aún no ha cargado
  const tasa = dolar?.precio_ves || 0

  /**
   * Vuelve a pedir la lista de productos al backend.
   */
  const recargarProductos = useCallback(async () => {
    const respuesta = await api.listarProductos()
    setProductos(respuesta.productos)
  }, [])

  /**
   * Carga la lista de productos al entrar en la pantalla.
   */
  useEffect(() => {
    let montado = true

    async function cargar() {
      try {
        const respuesta = await api.listarProductos()
        if (montado) setProductos(respuesta.productos)
      } catch (errorCarga) {
        if (montado) setError(errorCarga.message)
      } finally {
        if (montado) setCargando(false)
      }
    }

    cargar()
    return () => { montado = false }
  }, [])

  /**
   * Filtra los productos por nombre, tipo o código SKU.
   */
  const productosFiltrados = useMemo(() => {
    if (!busqueda.trim()) return productos

    const texto = busqueda.toLowerCase()
    return productos.filter((producto) =>
      [producto.nombre, producto.tipo, producto.sku]
        .filter(Boolean)
        .some((campo) => campo.toLowerCase().includes(texto)),
    )
  }, [productos, busqueda])

  /**
   * Abre la ventana para registrar un producto nuevo.
   */
  function abrirNuevo() {
    setProductoEditando(null)
    setError('')
    setExito('')
    setVentanaAbierta(true)
  }

  /**
   * Abre la ventana con los datos de un producto para editarlo.
   * @param {object} producto - El producto a editar
   */
  function abrirEditar(producto) {
    setProductoEditando(producto)
    setError('')
    setExito('')
    setVentanaAbierta(true)
  }

  /**
   * Cierra la ventana sin guardar nada.
   */
  function cerrarVentana() {
    setVentanaAbierta(false)
    setProductoEditando(null)
  }

  /**
   * Crea o actualiza el producto y recarga la tabla.
   * @param {object} datos - Los datos del producto que se va a guardar
   */
  async function guardarProducto(datos) {
    setGuardando(true)
    setError('')

    try {
      if (productoEditando) {
        // Se está editando un producto que ya existe
        await api.editarProducto(productoEditando.id, datos)
        setExito(`«${datos.nombre}» se actualizó correctamente.`)
      } else {
        // Se está creando un producto nuevo
        await api.crearProducto(datos)
        setExito(`«${datos.nombre}» se agregó al inventario.`)
      }

      // Se cierra la ventana y se recarga la tabla
      cerrarVentana()
      await recargarProductos()
    } catch (errorGuardar) {
      setError(errorGuardar.message)
    } finally {
      setGuardando(false)
    }
  }

  /**
   * Borra un producto del inventario, pidiendo confirmación antes.
   * @param {object} producto - El producto a eliminar
   */
  async function manejarEliminar(producto) {
    const confirmado = window.confirm(
      `¿Seguro que quieres eliminar «${producto.nombre}» del inventario?`,
    )

    if (!confirmado) return

    try {
      await api.eliminarProducto(producto.id)
      setExito(`«${producto.nombre}» se eliminó del inventario.`)
      await recargarProductos()
    } catch (errorEliminar) {
      setError(errorEliminar.message)
    }
  }

  // Mientras carga la lista se muestra el spinner
  if (cargando) return <Cargando mensaje="Cargando el inventario..." />

  return (
    <div className="space-y-6">

      {/* --- Encabezado --- */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Inventario</h1>
          <p className="mt-1 text-sm texto-suave">
            {tasa
              ? `Precios con la tasa de Bs. ${formatearVes(tasa)} por dólar.`
              : 'Cargando la tasa del dólar...'}
          </p>
        </div>

        {/* Botón para registrar un producto nuevo */}
        <button
          onClick={abrirNuevo}
          className="rounded-lg bg-marca-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-marca-700"
        >
          + Registrar producto
        </button>
      </div>

      <Aviso tipo="error" mensaje={error} alCerrar={() => setError('')} />
      <Aviso tipo="exito" mensaje={exito} alCerrar={() => setExito('')} />

      {/* --- Tabla con todos los productos --- */}
      <section className="tarjeta overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--borde)] px-5 py-4">
          <h2 className="font-semibold">
            Mis productos ({productosFiltrados.length})
          </h2>

          {/* Buscador para filtrar la tabla */}
          <input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre, tipo o SKU..."
            className="campo max-w-xs"
          />
        </div>

        {productosFiltrados.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="text-sm texto-suave">
              {productos.length === 0
                ? 'Todavía no has agregado productos.'
                : 'Ningún producto coincide con tu búsqueda.'}
            </p>

            {/* Si no hay productos, se invita a registrar el primero */}
            {productos.length === 0 && (
              <button
                onClick={abrirNuevo}
                className="mt-4 rounded-lg bg-marca-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-marca-700"
              >
                Registrar el primero
              </button>
            )}
          </div>
        ) : (
          <>
            {/* --- Vista de tabla (pantallas medianas y grandes) --- */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
              <thead className="bg-[var(--fondo)] text-left text-xs texto-suave uppercase">
                <tr>
                  <th className="px-5 py-2 font-medium">Nombre</th>
                  <th className="px-5 py-2 font-medium">Tipo</th>
                  <th className="px-5 py-2 font-medium">SKU</th>
                  <th className="px-5 py-2 text-right font-medium">Stock</th>
                  <th className="px-5 py-2 text-right font-medium">Precio VES</th>
                  <th className="px-5 py-2 text-right font-medium">Precio USD</th>
                  <th className="px-5 py-2 text-right font-medium">Ganancia</th>
                  <th className="px-5 py-2 text-right font-medium">Acciones</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[var(--borde)]">
                {productosFiltrados.map((producto) => {
                  // La ganancia por unidad es el precio de venta menos el de compra
                  const ganancia = redondear(producto.precio_ves - producto.precio_compra_ves)

                  return (
                    <tr key={producto.id}>
                      <td className="px-5 py-2.5 font-medium">
                        {producto.nombre}
                        {producto.descripcion && (
                          <p className="text-xs font-normal texto-suave">{producto.descripcion}</p>
                        )}
                      </td>
                      <td className="px-5 py-2.5 texto-suave">{producto.tipo || '—'}</td>
                      <td className="px-5 py-2.5 texto-suave">{producto.sku || '—'}</td>
                      <td className="px-5 py-2.5 text-right">
                        <span
                          className={
                            producto.stock <= 5
                              ? 'rounded bg-amber-100 px-2 py-0.5 font-medium text-amber-800'
                              : ''
                          }
                        >
                          {producto.stock}
                        </span>
                      </td>
                      <td className="px-5 py-2.5 text-right">Bs. {formatearVes(producto.precio_ves)}</td>
                      <td className="px-5 py-2.5 text-right">{formatearUsd(producto.precio_usd)}</td>
                      <td
                        className={`px-5 py-2.5 text-right font-medium ${
                          ganancia > 0 ? 'text-exito-600' : 'texto-suave'
                        }`}
                      >
                        {ganancia > 0 ? `Bs. ${formatearVes(ganancia)}` : '—'}
                      </td>

                      {/* Botones de editar y eliminar */}
                      <td className="px-5 py-2.5">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => abrirEditar(producto)}
                            className="rounded-md border border-[var(--borde)] px-3 py-1 text-xs font-medium transition hover:bg-marca-50 hover:text-marca-700"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => manejarEliminar(producto)}
                            className="rounded-md border border-red-200 px-3 py-1 text-xs font-medium text-red-600 transition hover:bg-red-50"
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              </table>
            </div>

            {/* --- Vista de tarjetas (teléfonos) --- */}
            <ul className="divide-y divide-[var(--borde)] md:hidden">
              {productosFiltrados.map((producto) => {
                const ganancia = redondear(producto.precio_ves - producto.precio_compra_ves)

                return (
                  <li key={producto.id} className="p-4">
                    {/* Nombre, descripción, tipo y stock */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{producto.nombre}</p>
                        {producto.descripcion && (
                          <p className="truncate text-xs texto-suave">{producto.descripcion}</p>
                        )}
                        <p className="mt-0.5 text-xs texto-suave">
                          {producto.tipo || 'Sin tipo'}
                          {producto.sku ? ` · ${producto.sku}` : ''}
                        </p>
                      </div>

                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                          producto.stock <= 5
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-[var(--fondo)] texto-suave'
                        }`}
                      >
                        Stock: {producto.stock}
                      </span>
                    </div>

                    {/* Precios y ganancia */}
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                      <span className="font-semibold text-marca-700">
                        Bs. {formatearVes(producto.precio_ves)}
                      </span>
                      <span className="texto-suave">{formatearUsd(producto.precio_usd)}</span>
                      {ganancia > 0 && (
                        <span className="font-medium text-exito-600">
                          Ganancia: Bs. {formatearVes(ganancia)}
                        </span>
                      )}
                    </div>

                    {/* Botones de editar y eliminar */}
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => abrirEditar(producto)}
                        className="flex-1 rounded-md border border-[var(--borde)] px-3 py-1.5 text-xs font-medium transition hover:bg-marca-50 hover:text-marca-700"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => manejarEliminar(producto)}
                        className="flex-1 rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50"
                      >
                        Eliminar
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </section>

      {/* --- Ventana para registrar o editar --- */}
      <ModalProducto
        // La key cambia con cada producto para que el formulario se reinicie
        key={productoEditando?.id || 'nuevo'}
        abierto={ventanaAbierta}
        producto={productoEditando}
        tasa={tasa}
        guardando={guardando}
        alGuardar={guardarProducto}
        alCerrar={cerrarVentana}
      />
    </div>
  )
}