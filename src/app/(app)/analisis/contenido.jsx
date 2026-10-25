'use client'

/*
 * (contenido.jsx)
 * Pantalla de Análisis y Reportes.
 *
 * Muestra:
 *  - Productos más vendidos
 *  - Ganancia total en VES y en USD (precio de venta - precio de compra)
 *  - Gráficas de ventas por día, por mes, por hora y por método de pago
 *  - Un filtro por rango de fechas y de horas
 *
 * Esta pantalla vive de los reportes del servidor, así que necesita internet.
 * Si no lo hay, se explica con un aviso en vez de dejar la pantalla en blanco.
 *
 * Se importa con next/dynamic (ssr: false) porque las gráficas de recharts
 * necesitan medir el navegador para dibujarse.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import * as api from '../../../lib/api'
import Aviso from '../../../components/ui/Aviso'
import Cargando from '../../../components/ui/Cargando'
import {
  fechaCorta,
  fechaDeHoy,
  fechaHaceDias,
  formatearUsd,
  formatearVes,
  redondear,
} from '../../../lib/formato'

// Colores para las gráficas
const COLORES = ['#3182f6', '#16a34a', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#ef4444']

/**
 * Componente de la pantalla de análisis.
 * @returns {JSX.Element}
 */
export default function AnalisisContenido() {
  const router = useRouter()

  // Referencia para bajar hasta las gráficas cuando se pulsa "Ver gráficas"
  const refAnalisisProducto = useRef(null)

  // --- Estado de la pantalla ---
  const [datos, setDatos] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [sinInternet, setSinInternet] = useState(false)

  // --- Estado de la lista de productos sin vender ---
  const [productosSinVender, setProductosSinVender] = useState([])
  const [cargandoSinVender, setCargandoSinVender] = useState(false)

  // --- Estado del análisis de un solo producto ---
  const [idProductoSeleccionado, setIdProductoSeleccionado] = useState('')
  const [analisisProducto, setAnalisisProducto] = useState(null)
  const [cargandoProducto, setCargandoProducto] = useState(false)
  const [errorProducto, setErrorProducto] = useState('')

  // --- Estado de los filtros ---
  const [filtros, setFiltros] = useState({
    desde: fechaHaceDias(30),   // hace 30 días
    hasta: fechaDeHoy(),         // hasta hoy
    hora_inicio: '',
    hora_fin: '',
  })

  /**
   * Pide al backend el reporte con los filtros indicados.
   * @param {object} filtrosAAplicar - Los filtros que se mandan
   */
  const cargarReporte = useCallback(async (filtrosAAplicar) => {
    setCargando(true)
    setError('')
    setSinInternet(false)

    try {
      const respuesta = await api.obtenerResumen(filtrosAAplicar)
      setDatos(respuesta)
    } catch (errorCarga) {
      // Los reportes se calculan en el servidor, sin internet no se puede
      if (errorCarga.sinConexion) {
        setSinInternet(true)
        setError(
          'Los reportes se generan con la información del servidor, así que necesitas conexión a internet.',
        )
      } else {
        setError(errorCarga.message)
      }
    } finally {
      setCargando(false)
    }
  }, [])

  /**
   * Pide al backend las gráficas de un producto con los filtros indicados.
   * @param {number|string} id - El id del producto en el servidor
   * @param {object} filtrosAAplicar - Los filtros que se mandan
   */
  const cargarProducto = useCallback(async (id, filtrosAAplicar) => {
    if (!id) {
      setAnalisisProducto(null)
      return
    }

    setCargandoProducto(true)
    setErrorProducto('')

    try {
      const respuesta = await api.obtenerAnalisisProducto(id, filtrosAAplicar)
      setAnalisisProducto(respuesta)
    } catch (errorCarga) {
      setErrorProducto(errorCarga.message)
      setAnalisisProducto(null)
    } finally {
      setCargandoProducto(false)
    }
  }, [])

  // Se carga el reporte al abrir la pantalla
  useEffect(() => {
    cargarReporte(filtros)
    // Solo se ejecuta al montar la pantalla
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /**
   * Cambia el valor de un filtro.
   * @param {object} evento - El evento del input
   */
  function manejarFiltro(evento) {
    const { name, value } = evento.target
    setFiltros((anterior) => ({ ...anterior, [name]: value }))
  }

  /**
   * Aplica los filtros elegidos y vuelve a pedir el reporte.
   */
  function aplicarFiltros() {
    cargarReporte(filtros)

    // Si hay un producto seleccionado, se actualizan también sus gráficas
    if (idProductoSeleccionado) cargarProducto(idProductoSeleccionado, filtros)
  }

  /**
   * Pide al backend la lista de productos que no se vendieron en el periodo.
   */
  async function cargarSinVender() {
    setCargandoSinVender(true)

    try {
      const respuesta = await api.obtenerProductosSinVender({
        desde: filtros.desde,
        hasta: filtros.hasta,
      })
      setProductosSinVender(respuesta.productos || [])
    } catch (errorCarga) {
      setError(errorCarga.message)
    } finally {
      setCargandoSinVender(false)
    }
  }

  /**
   * Cambia el producto que se está analizando en las gráficas.
   * @param {object} evento - El evento del selector
   */
  function seleccionarProducto(evento) {
    const id = evento.target.value
    setIdProductoSeleccionado(id)

    if (id) {
      cargarProducto(id, filtros)
    } else {
      setAnalisisProducto(null)
    }
  }

  /**
   * Muestra las gráficas de un producto y baja hasta esa sección.
   * @param {object} producto - Producto de la lista de vendidos o sin vender
   */
  function verGraficas(producto) {
    // En "más vendidos" el id del servidor viene como producto_id;
    // en "sin vender" viene como id.
    const id = producto.producto_id || producto.id
    if (!id) return

    setIdProductoSeleccionado(String(id))
    cargarProducto(id, filtros)

    window.requestAnimationFrame(() => {
      refAnalisisProducto.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    })
  }

  /**
   * Lleva al inventario y abre la ventana de edición de un producto.
   * @param {number} idServidor - El id del producto en el servidor
   * @param {boolean} oferta - Si true, abre directo en la parte de ofertas
   */
  function irAInventario(idServidor, oferta = false) {
    if (!idServidor) return

    const parametroOferta = oferta ? '&oferta=1' : ''
    router.push(`/inventario/?editar=${idServidor}${parametroOferta}`)
  }

  /**
   * Botones de acción que se repiten en las dos listas.
   * @param {number} idServidor - Id del producto en el servidor (null si fue borrado)
   * @param {Function} alVerGraficas - Qué hacer al pulsar "Gráficas"
   * @returns {JSX.Element}
   */
  function botonesDeAccion(idServidor, alVerGraficas) {
    const sinProducto = !idServidor
    const titulo = sinProducto ? 'Este producto ya no existe en el inventario' : undefined

    return (
      <div className="flex justify-end gap-1.5">
        <button
          type="button"
          onClick={alVerGraficas}
          disabled={sinProducto}
          title={titulo}
          className="rounded-md border border-[var(--borde)] px-2.5 py-1 text-xs font-medium transition hover:bg-marca-50 hover:text-marca-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Gráficas
        </button>
        <button
          type="button"
          onClick={() => irAInventario(idServidor)}
          disabled={sinProducto}
          title={titulo}
          className="rounded-md border border-[var(--borde)] px-2.5 py-1 text-xs font-medium transition hover:bg-marca-50 hover:text-marca-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Editar
        </button>
        <button
          type="button"
          onClick={() => irAInventario(idServidor, true)}
          disabled={sinProducto}
          title={titulo}
          className="rounded-md bg-marca-600 px-2.5 py-1 text-xs font-medium text-white transition hover:bg-marca-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Oferta
        </button>
      </div>
    )
  }

  /**
   * Vuelve el filtro a los últimos 30 días.
   */
  function restablecerFiltros() {
    const nuevosFiltros = {
      desde: fechaHaceDias(30),
      hasta: fechaDeHoy(),
      hora_inicio: '',
      hora_fin: '',
    }

    setFiltros(nuevosFiltros)
    cargarReporte(nuevosFiltros)

    if (idProductoSeleccionado) {
      cargarProducto(idProductoSeleccionado, nuevosFiltros)
    }
  }

  // Mientras carga se muestra el spinner
  if (cargando && !datos) return <Cargando mensaje="Generando el reporte..." />

  const totales = datos?.totales || {}
  const masVendidos = datos?.mas_vendidos || []
  const productos = datos?.productos || []
  const porDia = datos?.por_dia || []
  const porMes = datos?.por_mes || []
  const porHora = datos?.por_hora || []
  const porMetodo = datos?.por_metodo_pago || []

  // Si hay alguna venta en el periodo se calcula el margen de ganancia
  const margen = totales.ventas_ves > 0
    ? redondear((totales.ganancia_ves / totales.ventas_ves) * 100)
    : 0

  return (
    <div className="space-y-6">

      {/* --- Encabezado --- */}
      <div>
        <h1 className="text-2xl font-semibold">Análisis y reportes</h1>
        <p className="mt-1 text-sm texto-suave">
          Revisa tus ventas, tus productos más vendidos y tu ganancia.
        </p>
      </div>

      <Aviso
        tipo={sinInternet ? 'info' : 'error'}
        mensaje={error}
        alCerrar={() => setError('')}
      />

      {/* --- Filtros por rango de fechas y horas --- */}
      <section className="tarjeta p-5">
        <h2 className="mb-4 font-semibold">Filtros</h2>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Desde (fecha)</label>
            <input
              type="date"
              name="desde"
              value={filtros.desde}
              onChange={manejarFiltro}
              className="campo"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Hasta (fecha)</label>
            <input
              type="date"
              name="hasta"
              value={filtros.hasta}
              onChange={manejarFiltro}
              className="campo"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Hora desde</label>
            <input
              type="time"
              name="hora_inicio"
              value={filtros.hora_inicio}
              onChange={manejarFiltro}
              className="campo"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Hora hasta</label>
            <input
              type="time"
              name="hora_fin"
              value={filtros.hora_fin}
              onChange={manejarFiltro}
              className="campo"
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            onClick={aplicarFiltros}
            disabled={cargando}
            className="rounded-lg bg-marca-600 px-6 py-2 text-sm font-medium text-white transition hover:bg-marca-700 disabled:opacity-60"
          >
            {cargando ? 'Aplicando...' : 'Aplicar filtros'}
          </button>

          <button
            onClick={restablecerFiltros}
            className="rounded-lg border border-[var(--borde)] px-6 py-2 text-sm font-medium transition hover:bg-[var(--fondo)]"
          >
            Últimos 30 días
          </button>
        </div>
      </section>

      {/* --- Tarjetas con las cifras del periodo --- */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Cifra
          titulo="Ventas del periodo"
          valor_ves={totales.ventas_ves}
          valor_usd={totales.ventas_usd}
          detalle={`${totales.ventas || 0} venta(s)`}
        />
        <Cifra
          titulo="Ganancia total"
          valor_ves={totales.ganancia_ves}
          valor_usd={totales.ganancia_usd}
          detalle={`Margen: ${margen}%`}
          esGanancia
        />
        <Cifra
          titulo="Costo de los productos"
          valor_ves={totales.costo_ves}
          valor_usd={totales.costo_usd}
          solo_ves
          detalle="Lo que te costaron los productos vendidos"
        />
        <Cifra
          titulo="Unidades vendidas"
          valor_texto={String(totales.ventas || 0)}
          detalle="Cantidad de transacciones"
        />
      </div>

      {/* --- Productos más vendidos --- */}
      <section className="tarjeta overflow-hidden">
        <h2 className="border-b border-[var(--borde)] px-5 py-4 font-semibold">
          Productos más vendidos
        </h2>

        {masVendidos.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm texto-suave">
            No hay ventas en el periodo seleccionado.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--fondo)] text-left text-xs texto-suave uppercase">
                <tr>
                  <th className="px-5 py-2 font-medium">#</th>
                  <th className="px-5 py-2 font-medium">Producto</th>
                  <th className="px-5 py-2 font-medium">Fechas</th>
                  <th className="px-5 py-2 text-right font-medium">Unidades</th>
                  <th className="px-5 py-2 text-right font-medium">Ingresos VES</th>
                  <th className="px-5 py-2 text-right font-medium">Ingresos USD</th>
                  <th className="px-5 py-2 text-right font-medium">Ganancia VES</th>
                  <th className="px-5 py-2 text-right font-medium">Ganancia USD</th>
                  <th className="px-5 py-2 text-right font-medium">Acciones</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[var(--borde)]">
                {masVendidos.map((producto, indice) => (
                  <tr key={producto.producto_id || `${producto.producto_nombre}-${indice}`}>
                    <td className="px-5 py-2.5 texto-suave">{indice + 1}</td>
                    <td className="px-5 py-2.5 font-medium">
                      <span className="block">{producto.producto_nombre}</span>
                      {producto.sku && (
                        <span className="mt-0.5 block font-mono text-xs font-normal texto-suave">
                          {producto.sku}
                        </span>
                      )}
                      {!producto.producto_id && (
                        <span className="mt-0.5 block text-xs font-normal text-amber-700">
                          Producto eliminado
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-2.5">
                      <FechasProducto producto={producto} />
                    </td>
                    <td className="px-5 py-2.5 text-right font-semibold">{producto.unidades}</td>
                    <td className="px-5 py-2.5 text-right">
                      Bs. {formatearVes(producto.ingresos_ves)}
                    </td>
                    <td className="px-5 py-2.5 text-right">{formatearUsd(producto.ingresos_usd)}</td>
                    <td className="px-5 py-2.5 text-right font-medium text-exito-600">
                      Bs. {formatearVes(producto.ganancia_ves)}
                    </td>
                    <td className="px-5 py-2.5 text-right text-exito-600">
                      {formatearUsd(producto.ganancia_usd)}
                    </td>
                    <td className="px-5 py-2.5">
                      {botonesDeAccion(producto.producto_id, () => verGraficas(producto))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* --- Productos sin vender (con opción de descuento) --- */}
      <section className="tarjeta overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--borde)] px-5 py-4">
          <div>
            <h2 className="font-semibold">Productos sin vender</h2>
            <p className="mt-0.5 text-xs texto-suave">
              Estos productos no tuvieron ventas en el periodo. Puedes ofrecerles un descuento.
            </p>
          </div>
          <button
            onClick={cargarSinVender}
            disabled={cargandoSinVender}
            className="rounded-lg border border-[var(--borde)] px-4 py-2 text-sm font-medium transition hover:bg-[var(--fondo)] disabled:opacity-60"
          >
            {cargandoSinVender ? 'Cargando...' : 'Buscar sin ventas'}
          </button>
        </div>

        {productosSinVender.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm texto-suave">
            Toca «Buscar sin ventas» para ver los productos que no se vendieron.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--fondo)] text-left text-xs texto-suave uppercase">
                <tr>
                  <th className="px-5 py-2 font-medium">Producto</th>
                  <th className="px-5 py-2 font-medium">Fechas</th>
                  <th className="px-5 py-2 text-right font-medium">Stock</th>
                  <th className="px-5 py-2 text-right font-medium">Precio VES</th>
                  <th className="px-5 py-2 text-right font-medium">Descuento actual</th>
                  <th className="px-5 py-2 text-right font-medium">Acciones</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[var(--borde)]">
                {productosSinVender.map((producto) => {
                  const enDescuento = Number(producto.descuento_unidad_porcentaje) > 0

                  return (
                    <tr key={producto.id}>
                      <td className="px-5 py-2.5 font-medium">
                        {producto.nombre}
                        {producto.sku && (
                          <span className="ml-2 text-xs texto-suave">{producto.sku}</span>
                        )}
                      </td>
                      <td className="px-5 py-2.5">
                        <FechasProducto producto={producto} />
                      </td>
                      <td className="px-5 py-2.5 text-right">{producto.stock}</td>
                      <td className="px-5 py-2.5 text-right">
                        Bs. {formatearVes(producto.precio_ves)}
                      </td>
                      <td className="px-5 py-2.5 text-right">
                        {enDescuento ? (
                          <span className="rounded-full bg-exito-500/10 px-2 py-0.5 text-xs font-medium text-exito-600">
                            {producto.descuento_unidad_porcentaje}% desde{' '}
                            {producto.descuento_unidad_desde} und.
                          </span>
                        ) : (
                          <span className="text-xs texto-suave">Sin descuento</span>
                        )}
                      </td>
                      <td className="px-5 py-2.5">
                        {botonesDeAccion(producto.id, () => verGraficas(producto))}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* --- Análisis de un producto (descuentos y ventas) --- */}
      <section ref={refAnalisisProducto} className="tarjeta scroll-mt-6 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold">Análisis por producto</h2>
            <p className="mt-0.5 text-xs texto-suave">
              Selecciona un producto para ver si sus ventas aumentaron después de aplicar
              una oferta o descuento.
            </p>
          </div>

          <select
            value={idProductoSeleccionado}
            onChange={seleccionarProducto}
            className="campo max-w-sm"
            aria-label="Producto para analizar"
          >
            <option value="">Selecciona un producto…</option>
            {productos.map((producto) => (
              <option key={producto.id} value={producto.id}>
                {producto.nombre}
                {producto.sku ? ` · ${producto.sku}` : ''}
              </option>
            ))}
          </select>
        </div>

        <Aviso
          tipo="error"
          mensaje={errorProducto}
          alCerrar={() => setErrorProducto('')}
        />

        {!idProductoSeleccionado ? (
          <p className="py-8 text-center text-sm texto-suave">
            Elige un producto en la lista o pulsa «Gráficas» en una de las tablas de arriba.
          </p>
        ) : cargandoProducto ? (
          <p className="py-8 text-center text-sm texto-suave">Cargando las gráficas…</p>
        ) : analisisProducto ? (
          <DetalleProducto datos={analisisProducto} />
        ) : null}
      </section>

      {/* --- Gráfica de ventas por día --- */}
      <Grafica
        titulo="Ventas por día"
        descripcion="Ingresos y ganancia de cada día del periodo."
        hayDatos={porDia.length > 0}
      >
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={porDia}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--borde)" />
            <XAxis dataKey="etiqueta" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip
              formatter={(valor) => `Bs. ${formatearVes(valor)}`}
              contentStyle={{ borderRadius: '0.5rem', fontSize: '0.8rem' }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="ingresos_ves"
              name="Ingresos"
              stroke="#3182f6"
              strokeWidth={2}
            />
            <Line
              type="monotone"
              dataKey="ganancia_ves"
              name="Ganancia"
              stroke="#16a34a"
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </Grafica>

      {/* --- Gráfica de ventas por día --- */}
      <Grafica
        titulo="Unidades vendidas por día"
        descripcion="Cuántas ventas se hicieron cada día."
        hayDatos={porDia.length > 0}
      >
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={porDia}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--borde)" vertical={false} />
            <XAxis dataKey="etiqueta" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip
              contentStyle={{ borderRadius: '0.5rem', fontSize: '0.8rem' }}
              cursor={{ fill: 'rgba(49,130,246,0.1)' }}
            />
            <Bar dataKey="ventas" name="Ventas" fill="#3182f6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Grafica>

      {/* --- Las dos gráficas de abajo --- */}
      <div className="grid gap-6 lg:grid-cols-2">

        {/* Ventas por mes */}
        <Grafica
          titulo="Ventas por mes"
          descripcion="Comportamiento mensual del negocio."
          hayDatos={porMes.length > 0}
        >
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={porMes}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--borde)" vertical={false} />
              <XAxis dataKey="etiqueta" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip
                formatter={(valor) => `Bs. ${formatearVes(valor)}`}
                contentStyle={{ borderRadius: '0.5rem', fontSize: '0.8rem' }}
              />
              <Bar dataKey="ingresos_ves" name="Ingresos" fill="#3182f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Grafica>

        {/* Ventas por hora del día */}
        <Grafica
          titulo="Ventas por hora"
          descripcion="A qué horas se vende más durante el día."
          hayDatos={porHora.length > 0}
        >
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={porHora}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--borde)" vertical={false} />
              <XAxis dataKey="etiqueta" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip
                formatter={(valor) => `Bs. ${formatearVes(valor)}`}
                contentStyle={{ borderRadius: '0.5rem', fontSize: '0.8rem' }}
              />
              <Bar dataKey="ingresos_ves" name="Ingresos" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Grafica>
      </div>

      {/* --- Gráfica por método de pago --- */}
      <Grafica
        titulo="Ventas por método de pago"
        descripcion="Cómo están repartidas tus ventas según cómo te pagaron."
        hayDatos={porMetodo.length > 0}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={porMetodo}
                dataKey="ingresos_ves"
                nameKey="etiqueta"
                cx="50%"
                cy="50%"
                outerRadius={90}
                label={({ name }) => name}
              >
                {porMetodo.map((fila, indice) => (
                  <Cell key={indice} fill={COLORES[indice % COLORES.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(valor) => `Bs. ${formatearVes(valor)}`}
                contentStyle={{ borderRadius: '0.5rem', fontSize: '0.8rem' }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>

          {/* La misma información en tabla, para leer los montos exactos */}
          <div className="space-y-2 self-center">
            {porMetodo.map((fila, indice) => (
              <div
                key={indice}
                className="flex items-center justify-between rounded-lg border border-[var(--borde)] px-4 py-2.5"
              >
                <span className="flex items-center gap-2 text-sm font-medium">
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: COLORES[indice % COLORES.length] }}
                  />
                  {fila.etiqueta}
                </span>
                <span className="text-right text-sm">
                  <span className="block font-semibold">Bs. {formatearVes(fila.ingresos_ves)}</span>
                  <span className="block text-xs texto-suave">{formatearUsd(fila.ingresos_usd)}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </Grafica>
    </div>
  )
}

/**
 * Muestra las fechas importantes de un producto en las listas.
 * @param {object} props - { producto }
 * @returns {JSX.Element}
 */
function FechasProducto({ producto }) {
  const registrado = fechaCorta(producto.creado_en)
  const editado = fechaCorta(producto.actualizado_en)
  const ultimaVenta = producto.ultima_venta ? fechaCorta(producto.ultima_venta) : null
  const nuncaVendido = !producto.ultima_venta
  const dias = Number(producto.dias_sin_vender)
  const tieneDias = Number.isFinite(dias)

  return (
    <div className="space-y-0.5 text-xs texto-suave">
      <p>
        <span className="font-medium">Registrado:</span> {registrado}
      </p>
      <p>
        <span className="font-medium">Editado:</span> {editado}
      </p>
      <p>
        <span className="font-medium">Última venta:</span>{' '}
        {nuncaVendido ? 'Nunca' : ultimaVenta}
      </p>
      {tieneDias && (
        <p
          className={
            dias > 30
              ? 'font-medium text-amber-700'
              : dias === 0
                ? 'font-medium text-exito-600'
                : ''
          }
        >
          {nuncaVendido
            ? `Sin vender desde el registro (${dias} día${dias === 1 ? '' : 's'})`
            : dias === 0
              ? 'Se vendió hoy'
              : `Hace ${dias} día${dias === 1 ? '' : 's'} sin vender`}
        </p>
      )}
    </div>
  )
}

/**
 * Gráficas y totales de un solo producto.
 * @param {object} props - { datos: { producto, resumen, comparacion, por_dia } }
 * @returns {JSX.Element}
 */
function DetalleProducto({ datos }) {
  const { producto, resumen, comparacion } = datos
  const porDia = datos.por_dia || []

  const totalUnidades = Number(resumen.unidades) || 0
  const conDescuento = Number(resumen.unidades_con_descuento) || 0
  const sinDescuento = Number(resumen.unidades_sin_descuento) || 0
  const porcentajeDescuento =
    totalUnidades > 0 ? Math.round((conDescuento / totalUnidades) * 100) : 0
  const diasSinVender = Number(resumen.dias_sin_vender)
  const tieneDias = Number.isFinite(diasSinVender)
  const aumento = comparacion.aumento_porcentaje

  const descuentoUnidad = Number(producto.descuento_unidad_porcentaje) || 0
  const descuentoBulto = Number(producto.descuento_bulto_porcentaje) || 0

  const datosComparacion = comparacion.aplica
    ? [
        {
          etiqueta: 'Antes',
          promedio: comparacion.promedio_antes,
          unidades: comparacion.unidades_antes,
          dias: comparacion.dias_antes,
        },
        {
          etiqueta: 'Después',
          promedio: comparacion.promedio_despues,
          unidades: comparacion.unidades_despues,
          dias: comparacion.dias_despues,
        },
      ]
    : []

  const claseComparacion =
    aumento === null
      ? 'border-[var(--borde)] bg-[var(--fondo)]'
      : aumento >= 0
        ? 'border-exito-500/30 bg-exito-500/10 text-exito-600'
        : 'border-red-200 bg-red-50 text-red-700'

  const textoAumento =
    aumento === null
      ? 'No hay suficientes ventas antes del descuento para comparar'
      : aumento > 0
        ? `Las ventas aumentaron ${aumento}%`
        : aumento < 0
          ? `Las ventas bajaron ${Math.abs(aumento)}%`
          : 'Las ventas se mantuvieron igual (0%)'

  return (
    <div className="mt-5 space-y-5 border-t border-[var(--borde)] pt-5">
      {/* --- Datos del producto --- */}
      <div>
        <h3 className="text-lg font-semibold">
          {producto.nombre}
          {producto.variante ? ` - ${producto.variante}` : ''}
        </h3>

        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs texto-suave">
          {producto.sku && <span className="font-mono">{producto.sku}</span>}
          <span>Registrado: {fechaCorta(producto.creado_en)}</span>
          <span>Editado: {fechaCorta(producto.actualizado_en)}</span>
          <span>Stock: {producto.stock}</span>
          <span>
            {descuentoUnidad > 0
              ? `Oferta por unidad: ${descuentoUnidad}% desde ${producto.descuento_unidad_desde} und.`
              : 'Sin descuento por unidad'}
          </span>
          {descuentoBulto > 0 && <span>Oferta por bulto: {descuentoBulto}%</span>}
        </div>

        <p className="mt-1 text-xs texto-suave">
          {resumen.nunca_vendido
            ? `Nunca se ha vendido. Registrado hace ${diasSinVender} día(s).`
            : `Última venta: ${fechaCorta(resumen.ultima_venta)}${
                tieneDias
                  ? ` · Hace ${diasSinVender} día${diasSinVender === 1 ? '' : 's'} sin vender`
                  : ''
              }.`}
        </p>
      </div>

      {/* --- Cifras del periodo --- */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Cifra
          titulo="Unidades en el periodo"
          valor_texto={String(totalUnidades)}
          detalle={`${resumen.ventas || 0} venta(s) · ${resumen.dias_con_ventas || 0} día(s) con ventas`}
        />
        <Cifra
          titulo="Con descuento"
          valor_texto={String(conDescuento)}
          detalle={`${porcentajeDescuento}% de las unidades`}
        />
        <Cifra
          titulo="Sin descuento"
          valor_texto={String(sinDescuento)}
          detalle="Unidades vendidas a precio normal"
        />
        <Cifra
          titulo="Ingresos del periodo"
          valor_ves={resumen.ingresos_ves}
          valor_usd={resumen.ingresos_usd}
          detalle={`Ganancia: Bs. ${formatearVes(resumen.ganancia_ves)}`}
        />
      </div>

      {/* --- Resultado de la comparación antes/después --- */}
      {comparacion.aplica ? (
        <div className={`rounded-lg border p-4 ${claseComparacion}`}>
          <p className="font-semibold">{textoAumento}</p>
          <p className="mt-1 text-xs">
            Promedio diario antes del primer descuento:{' '}
            <strong>{comparacion.promedio_antes} und/día</strong> durante{' '}
            {comparacion.dias_antes} día(s). Después:{' '}
            <strong>{comparacion.promedio_despues} und/día</strong> durante{' '}
            {comparacion.dias_despues} día(s). El primer descuento fue el{' '}
            {fechaCorta(comparacion.primera_con_descuento)}.
          </p>
        </div>
      ) : (
        <Aviso
          tipo="info"
          mensaje="Este producto todavía no tiene ventas con descuento. Cuando apliques una oferta y se venda, aquí verás si las ventas subieron o bajaron."
        />
      )}

      {/* --- Gráficas del producto --- */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Grafica
          titulo="Unidades por día"
          descripcion="Ventas con descuento y sin descuento en el periodo."
          hayDatos={totalUnidades > 0}
        >
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={porDia}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--borde)" vertical={false} />
              <XAxis
                dataKey="etiqueta"
                tick={{ fontSize: 11 }}
                tickFormatter={(valor) => fechaCorta(valor).slice(0, 5)}
              />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip
                labelFormatter={(valor) => fechaCorta(valor)}
                contentStyle={{ borderRadius: '0.5rem', fontSize: '0.8rem' }}
                cursor={{ fill: 'rgba(49,130,246,0.1)' }}
              />
              <Legend />
              <Bar
                dataKey="unidades_sin_descuento"
                name="Sin descuento"
                stackId="unidades"
                fill="#3182f6"
              />
              <Bar
                dataKey="unidades_con_descuento"
                name="Con descuento"
                stackId="unidades"
                fill="#16a34a"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </Grafica>

        <Grafica
          titulo="Antes y después del descuento"
          descripcion="Promedio diario de unidades antes y después del primer descuento."
          hayDatos={datosComparacion.length > 0}
        >
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={datosComparacion}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--borde)" vertical={false} />
              <XAxis dataKey="etiqueta" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip
                formatter={(valor) => [`${valor} und/día`, 'Promedio']}
                contentStyle={{ borderRadius: '0.5rem', fontSize: '0.8rem' }}
                cursor={{ fill: 'rgba(49,130,246,0.1)' }}
              />
              <Bar dataKey="promedio" name="Unidades por día" radius={[4, 4, 0, 0]}>
                {datosComparacion.map((fila, indice) => (
                  <Cell key={fila.etiqueta} fill={indice === 0 ? '#94a3b8' : '#16a34a'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Grafica>
      </div>
    </div>
  )
}

/**
 * Tarjeta con una cifra del reporte.
 * @param {object} props - { titulo, valor_ves, valor_usd, valor_texto, detalle, esGanancia, solo_ves }
 * @returns {JSX.Element}
 */
function Cifra({ titulo, valor_ves, valor_usd, valor_texto, detalle, esGanancia, solo_ves }) {
  return (
    <div className="tarjeta p-5">
      <p className="text-xs font-medium texto-suave uppercase">{titulo}</p>

      {valor_texto !== undefined ? (
        <p className="mt-2 text-2xl font-bold">{valor_texto}</p>
      ) : (
        <>
          <p className={`mt-2 text-2xl font-bold ${esGanancia ? 'text-exito-600' : ''}`}>
            Bs. {formatearVes(valor_ves || 0)}
          </p>
          {!solo_ves && (
            <p className="mt-0.5 text-sm texto-suave">{formatearUsd(valor_usd || 0)}</p>
          )}
        </>
      )}

      {detalle && <p className="mt-2 text-xs texto-suave">{detalle}</p>}
    </div>
  )
}

/**
 * Envuelve cada gráfica con su título.
 * @param {object} props - { titulo, descripcion, hayDatos, children }
 * @returns {JSX.Element}
 */
function Grafica({ titulo, descripcion, hayDatos, children }) {
  return (
    <section className="tarjeta p-5">
      <h2 className="font-semibold">{titulo}</h2>
      <p className="mb-4 mt-0.5 text-xs texto-suave">{descripcion}</p>

      {hayDatos ? (
        children
      ) : (
        <p className="py-10 text-center text-sm texto-suave">
          No hay datos para mostrar en este periodo.
        </p>
      )}
    </section>
  )
}
