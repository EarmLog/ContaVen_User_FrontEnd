'use client'

/*
 * (Pos.jsx)
 * Pantalla del punto de venta (POS).
 *
 * Tiene dos columnas:
 *   - Izquierda: el catálogo de productos. Al hacer clic se agregan al carrito.
 *   - Derecha: el resumen de la compra, con el total y el método de pago.
 *
 * Cada línea del carrito puede cobrarse al detal o al mayor (si el producto
 * tiene precio al mayor y se lleva la cantidad mínima).
 *
 * La venta se guarda en la base local. Si hay internet se manda al servidor
 * al momento; si no, queda en cola y se sube cuando vuelva la conexión.
 */

import { useEffect, useMemo, useState } from 'react'

import Aviso from '../../../components/ui/Aviso'
import Cargando from '../../../components/ui/Cargando'
import { useToasts } from '../../../components/ui/Toasts'
import { cargarProductos, calcularLinea, registrarVenta } from '../../../lib/db/dbAdapter'
import { formatearUsd, formatearVes } from '../../../lib/formato'

// Métodos de pago disponibles
const METODOS_PAGO = [
  { valor: 'efectivo', texto: 'Efectivo' },
  { valor: 'punto', texto: 'Punto de venta' },
  { valor: 'pagomovil', texto: 'Pagomóvil' },
  { valor: 'biopago', texto: 'Biopago' },
]

/**
 * Componente del punto de venta.
 * @returns {JSX.Element}
 */
