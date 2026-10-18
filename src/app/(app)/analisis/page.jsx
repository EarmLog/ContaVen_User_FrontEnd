'use client'

/*
 * (page.jsx)
 * Pantalla de Análisis y reportes.
 *
 * Las gráficas de recharts solo se cargan en el navegador (ssr: false),
 * porque necesitan medir los elementos de la pantalla para dibujarse.
 * Así el export estático de Next no intenta renderizarlas en el servidor.
 */

import dynamic from 'next/dynamic'

import Cargando from '../../../components/ui/Cargando'

const Analisis = dynamic(() => import('./contenido'), {
  ssr: false,
  loading: () => <Cargando mensaje="Abriendo el análisis..." />,
})

/**
 * Ruta /analisis.
 * @returns {JSX.Element}
 */
export default function PaginaAnalisis() {
  return <Analisis />
}
