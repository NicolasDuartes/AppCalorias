import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { supabase } from './supabase.js';

function CoachDashboard() {
  const [alumnos, setAlumnos] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Maneja la vista actual: 'lista' o 'asignar_dieta'
  const [vista, setVista] = useState('lista'); 
  const [alumnoActivo, setAlumnoActivo] = useState(null);

  const [portions, setPortions] = useState({
    HC: 0, F: 0, D: 0, P: 0, PG: 0, M: 0, L: 0, G: 0
  });

  // 1. Cargar Alumnos desde Supabase al iniciar
  useEffect(() => {
    async function cargarAlumnos() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return; // Aquí podrías redirigir al login si no hay usuario

      const { data, error } = await supabase
        .from('profiles')
        .select('id, auth.users(email)')
        .eq('role', 'alumno')
        .eq('coach_id', user.id);

      if (data) setAlumnos(data);
      setLoading(false);
    }
    cargarAlumnos();
  }, []);

  // 2. Función para abrir el formulario de un alumno
  const abrirFormularioDieta = (alumno) => {
    setAlumnoActivo(alumno);
    setVista('asignar_dieta');
    // Reiniciamos los inputs
    setPortions({ HC: 0, F: 0, D: 0, P: 0, PG: 0, M: 0, L: 0, G: 0 });
  };

  // 3. Función para guardar la dieta en Supabase
  const guardarDieta = async (e) => {
    e.preventDefault();
    
    // Convertimos el objeto portions en las filas que requiere Supabase
    const filas = Object.keys(portions).map(cat => ({
      user_id: alumnoActivo.id,
      category_code: cat,
      portions: portions[cat],
      updated_at: new Date()
    }));

    const { error } = await supabase
      .from('portions_scheme')
      .upsert(filas, { onConflict: 'user_id, category_code' });

    if (error) {
      alert("Error al guardar: " + error.message);
    } else {
      alert("¡Dieta asignada correctamente!");
      setVista('lista'); // Volvemos a la lista de alumnos
    }
  };
  // HOLAAAAAA
  // ==========================================
  // RENDER: PANTALLA DE CARGA
  // ==========================================
  if (loading) return <div className="text-center text-gray-500 mt-10 font-bold">Cargando alumnos...</div>;

  // ==========================================
  // RENDER: FORMULARIO ASIGNAR DIETA
  // ==========================================
  if (vista === 'asignar_dieta') {
    return (
      <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-[#1E293B]">Dieta para {alumnoActivo.id.substring(0,6)}</h3>
          <button 
            onClick={() => setVista('lista')}
            className="text-red-500 text-xs font-bold bg-red-50 px-2 py-1 rounded"
          >
            Cancelar
          </button>
        </div>

        <form onSubmit={guardarDieta} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {Object.keys(portions).map((cat) => (
              <div key={cat} className="flex flex-col">
                <label className="text-[11px] font-bold text-gray-500 mb-1">Categoría {cat}</label>
                <input 
                  type="number" step="0.5" min="0" required
                  className="bg-gray-50 border border-gray-200 rounded-lg p-2 text-sm font-bold text-gray-800 focus:outline-none focus:border-green-500"
                  value={portions[cat]}
                  onChange={(e) => setPortions({...portions, [cat]: parseFloat(e.target.value) || 0})}
                />
              </div>
            ))}
          </div>
          
          <button type="submit" className="w-full mt-4 py-3 rounded-xl bg-[#22C55E] text-[#0E141A] font-bold text-sm shadow-sm active:scale-95 transition-transform">
            Guardar Dieta
          </button>
        </form>
      </div>
    );
  }


  if (alumnos.length === 0) {
    return <div className="text-center text-gray-500 mt-10">No tienes alumnos asignados aún.</div>;
  }

  return (
    <>
      {alumnos.map((alumno) => (
        <article key={alumno.id} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex flex-col gap-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#DCFCE7] flex items-center justify-center text-[#15803D] font-bold text-sm border border-[#BBF7D0]">
                AL
              </div>
              <div>
                <h3 className="font-bold text-[#1E293B] text-sm">Alumno {alumno.id.substring(0,4)}</h3>
                <p className="text-[10px] text-[#64748B] font-medium">Click para asignar plan</p>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 gap-2 mt-1">
            <button 
              onClick={() => abrirFormularioDieta(alumno)}
              className="py-2 rounded-xl bg-[#22C55E] text-[#0E141A] font-bold text-[11px] shadow-sm active:scale-95 transition-transform"
            >
              Asignar Dieta
            </button>
          </div>
        </article>
      ))}
    </>
  );
}

// Inyectamos la App en el HTML
const rootElement = document.getElementById('root');
if (rootElement) {
  const root = createRoot(rootElement);
  root.render(<CoachDashboard />);
}