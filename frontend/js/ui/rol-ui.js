/* ==========================================================
   rol-ui.js — adapta las pantallas de pages/shared/ al rol de quien las abre.
   El HTML queda armado para el coach; si el rol es alumno se cambian:
   - [data-href-alumno]   → nuevo href (ej. el botón volver)
   - [data-texto-alumno]  → nuevo texto (ej. el subtítulo)
   - <template id="nav-alumno"> → reemplaza la barra inferior del coach
   Script clásico (no módulo) para que funcione abriendo el HTML desde el disco.
   ========================================================== */

// Única fuente del rol. Por ahora sale de la URL (#rol=alumno);
// al conectar Supabase se lee del perfil del usuario logueado (campo `role`).
// Solo decide qué navegación mostrar: los permisos se controlan con RLS.
function obtenerRol() {
  // Va en el fragmento (#) y no en ?rol=: servidores con URLs limpias como `serve`
  // redirigen contexto.html → contexto y descartan la query, el fragmento se conserva.
  const rol = new URLSearchParams(window.location.hash.slice(1)).get('rol');
  return rol === 'alumno' ? 'alumno' : 'coach';
}

function aplicarRol(rol) {
  if (rol !== 'alumno') return;

  document.querySelectorAll('[data-href-alumno]').forEach((el) => {
    el.setAttribute('href', el.dataset.hrefAlumno);
  });

  document.querySelectorAll('[data-texto-alumno]').forEach((el) => {
    el.textContent = el.dataset.textoAlumno;
  });

  const plantilla = document.getElementById('nav-alumno');
  const navCoach = document.querySelector('.barra-inferior');
  if (plantilla && navCoach) navCoach.replaceWith(plantilla.content.cloneNode(true));

  document.title = document.title.replace('· Coach', '· Alumno');
}

aplicarRol(obtenerRol());
