/*
 * (Analisis.jsx)
 * Pantalla de Análisis y Reportes.
 *
 * Muestra:
 *  - Productos vendidos en el día
 *  - Productos más vendidos
 *  - Ganancia total en VES y en USD (precio de venta - precio de compra)
 *  - Gráficas de ventas por día, por mes, por hora y por método de pago
 *  - Un filtro por rango de fechas y de horas
 */

import { useCallback, useEffect, useState } from 'react'
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

import * as api from '../services/api'
import Aviso from '../components/Aviso'
import Cargando from '../components/Cargando'
import { fechaDeHoy, fechaHaceDias, formatearUsd, formatearVes, redondear } from '../utils/formato'

// Colores para las gráficas
const COLORES = ['#3182f6', '#16a34a', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#ef4444']

/**
 * Componente de la pantalla de análisis.
 * @returns {JSX.Element}
 */
export default function Analisis() {
  // --- Estado de la pantalla ---
  const [datos, setDatos] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

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

    try {
      const respuesta = await api.obtenerResumen(filtrosAAplicar)
      setDatos(respuesta)
    } catch (errorCarga) {
      setError(errorCarga.message)
    } finally {
      setCargando(false)
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
   *     Aplica los filtros elegidos y vuelve a pedir el reporte.
   */
  function aplicarFiltros() {
    cargarReporte(filtros)
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
  }

  // Mientras carga se muestra el spinner
  if (cargando && !datos) return <Cargando mensaje="Generando el reporte..." />

  const totales = datos?.totales || {}
  const masVendidos = datos?.mas_vendidos || []
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

      <Aviso tipo="error" mensaje={error} alCerrar={() => setError('')} />

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
                  <th className="px-5 py-2 text-right font-medium">Unidades</th>
                  <th className="px-5 py-2 text-right font-medium">Ingresos VES</th>
                  <th className="px-5 py-2 text-right font-medium">Ingresos USD</th>
                  <th className="px-5 py-2 text-right font-medium">Ganancia VES</th>
                  <th className="px-5 py-2 text-right font-medium">Ganancia USD</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[var(--borde)]">
                {masVendidos.map((producto, indice) => (
                  <tr key={indice}>
                    <td className="px-5 py-2.5 texto-suave">{indice + 1}</td>
                    <td className="px-5 py-2.5 font-medium">{producto.producto_nombre}</td>
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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

      {/* --- Gráfica de unidades vendidas por día --- */}
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
