// Cliente de Supabase para el frontend.
// La clave publishable está pensada para el navegador: lo que cada usuario
// puede leer o escribir lo controlan las políticas RLS de la base.
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://yqvrssewbltzxmlvynuw.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_7yOo8nZzdSu5izzN-KmnGw_cmwwWY-v';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
