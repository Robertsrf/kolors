// Kolors · configuración de conexión a Supabase
//
// Cómo obtener estos dos valores:
// 1. Entra a https://supabase.com y crea un proyecto (gratis).
// 2. En el panel del proyecto: Project Settings → API.
// 3. Copia "Project URL" en SUPABASE_URL.
// 4. Copia la clave "anon public" en SUPABASE_ANON_KEY.
//
// La anon key es segura de dejar en el código del frontend: Supabase está
// diseñado para eso. La seguridad real la dan las políticas RLS definidas en
// supabase/schema.sql (sólo usuarios que iniciaron sesión pueden leer/escribir).

export const SUPABASE_URL = "https://TU-PROYECTO.supabase.co";
export const SUPABASE_ANON_KEY = "TU-ANON-KEY-AQUI";
