/*
 * (Pos.jsx)
 * Pantalla del punto de venta (POS).
 *
 * Tiene dos columnas:
 *   - Izquierda: el catálogo de productos. Al hacer clic se agregan al carrito.
 *   - Derecha: el resumen de la compra, con el total y el método de pago.
 *
 * Al presionar "Registrar venta":
 *   1. Se descuenta el stock de cada producto del inventario
 *   2. Se guarda la venta en la tabla "ventas" del SQLite local
 */

import { useEffect, useMemo, useState } from 'react'

import * as api from '../services/api'
import Aviso from '../components/Aviso'
import Cargando from '../components/Cargando'
import { formatearUsd, formatearVes, redondear } from '../utils/formato'

// Métodos de pago disponibles
const METODOS_PAGO = [
  { valor: 'efectivo', texto: 'Efectivo' },
  { valor: 'punto', texto: 'Punto de venta' },
  { valor: 'pagomovil', texto: 'Pagomóvil' },
  { valor: 'app', texto: 'App' },
]

/**
 * Componente del punto de venta.
 * @returns {JSX.Element}
 */
export default function Pos() {
  // --- Estado de la pantalla ---
  const [productos, setProductos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [exito, setExito] = useState('')

  // --- Estado del carrito ---
  const [carrito, setCarrito] = useState([])       // lista de productos agregados
  const [metodoPago, setMetodoPago] = useState('efectivo')
  const [registrando, setRegistrando] = useState(false)
  const [busqueda, setBusqueda] = useState('')

  /**
   * Carga los productos del inventario al abrir la pantalla.
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
   * Filtra el catálogo por nombre o código SKU.
   */
  const productosFiltrados = useMemo(() => {
    if (!busqueda.trim()) return productos

    const texto = busqueda.toLowerCase()
    return productos.filter((producto) =>
      [producto.nombre, producto.sku]
        .filter(Boolean)
        .some((campo) => campo.toLowerCase().includes(texto)),
    )
  }, [productos, busqueda])

  /**
   * Suma los totales del carrito: unidades, monto en VES y monto en USD.
   */
  const totales = useMemo(() => {
    return carrito.reduce(
      (acumulado, linea) => ({
        unidades: acumulado.unidades + linea.unidades,
        ves: acumulado.ves + linea.subtotal_ves,
        usd: acumulado.usd + linea.subtotal_usd,
      }),
      { unidades: 0, ves: 0, usd: 0 },
    )
  }, [carrito])

  /**
   * Agrega un producto al carrito al hacer clic en él.
   * Si ya está en el carrito, le suma una unidad más.
   * @param {object} producto - El producto del catálogo
   */
  function agregarAlCarrito(producto) {
    setError('')
    setExito('')

    // No se pueden agregar productos sin stock
    if (producto.stock <= 0) {
      setError(`«${producto.nombre}» no tiene stock disponible.`)
      return
    }

    setCarrito((anterior) => {
      // Se busca si el producto ya está en el carrito
      const existe = anterior.find((linea) => linea.producto_id === producto.id)

      // Si no está, se agrega como una línea nueva
      if (!existe) {
        return [
          ...anterior,
          {
            producto_id: producto.id,
            nombre: producto.nombre,
            precio_ves: producto.precio_ves,
            precio_usd: producto.precio_usd,
            stock: producto.stock,
            unidades: 1,
            subtotal_ves: producto.precio_ves,
            subtotal_usd: producto.precio_usd,
          },
        ]
      }

      // Si ya está, se le suma una unidad (sin pasar del stock)
      if (existe.unidades >= producto.stock) {
        setError(`No hay más stock de «${producto.nombre}». Tienes ${producto.stock} disponibles.`)
        return anterior
      }

      return anterior.map((linea) => {
        if (linea.producto_id !== producto.id) return linea

        const unidades = linea.unidades + 1
        return {
          ...linea,
          unidades,
          subtotal_ves: redondear(linea.precio_ves * unidades),
          subtotal_usd: redondear(linea.precio_usd * unidades),
        }
      })
    })
  }

  /**
   * Cambia la cantidad de unidades de una línea del carrito.
   * Si se pone 0 o menos, la línea se elimina.
   * @param {number} productoId - El producto a cambiar
   * @param {number} nuevasUnidades - La cantidad nueva
   */
  function cambiarCantidad(productoId, nuevasUnidades) {
    setCarrito((anterior) =>
      anterior
        .map((linea) => {
          if (linea.producto_id !== productoId) return linea

          // Si la cantidad es 0 o menos se marca para borrar
          if (nuevasUnidades <= 0) return null

          // No se puede poner más unidades que el stock disponible
          if (nuevasUnidades > linea.stock) {
            setError(`Solo hay ${linea.stock} unidades de «${linea.nombre}».`)
            return linea
          }

          return {
            ...linea,
            unidades: nuevasUnidades,
            subtotal_ves: redondear(linea.precio_ves * nuevasUnidades),
            subtotal_usd: redondear(linea.precio_usd * nuevasUnidades),
          }
        })
        .filter(Boolean),  // quita las líneas que quedaron en null
    )
  }

  /**
   * Saca un producto del carrito.
   * @param {number} productoId - El producto a quitar
   */
  function quitarDelCarrito(productoId) {
    setCarrito((anterior) => anterior.filter((linea) => linea.producto_id !== productoId))
  }

  /**
   * Vacía todo el carrito.
   */
  function vaciarCarrito() {
    setCarrito([])
  }

  /**
   * Registra la venta en el backend.
   * El backend descuenta el stock y guarda los datos de la venta.
   */
  async function registrarVenta() {
    if (carrito.length === 0) {
      setError('Agrega al menos un producto al carrito.')
      return
    }

    setRegistrando(true)
    setError('')
    setExito('')

    try {
      // Se manda la lista de productos y el método de pago
      const respuesta = await api.registrarVenta({
        productos: carrito.map((linea) => ({
          producto_id: linea.producto_id,
          unidades: linea.unidades,
        })),
        metodo_pago: metodoPago,
      })

      // Se avisa que la venta se registró con el total
      setExito(
        `¡Venta registrada! Total: Bs. ${formatearVes(respuesta.venta.total_ves)} ` +
        `(${formatearUsd(respuesta.venta.total_usd)}).`,
      )

      // Se vacía el carrito y se recarga el catálogo con el stock nuevo
      setCarrito([])
      const respuestaProductos = await api.listarProductos()
      setProductos(respuestaProductos.productos)

    } catch (errorVenta) {
      setError(errorVenta.message)
    } finally {
      setRegistrando(false)
    }
  }

  // Mientras carga el catálogo se muestra el spinner
  if (cargando) return <Cargando mensaje="Cargando el catálogo..." />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Punto de venta</h1>
        <p className="mt-1 text-sm texto-suave">
          Toca un producto para agregarlo a la lista de compra.
        </p>
      </div>

      <Aviso tipo="error" mensaje={error} alCerrar={() => setError('')} />
      <Aviso tipo="exito" mensaje={exito} alCerrar={() => setExito('')} />

      {/* Las dos columnas del POS */}
      <div className="grid gap-6 lg:grid-cols-2">

        {/* ============ COLUMNA IZQUIERDA: el catálogo ============ */}
        <section className="tarjeta flex flex-col overflow-hidden">

          {/* Encabezado del catálogo con el buscador */}
          <div className="space-y-3 border-b border-[var(--borde)] p-4">
            <h2 className="font-semibold">Catálogo de productos</h2>
            <input
              type="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar producto..."
              className="campo"
            />
          </div>

          {/* La lista de productos para tocar */}
          <div className="max-h-[32rem] flex-1 overflow-y-auto p-4">
            {productosFiltrados.length === 0 ? (
              <p className="py-10 text-center text-sm texto-suave">
                {productos.length === 0
                  ? 'No hay productos en el inventario. Agrega uno primero.'
                  : 'Ningún producto coincide con tu búsqueda.'}
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {productosFiltrados.map((producto) => {
                  const agotado = producto.stock <= 0

                  return (
                    <button
                      key={producto.id}
                      onClick={() => agregarAlCarrito(producto)}
                      disabled={agotado}
                      className={`rounded-lg border p-3 text-left transition ${
                        agotado
                          ? 'cursor-not-allowed border-[var(--borde)] opacity-50'
                          : 'border-[var(--borde)] hover:border-marca-400 hover:bg-marca-50'
                      }`}
                    >
                      {/* Nombre del producto */}
                      <p className="truncate text-sm font-medium">{producto.nombre}</p>

                      {/* Precio en ambas monedas */}
                      <p className="mt-1 text-sm font-semibold text-marca-700">
                        Bs. {formatearVes(producto.precio_ves)}
                      </p>
                      <p className="text-xs texto-suave">{formatearUsd(producto.precio_usd)}</p>

                      {/* Stock disponible */}
                      <p
                        className={`mt-1 text-xs ${
                          producto.stock <= 5 ? 'font-medium text-amber-600' : 'texto-suave'
                        }`}
                      >
                        Stock: {producto.stock}
                      </p>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </section>

        {/* ============ COLUMNA DERECHA: el resumen de la compra ============ */}
        <section className="tarjeta flex flex-col overflow-hidden">

          {/* Encabezado con el botón de vaciar */}
          <div className="flex items-center justify-between border-b border-[var(--borde)] p-4">
            <h2 className="font-semibold">Resumen de la compra</h2>
            {carrito.length > 0 && (
              <button
                onClick={vaciarCarrito}
                className="text-xs text-red-600 hover:underline"
              >
                Vaciar
              </button>
            )}
          </div>

          {/* La lista de productos que se van a comprar */}
          <div className="max-h-80 flex-1 overflow-y-auto p-4">
            {carrito.length === 0 ? (
              <p className="py-10 text-center text-sm texto-suave">
                La lista está vacía. Toca un producto del catálogo para agregarlo.
              </p>
            ) : (
              <div className="space-y-3">
                {carrito.map((linea) => (
                  <div
                    key={linea.producto_id}
                    className="rounded-lg border border-[var(--borde)] p-3"
                  >
                    {/* Nombre y precio unitario */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{linea.nombre}</p>
                        <p className="text-xs texto-suave">
                          Bs. {formatearVes(linea.precio_ves)} c/u
                        </p>
                      </div>

                      {/* Botón para quitar la línea */}
                      <button
                        onClick={() => quitarDelCarrito(linea.producto_id)}
                        className="text-xs text-red-600 hover:underline"
                      >
                        Quitar
                      </button>
                    </div>

                    {/* Controles de cantidad y subtotal */}
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => cambiarCantidad(linea.producto_id, linea.unidades - 1)}
                          className="grid h-7 w-7 place-items-center rounded border border-[var(--borde)] text-sm font-bold transition hover:bg-[var(--fondo)]"
                        >
                          −
                        </button>

                        <input
                          type="number"
                          min="0"
                          max={linea.stock}
                          value={linea.unidades}
                          onChange={(e) =>
                            cambiarCantidad(linea.producto_id, Number(e.target.value))
                          }
                          className="campo w-16 px-1 py-1 text-center"
                        />

                        <button
                          onClick={() => cambiarCantidad(linea.producto_id, linea.unidades + 1)}
                          className="grid h-7 w-7 place-items-center rounded border border-[var(--borde)] text-sm font-bold transition hover:bg-[var(--fondo)]"
                        >
                          +
                        </button>
                      </div>

                      <p className="text-sm font-semibold">
                        Bs. {formatearVes(linea.subtotal_ves)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Los totales, el método de pago y el botón de registrar */}
          <div className="space-y-4 border-t border-[var(--borde)] p-4">

            {/* Total de la compra */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="texto-suave">Unidades</span>
                <span className="font-medium">{totales.unidades}</span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="texto-suave">Total en dólares</span>
                <span className="font-medium">{formatearUsd(totales.usd)}</span>
              </div>

              <div className="flex items-baseline justify-between border-t border-[var(--borde)] pt-2">
                <span className="font-medium">Total</span>
                <span className="text-xl font-bold text-marca-700">
                  Bs. {formatearVes(totales.ves)}
                </span>
              </div>
            </div>

            {/* Selector del método de pago */}
            <div>
              <label className="mb-1 block text-sm font-medium">Método de pago</label>
              <div className="grid grid-cols-2 gap-2">
                {METODOS_PAGO.map((metodo) => (
                  <button
                    key={metodo.valor}
                    onClick={() => setMetodoPago(metodo.valor)}
                    className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                      metodoPago === metodo.valor
                        ? 'border-marca-600 bg-marca-600 text-white'
                        : 'border-[var(--borde)] hover:bg-[var(--fondo)]'
                    }`}
                  >
                    {metodo.texto}
                  </button>
                ))}
              </div>
            </div>

            {/* Botón de registrar la venta */}
            <button
              onClick={registrarVenta}
              disabled={registrando || carrito.length === 0}
              className="w-full rounded-lg bg-exito-500 py-3 text-sm font-semibold text-white transition hover:bg-exito-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {registrando ? 'Registrando...' : 'Registrar venta'}
            </button>
          </div>
        </section>
      </div>
    </div>
  )
}
