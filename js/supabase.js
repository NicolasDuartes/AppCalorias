import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);




// FUNCIONES DE AUTENTICACIÓN


// 1. Iniciar sesión
export async function login(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
}

// 2. Registrar usuario nuevo (capturando si es coach o alumno)
export async function registrar(email, password, isCoach) {
    const role = isCoach ? 'coach' : 'alumno';
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: { role: role } 
        }
    });
    if (error) throw error;
    return data;
}

// 3. Obtener el perfil completo del usuario actual
export async function getPerfilUsuario() {
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) return null;

    const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authData.user.id)
        .single();
        
    if (error) {
        console.error("Error obteniendo perfil:", error);
        return null;
    }
    return profile;
}

// 4. Cerrar sesión
export async function logout() {
    const { error } = await supabase.auth.signOut();
    if (error) console.error("Error al cerrar sesión:", error);
    window.location.href = '/'; // Redirige al index.html (Login)
}