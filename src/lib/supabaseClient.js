/*
 * (supabaseClient.js)
 * Cliente de Supabase para la app de usuarios.
 *
 * Solo se usa para el login, el registro y la recuperación de la
 * contraseña. Los datos de licencia, inventario y ventas se le piden
 * al backend Flask.
 */

import { createClient } from '@supabase/supabase-js'

// Se leen la URL y la llave pública desde las variables NEXT_PUBLIC_*.
// En Next.js estas variables se incrustan en el bundle al compilar.
const URL_SUPABASE = process.env.NEXT_PUBLIC_SUPABASE_URL
const LLAVE_PUBLICA = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

// Se revisa que las dos variables existan, para no fallar raro al arrancar
if (!URL_SUPABASE || !LLAVE_PUBLICA) {
  console.error(
    'Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. ' +
      'Revisa el archivo .env.local y vuelve a compilar la app.',
  )
}

// Se crea el cliente de Supabase y se guarda en una constante
const supabase = createClient(URL_SUPABASE, LLAVE_PUBLICA, {
  auth: {
    // Se guarda la sesión en el localStorage para no perder el acceso al recargar
    persistSession: true,
    autoRefreshToken: true,
    // Se detecta la sesión en la URL para que funcione el enlace de
    // recuperación de contraseña que manda Supabase por correo
    detectSessionInUrl: true,
  },
})

export default supabase
