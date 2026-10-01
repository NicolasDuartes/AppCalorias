import { supabase } from '../../../backend/config/supabase.js';

const tabLogin = document.getElementById('tab-login');
const tabRegister = document.getElementById('tab-register');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const errorBox = document.getElementById('error-msg');
const successBox = document.getElementById('success-msg');

// Tab Switching
tabLogin.addEventListener('click', () => {
    tabLogin.className = 'flex-1 pb-3 text-sm font-bold text-[#1E293B] border-b-2 border-[#22C55E]';
    tabRegister.className = 'flex-1 pb-3 text-sm font-semibold text-[#94A3B8]';
    loginForm.classList.remove('hidden');
    registerForm.classList.add('hidden');
    errorBox.classList.add('hidden');
    successBox.classList.add('hidden');
});

tabRegister.addEventListener('click', () => {
    tabRegister.className = 'flex-1 pb-3 text-sm font-bold text-[#1E293B] border-b-2 border-[#22C55E]';
    tabLogin.className = 'flex-1 pb-3 text-sm font-semibold text-[#94A3B8]';
    registerForm.classList.remove('hidden');
    loginForm.classList.add('hidden');
    errorBox.classList.add('hidden');
    successBox.classList.add('hidden');
});

// Handle Login
document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const btn = document.getElementById('btn-submit');

    btn.innerText = "Verificando credenciales...";
    btn.classList.add('opacity-75');
    btn.disabled = true;
    errorBox.classList.add('hidden');
    successBox.classList.add('hidden');

    try {
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
        if (authError) throw authError;

        const { data: perfilData, error: perfilError } = await supabase
            .from('profiles')
            .select('role, status')
            .eq('id', authData.user.id)
            .single();

        if (perfilError) throw perfilError;

        if (perfilData.role === 'coach') {
            window.location.href = './pages/coach-dashboard.html';
        } else {
            if (perfilData.status === 'pendiente') {
                await supabase.auth.signOut();
                throw new Error('Tu cuenta aún está siendo revisada por el Coach.');
            }
            if (perfilData.status === 'rechazado') {
                await supabase.auth.signOut();
                throw new Error('Tu solicitud de cuenta ha sido rechazada.');
            }
            window.location.href = './pages/alumno.html';
        }

    } catch (error) {
        console.error("Error de acceso:", error);
        errorBox.innerText = error.message === 'Invalid login credentials' ? 'Credenciales incorrectas' : error.message;
        errorBox.classList.remove('hidden');
        btn.innerText = "Iniciar Sesión";
        btn.classList.remove('opacity-75');
        btn.disabled = false;
    }
});

// Handle Register
document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = document.getElementById('reg-name').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;
    const btn = document.getElementById('btn-submit-reg');

    btn.innerText = "Creando cuenta...";
    btn.classList.add('opacity-75');
    btn.disabled = true;
    errorBox.classList.add('hidden');
    successBox.classList.add('hidden');

    try {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: { data: { full_name: name, role: 'alumno' } }
        });

        if (error) throw error;

        await supabase.auth.signOut(); // Prevent auto-login

        successBox.innerText = "Cuenta creada. Espera a que un Coach la apruebe para poder ingresar.";
        successBox.classList.remove('hidden');
        registerForm.reset();
        
        setTimeout(() => {
            tabLogin.click();
        }, 3000);

    } catch (error) {
        errorBox.innerText = error.message;
        errorBox.classList.remove('hidden');
    } finally {
        btn.innerText = "Crear Cuenta";
        btn.classList.remove('opacity-75');
        btn.disabled = false;
    }
});
