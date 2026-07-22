// Kolors · configuración de conexión a Supabase
//
// Estos dos valores son PÚBLICOS por diseño (van en el navegador de cada
// persona). La seguridad real la dan: (1) el login por código, y (2) las
// políticas RLS de la base de datos (supabase/schema.sql). La clave secreta
// (sb_secret_...) NUNCA va aquí.
//
// Para obtenerlos: Supabase → Project Settings → API.

export const SUPABASE_URL = "https://gcnnalrjtpsysenpkoxk.supabase.co";
export const SUPABASE_ANON_KEY = "sb_publishable_cvKgh8_ZWrYGvnMO_yef3w_pZo_8w51";
