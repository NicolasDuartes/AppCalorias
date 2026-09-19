import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const SUPABASE_URL = 'https://yqvrssewbltzxmlvynuw.supabase.co'
// Using the anon key found in the project / provided in progress
const SUPABASE_ANON_KEY = 'sb_publishable_7yOo8nZzdSu5izzN-KmnGw_cmwwWY-v'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

/**
 * Helper para verificar el estado de la sesión actual
 * Redirige a login si no hay sesión
 */
export async function requireAuth() {
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session) {
    window.location.href = 'auth.html'
    return null
  }

  // Get user profile to check status
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single()

  if (error || !profile) {
    console.error('Error fetching profile:', error)
    await supabase.auth.signOut()
    window.location.href = 'auth.html'
    return null
  }

  // Si es un coach, lo dejamos pasar
  if (profile.role === 'coach') {
    return { session, profile }
  }

  // Si es alumno, verificamos su estado
  if (profile.status === 'pendiente') {
    alert('Tu cuenta ha sido creada y está esperando aprobación de un Coach.')
    await supabase.auth.signOut()
    window.location.href = 'auth.html'
    return null
  }

  if (profile.status === 'rechazado') {
    alert('Tu solicitud ha sido rechazada.')
    await supabase.auth.signOut()
    window.location.href = 'auth.html'
    return null
  }

  return { session, profile }
}