export default function Pos() {
  // Para mostrar avisos flotantes
  const { avisar } = useToasts()

  // --- Estado de la pantalla ---
  const [productos, setProductos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  // --- Estado del carrito ---
  const [carrito, setCarrito] = useState([]) // líneas: { producto, unidades, es_mayor }
  const [metodoPago, setMetodoPago] = useState('efectivo')
  const [registrando, setRegistrando] = useState(false)
  const [busqueda, setBusqueda] = useState('')

  /**
   * Carga los productos del inventario local al abrir la pantalla.
   */
  useEffect(() => {
    let montado = true

    async function cargar() {
      try {
        const lista = await cargarProductos()
        if (montado) setProductos(lista)
      } catch (errorCarga) {
        if (montado) setError(errorCarga.message)
      } finally {
        if (montado) setCargando(false)
      }
    }

    cargar()
    return () => {
      montado = false
    }
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
   * Se usa calcularLinea para que el precio al mayor se aplique igual que
   * en el servidor.
   */
  const totales = useMemo(() => {
    return carrito.reduce(
      (acumulado, linea) => {
        const calculo = calcularLinea(linea.producto, linea.unidades, linea.es_mayor)
        return {
          unidades: acumulado.unidades + linea.unidades,
          ves: acumulado.ves + calculo.subtotalVes,
          usd: acumulado.usd + calculo.subtotalUsd,
        }
      },
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

    // No se pueden agregar productos sin stock
    if (producto.stock <= 0) {
      setError(`«${producto.nombre}» no tiene stock disponible.`)
      return
    }

    setCarrito((anterior) => {
      // Se busca si el producto ya está en el carrito
      const existe = anterior.find((linea) => linea.producto.id === producto.id)

      // Si no está, se agrega como una línea nueva
      if (!existe) {
        return [...anterior, { producto, unidades: 1, es_mayor: false }]
      }

      // Si ya está, se le suma una unidad (sin pasar del stock)
      if (existe.unidades >= producto.stock) {
        setError(`No hay más stock de «${producto.nombre}». Tienes ${producto.stock} disponibles.`)
        return anterior
      }

      return anterior.map((linea) =>
        linea.producto.id === producto.id
          ? { ...linea, unidades: linea.unidades + 1 }
          : linea,
      )
    })
  }

  /**
   * Cambia la cantidad de unidades de una línea del carrito.
   * Si se pone 0 o menos, la línea se elimina.
   * @param {string} idProducto - El producto a cambiar
   * @param {number} nuevasUnidades - La cantidad nueva
   */
  function cambiarCantidad(idProducto, nuevasUnidades) {
    setCarrito((anterior) =>
      anterior
        .map((linea) => {
          if (linea.producto.id !== idProducto) return linea

          // Si la cantidad es 0 o menos se marca para borrar
          if (nuevasUnidades <= 0) return null

          // No se puede poner más unidades que el stock disponible
          if (nuevasUnidades > linea.producto.stock) {
            setError(`Solo hay ${linea.producto.stock} unidades de «${linea.producto.nombre}».`)
            return linea
          }

          return { ...linea, unidades: nuevasUnidades }
        })
        .filter(Boolean),
    )
  }

  /**
   * Marca o desmarca una línea para cobrarla al mayor.
   * @param {string} idProducto
   * @param {boolean} valor
   */
  function cambiarMayor(idProducto, valor) {
    setCarrito((anterior) =>
      anterior.map((linea) =>
        linea.producto.id === idProducto ? { ...linea, es_mayor: valor } : linea,
      ),
    )
  }

  /**
   * Saca un producto del carrito.
   * @param {string} idProducto - El producto a quitar
   */
  function quitarDelCarrito(idProducto) {
    setCarrito((anterior) => anterior.filter((linea) => linea.producto.id !== idProducto))
  }

  /**
   * Vacía todo el carrito.
   */
  function vaciarCarrito() {
    setCarrito([])
  }

  /**
   * Registra la venta en la base local (y en el servidor si hay internet).
   */
  async function manejarRegistrarVenta() {
    if (carrito.length === 0) {
      setError('Agrega al menos un producto al carrito.')
      return
    }

    setRegistrando(true)
    setError('')

    try {
      // Se manda la lista de productos y el método de pago
      const resultado = await registrarVenta({
        items: carrito.map((linea) => ({
          id: linea.producto.id,
          unidades: linea.unidades,
          es_mayor: linea.es_mayor,
        })),
        metodo_pago: metodoPago,
      })

      // Se avisa que la venta se registró con el total
      const totalVes = resultado.venta.total_ves
      const totalUsd = resultado.venta.total_usd
      const mensaje = `¡Venta registrada! Total: Bs. ${formatearVes(totalVes)} (${formatearUsd(totalUsd)}).`

      if (resultado.sincronizada) {
        avisar(mensaje, 'exito')
      } else {
        avisar(`${mensaje} Se subirá al reconectar.`, 'info')
      }

      // Se vacía el carrito y se recarga el catálogo con el stock nuevo
      setCarrito([])
      setProductos(await cargarProductos())
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
                  const ofreceMayor =
                    Number(producto.precio_mayor_ves) > 0 ||
                    Number(producto.precio_mayor_usd) > 0

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

                      {/* Aviso de venta al mayor */}
                      {ofreceMayor && (
                        <p className="mt-1 text-xs text-marca-600">
                          Al mayor desde {producto.cantidad_mayor}: Bs.{' '}
                          {formatearVes(producto.precio_mayor_ves)}
                        </p>
                      )}

                      {/* Aviso de descuento por cantidad */}
                      {(Number(producto.descuento_unidad_porcentaje) > 0 ||
                        Number(producto.descuento_bulto_porcentaje) > 0) && (
                        <p className="mt-1 text-xs text-exito-600">Con descuento por cantidad</p>
                      )}

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
              <button onClick={vaciarCarrito} className="text-xs text-red-600 hover:underline">
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
                  <LineaCarrito
                    key={linea.producto.id}
                    linea={linea}
                    alCambiarCantidad={cambiarCantidad}
                    alCambiarMayor={cambiarMayor}
                    alQuitar={quitarDelCarrito}
                  />
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
              onClick={manejarRegistrarVenta}
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

/**
 * Una línea del carrito con sus controles de cantidad y precio al mayor.
 * @param {object} props - { linea, alCambiarCantidad, alCambiarMayor, alQuitar }
 * @returns {JSX.Element}
 */
function LineaCarrito({ linea, alCambiarCantidad, alCambiarMayor, alQuitar }) {
  const { producto, unidades, es_mayor } = linea

  // Se calcula el precio de esta línea (aplica al mayor si corresponde)
  const calculo = calcularLinea(producto, unidades, es_mayor)

  // Si el producto se puede vender al mayor
  const ofreceMayor =
    Number(producto.precio_mayor_ves) > 0 || Number(producto.precio_mayor_usd) > 0

  return (
    <div className="rounded-lg border border-[var(--borde)] p-3">
      {/* Nombre y botón para quitar */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{producto.nombre}</p>
          <p className="text-xs texto-suave">
            Bs. {formatearVes(calculo.precioUnitarioVes)} c/u
            {calculo.esMayor && (
              <span className="ml-1 rounded bg-marca-50 px-1.5 py-0.5 text-[10px] font-medium text-marca-700">
                al mayor
              </span>
            )}
            {calculo.descuentoPorcentaje > 0 && (
              <span className="ml-1 rounded bg-exito-500/10 px-1.5 py-0.5 text-[10px] font-medium text-exito-600">
                -{calculo.descuentoPorcentaje}%
              </span>
            )}
          </p>
        </div>

        <button onClick={() => alQuitar(producto.id)} className="text-xs text-red-600 hover:underline">
          Quitar
        </button>
      </div>

      {/* Casilla para cobrar al mayor */}
      {ofreceMayor && (
        <label className="mt-2 flex cursor-pointer items-center gap-2 text-xs texto-suave">
          <input
            type="checkbox"
            checked={es_mayor}
            onChange={(e) => alCambiarMayor(producto.id, e.target.checked)}
            className="h-4 w-4 rounded border-[var(--borde)]"
          />
          Cobrar al mayor (desde {producto.cantidad_mayor} und.)
        </label>
      )}

      {/* Controles de cantidad y subtotal */}
      <div className="mt-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <button
            onClick={() => alCambiarCantidad(producto.id, unidades - 1)}
            className="grid h-7 w-7 place-items-center rounded border border-[var(--borde)] text-sm font-bold transition hover:bg-[var(--fondo)]"
          >
            −
          </button>

          <input
            type="number"
            min="0"
            max={producto.stock}
            value={unidades}
            onChange={(e) => alCambiarCantidad(producto.id, Number(e.target.value))}
            className="campo w-16 px-1 py-1 text-center"
          />

          <button
            onClick={() => alCambiarCantidad(producto.id, unidades + 1)}
            className="grid h-7 w-7 place-items-center rounded border border-[var(--borde)] text-sm font-bold transition hover:bg-[var(--fondo)]"
          >
            +
          </button>
        </div>

        <p className="text-sm font-semibold">Bs. {formatearVes(calculo.subtotalVes)}</p>
      </div>
    </div>
  )
}
