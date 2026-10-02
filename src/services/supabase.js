/*
 * (supabase.js)
 * Cliente de Supabase para la app de usuarios.
 *
 * Solo se usa para el login y el cierre de sesión. Los datos de
 * licencia e inventario se le piden al backend Flask.
 */

import { createClient } from '@supabase/supabase-js'

// Se leen la URL y la llave pública del archivo .env
const URL_SUPABASE = import.meta.env.VITE_SUPABASE_URL
const LLAVE_PUBLICA = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

// Se revisa que las dos variables existan, para no fallar raro al arrancar
if (!URL_SUPABASE || !LLAVE_PUBLICA) {
  console.error(
    'Faltan VITE_SUPABASE_URL o VITE_SUPABASE_PUBLISHABLE_KEY en el archivo .env',
  )
}

// Se crea el cliente de Supabase y se guarda en una constante
const supabase = createClient(URL_SUPABASE, LLAVE_PUBLICA, {
  auth: {
    // Se guarda la sesión en el localStorage para no perder el acceso al recargar
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
})

export default supabase
