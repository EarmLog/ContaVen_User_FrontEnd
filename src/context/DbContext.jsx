'use client'

/*
 * (DbContext.jsx)
 * Contexto que arranca la base de datos local y la sincronización.
 *
 * Deja disponibles en toda la app:
 *  - listo: si la base local ya terminó de abrir
 *  - pendientes: cuántos cambios están esperando subir al servidor
 *  - sincronizando: si hay una sincronización en curso
 *  - sincronizar: fuerza una sincronización manual
 *
 * Las pantallas pueden pedir y guardar datos llamando directamente a
 * dbAdapter; este contexto solo se encarga del arranque y del estado
 * general de la sincronización.
 */

import { createContext, useCallback, useContext, useEffect, useState } from 'react'

import { contarPendientes, iniciarAdaptador, sincronizar } from '../lib/db/dbAdapter'
import { iniciarSincronizador, sincronizarAhora } from '../lib/db/sincronizador'

// Se crea el contexto de los datos
const ContextoDatos = createContext(null)

/**
 * Componente que envuelve la app y la deja conectada con la base local.
 * @param {object} props - { children }
 * @returns {JSX.Element}
 */
export function ProveedorDatos({ children }) {
  const [listo, setListo] = useState(false)
  const [pendientes, setPendientes] = useState(0)
  const [sincronizando, setSincronizando] = useState(false)

  /**
   * Abre la base local y enciende el sincronizador al arrancar la app.
   */
  useEffect(() => {
    let montado = true
    let apagarSincronizador = () => {}

    async function iniciar() {
      await iniciarAdaptador()
      if (!montado) return

      setListo(true)

      // El sincronizador avisa cada vez que cambian los pendientes
      apagarSincronizador = iniciarSincronizador((cuantos) => {
        if (montado) setPendientes(cuantos)
      })

      // Se revisa de una vez cuántos hay
      setPendientes(await contarPendientes())
    }

    iniciar()

    return () => {
      montado = false
      apagarSincronizador()
    }
  }, [])

  /**
   * Fuerza una sincronización y actualiza el estado de la pantalla.
   */
  const sincronizarAhoraManual = useCallback(async () => {
    setSincronizando(true)
    try {
      await sincronizarAhora()
    } finally {
      setPendientes(await contarPendientes())
      setSincronizando(false)
    }
  }, [])

  /**
   * Sube y baja datos con el servidor de una vez (sin pasar por el
   * sincronizador automático). Se usa, por ejemplo, al guardar algo.
   */
  const sincronizarFuerte = useCallback(async () => {
    setSincronizando(true)
    try {
      await sincronizar()
    } finally {
      setPendientes(await contarPendientes())
      setSincronizando(false)
    }
  }, [])

  return (
    <ContextoDatos.Provider
      value={{
        listo,
        pendientes,
        sincronizando,
        sincronizar: sincronizarAhoraManual,
        sincronizarFuerte,
        hayPendientes: pendientes > 0,
      }}
    >
      {children}
    </ContextoDatos.Provider>
  )
}

/**
 * Permite usar el contexto de datos desde cualquier pantalla.
 * @returns {object}
 */
export function useDatos() {
  const valor = useContext(ContextoDatos)

  if (!valor) {
    throw new Error('useDatos debe usarse dentro de ProveedorDatos')
  }

  return valor
}
