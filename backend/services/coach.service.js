import { supabase, requireAuth } from '../config/supabase.js'

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Validar que es un Coach autenticado
  const authData = await requireAuth()
  if (!authData) return // Se redirigirá desde requireAuth

  const { session, profile } = authData
  if (profile.role !== 'coach') {
    alert('Acceso denegado. Solo para Coaches.')
    window.location.href = 'index.html'
    return
  }

  // 2. Lógica de Pestañas
  const tabs = document.querySelectorAll('.tab-btn')
  const panels = document.querySelectorAll('.tab-panel')
  
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'))
      panels.forEach(p => p.classList.remove('active'))
      
      tab.classList.add('active')
      document.getElementById(tab.dataset.tab).classList.add('active')
    })
  })

  // 3. Cerrar sesión
  document.getElementById('btn-logout').addEventListener('click', async () => {
    await supabase.auth.signOut()
    window.location.href = 'auth.html'
  })

  // 4. Cargar lista de pendientes
  const pendingList = document.getElementById('pending-list')
  
  async function loadPendingAlumnos() {
    pendingList.innerHTML = '<div class="empty-state">Cargando...</div>'
    
    // Por RLS de la BD, el coach solo puede ver a los de status = 'pendiente'
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('status', 'pendiente')

    if (error) {
      console.error(error)
      pendingList.innerHTML = `<div class="empty-state" style="color: #ef4444;">Error cargando solicitudes</div>`
      return
    }

    if (!data || data.length === 0) {
      pendingList.innerHTML = '<div class="empty-state">No hay solicitudes pendientes en el pool.</div>'
      return
    }

    pendingList.innerHTML = ''
    data.forEach(user => {
      const card = document.createElement('div')
      card.className = 'user-card'
      
      const date = new Date(user.created_at).toLocaleDateString('es-ES')
      
      card.innerHTML = `
        <div class="user-info">
          <h3>${user.full_name || 'Sin Nombre'}</h3>
          <p>📧 ${user.email}</p>
          <p>📅 Registrado el: ${date}</p>
        </div>
        <div class="user-actions">
          <button class="btn btn-primary btn-approve" data-id="${user.id}">✅ Aprobar y Asignar</button>
        </div>
      `
      pendingList.appendChild(card)
    })

    // Attach events to buttons
    document.querySelectorAll('.btn-approve').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const userId = e.target.dataset.id
        await approveAlumno(userId)
      })
    })
  }

  async function approveAlumno(targetUserId) {
    if (!confirm('¿Estás seguro de que quieres aprobar a este alumno y asignarlo a tu cuenta?')) return

    try {
      // Llamamos a la función segura en Postgres
      const { error } = await supabase.rpc('approve_alumno', {
        target_user_id: targetUserId
      })

      if (error) throw error

      alert('¡Alumno aprobado y asignado correctamente!')
      loadPendingAlumnos() // Recargar la lista
    } catch (error) {
      console.error(error)
      alert('Error al aprobar alumno: ' + error.message)
    }
  }

  // Inicializar cargando la data
  loadPendingAlumnos()
})
