import { supabase } from './supabase.js'

document.addEventListener('DOMContentLoaded', () => {
  const tabs = document.querySelectorAll('.auth-tab')
  const forms = document.querySelectorAll('.auth-form')
  const loginForm = document.getElementById('login-form')
  const registerForm = document.getElementById('register-form')
  const msgBox = document.getElementById('auth-message')

  // Tab switching
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'))
      forms.forEach(f => f.classList.remove('active'))
      
      tab.classList.add('active')
      document.getElementById(`${tab.dataset.target}-form`).classList.add('active')
      msgBox.style.display = 'none'
    })
  })

  function showMessage(msg, isError = false) {
    msgBox.textContent = msg
    msgBox.className = isError ? 'msg-error' : 'msg-success'
    msgBox.style.display = 'block'
  }

  // Handle Login
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault()
    const email = document.getElementById('login-email').value
    const password = document.getElementById('login-password').value

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      // Comprobar estado del perfil
      const { data: profile, error: profError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single()

      if (profError) throw profError

      if (profile.role === 'coach') {
        window.location.href = 'coach.html' // Redirige al dashboard del coach
        return
      }

      // Si es alumno, validar estado
      if (profile.status === 'pendiente') {
        await supabase.auth.signOut()
        showMessage('Tu cuenta aún está esperando la aprobación de un Coach.', true)
        return
      }

      if (profile.status === 'rechazado') {
        await supabase.auth.signOut()
        showMessage('Tu solicitud ha sido rechazada.', true)
        return
      }

      // Si está aprobado, ingresa a la app
      window.location.href = 'index.html'

    } catch (error) {
      showMessage(error.message === 'Invalid login credentials' ? 'Email o contraseña incorrectos' : error.message, true)
    }
  })

  // Handle Register
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault()
    const name = document.getElementById('reg-name').value
    const email = document.getElementById('reg-email').value
    const password = document.getElementById('reg-password').value

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
            role: 'alumno' // Por defecto, todos los registros son alumnos
          }
        }
      })

      if (error) throw error

      // Forzar el cierre de sesión porque al registrarse, Supabase los loguea automáticamente
      await supabase.auth.signOut()

      showMessage('Cuenta creada con éxito. Espera a que un Coach la apruebe para poder ingresar.')
      registerForm.reset()
      
      // Switch back to login tab visually
      setTimeout(() => {
        tabs[0].click()
      }, 3000)

    } catch (error) {
      showMessage(error.message, true)
    }
  })
})
