        import { supabase } from '../../../backend/config/supabase.js';
        import { calculateTDEE, calculateTargetMacros } from '../utils/calculator.js';

        // Variables globales
        let perfilesGlobal = [];
        let misAlumnosGlobal = [];
        let coachId = null;

        // 0. AUTH GUARD: Verificar que es un coach autenticado
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            window.location.href = '../index.html';
        } else {
            coachId = session.user.id;
            const nombre = session.user.user_metadata?.full_name || 'Coach';
            document.getElementById('coach-greeting').innerText = `Hola, ${nombre.split(' ')[0]}`;
        }

        // Logout
        document.getElementById('btn-logout').addEventListener('click', async () => {
            await supabase.auth.signOut();
            window.location.href = '../index.html';
        });

        // 1. INICIALIZACIÓN: Cargar datos al entrar a la página
        async function cargarDatosInciales() {
            try {
                // A. Traer perfiles (Alumnos APROBADOS de ESTE coach)
                const { data: perfiles, error: errPerfiles } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('role', 'alumno')
                    .eq('status', 'aprobado')
                    .eq('coach_id', coachId);
                
                if (errPerfiles) throw errPerfiles;
                perfilesGlobal = perfiles || [];
                misAlumnosGlobal = perfiles || [];

                // Renderizar la lista en el HTML
                renderizarListaAlumnos();
                renderizarMisAlumnos();

                // A.2 Traer perfiles (Alumnos PENDIENTES)
                const { data: pendientes, error: errPendientes } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('role', 'alumno')
                    .eq('status', 'pendiente');
                
                if (errPendientes) throw errPendientes;
                renderizarListaPendientes(pendientes || []);

                // Opciones fijas para el contexto
                // (Se removió la llamada a tabla 'enums' porque ahora hay botones fijos)

            } catch (error) {
                console.error("Error al cargar base de datos:", error);
                document.getElementById('contenedor-alumnos').innerHTML = `<div class="text-center text-red-500 mt-10 text-xs font-bold">Error de conexión.</div>`;
            }
        }

        // 2. FUNCIÓN PARA DIBUJAR LA LISTA
        function renderizarListaAlumnos() {
            const contenedor = document.getElementById('contenedor-alumnos');
            
            if (perfilesGlobal.length === 0) {
                contenedor.innerHTML = '<div class="text-center text-[#64748B] mt-10 text-xs font-medium">No hay alumnos registrados.</div>';
                return;
            }

            // Construir el HTML concatenando texto
            let htmlHTML = '';
            perfilesGlobal.forEach(perfil => {
                // NOTA: Si Juan usó "name" en vez de "nombre" en Supabase, cambia "perfil.nombre" a "perfil.name"
                const nombreUsuario = perfil.nombre || perfil.name || 'Sin Nombre';
                const iniciales = nombreUsuario.substring(0, 2).toUpperCase();
                
                htmlHTML += `
                    <article class="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex flex-col gap-3">
                        <div class="flex items-start justify-between">
                            <div class="flex items-center gap-3">
                                <div class="w-10 h-10 rounded-full bg-[#DCFCE7] flex items-center justify-center text-[#15803D] font-bold text-sm border border-[#BBF7D0]">
                                    ${iniciales}
                                </div>
                                <div>
                                    <h3 class="font-bold text-[#1E293B] text-sm capitalize">${nombreUsuario}</h3>
                                    <p class="text-[10px] text-[#64748B] font-medium">${perfil.email}</p>
                                </div>
                            </div>
                        </div>
                        <div class="grid grid-cols-1 gap-2 mt-1">
                            <button onclick="window.abrirFormularioMetricas('${perfil.id}')"
                                class="py-2.5 rounded-xl bg-[#22C55E] text-[#0E141A] font-extrabold text-[11px] shadow-sm active:scale-95 transition-transform">
                                Cargar Métricas y Contexto
                            </button>
                        </div>
                    </article>
                `;
            });
            contenedor.innerHTML = htmlHTML;
        }

        // 2.B FUNCIÓN PARA DIBUJAR PENDIENTES
        function renderizarListaPendientes(pendientes) {
            const seccion = document.getElementById('seccion-pendientes');
            const contenedor = document.getElementById('contenedor-pendientes');
            
            if (pendientes.length === 0) {
                seccion.classList.add('hidden');
                contenedor.classList.add('hidden');
                return;
            }

            seccion.classList.remove('hidden');
            contenedor.classList.remove('hidden');

            let htmlHTML = '';
            pendientes.forEach(perfil => {
                const nombreUsuario = perfil.nombre || perfil.name || 'Sin Nombre';
                const iniciales = nombreUsuario.substring(0, 2).toUpperCase();
                
                htmlHTML += `
                    <article class="bg-yellow-50 rounded-2xl p-4 border border-yellow-200 shadow-sm flex flex-col gap-3">
                        <div class="flex items-start justify-between">
                            <div class="flex items-center gap-3">
                                <div class="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-700 font-bold text-sm border border-yellow-300">
                                    ${iniciales}
                                </div>
                                <div>
                                    <h3 class="font-bold text-[#1E293B] text-sm capitalize">${nombreUsuario}</h3>
                                    <p class="text-[10px] text-[#64748B] font-medium">${perfil.email}</p>
                                </div>
                            </div>
                        </div>
                        <div class="grid grid-cols-1 gap-2 mt-1">
                            <button onclick="window.aprobarAlumno('${perfil.id}')"
                                class="py-2.5 rounded-xl bg-yellow-400 text-[#0E141A] font-extrabold text-[11px] shadow-sm active:scale-95 transition-transform">
                                Aprobar Alumno
                            </button>
                        </div>
                    </article>
                `;
            });
            contenedor.innerHTML = htmlHTML;
        }

        window.aprobarAlumno = async function(perfilId) {
            const btn = event.currentTarget;
            const textOriginal = btn.innerText;
            btn.innerText = "Aprobando...";
            btn.disabled = true;

            try {
                const { error } = await supabase.rpc('approve_alumno', {
                    alumno_id: perfilId
                });

                if (error) throw error;
                
                // Recargar todo
                await cargarDatosInciales();
            } catch (error) {
                console.error(error);
                alert("Error al aprobar: " + error.message);
                btn.innerText = textOriginal;
                btn.disabled = false;
            }
        };

        // 2.C FUNCIÓN PARA DIBUJAR MIS ALUMNOS (pestaña Alumnos)
        function renderizarMisAlumnos() {
            const contenedor = document.getElementById('contenedor-mis-alumnos');
            const badge = document.getElementById('badge-count');
            
            badge.innerText = misAlumnosGlobal.length;

            if (misAlumnosGlobal.length === 0) {
                contenedor.innerHTML = '<div class="text-center text-[#64748B] mt-10 text-xs font-medium">Aún no tienes alumnos aprobados.</div>';
                return;
            }

            let htmlHTML = '';
            misAlumnosGlobal.forEach(perfil => {
                const nombreUsuario = perfil.nombre || perfil.name || perfil.full_name || 'Sin Nombre';
                const iniciales = nombreUsuario.substring(0, 2).toUpperCase();
                
                htmlHTML += `
                    <article class="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex flex-col gap-3">
                        <div class="flex items-start justify-between">
                            <div class="flex items-center gap-3">
                                <div class="w-10 h-10 rounded-full bg-[#DCFCE7] flex items-center justify-center text-[#15803D] font-bold text-sm border border-[#BBF7D0]">
                                    ${iniciales}
                                </div>
                                <div>
                                    <h3 class="font-bold text-[#1E293B] text-sm capitalize">${nombreUsuario}</h3>
                                    <p class="text-[10px] text-[#64748B] font-medium">${perfil.email}</p>
                                </div>
                            </div>
                            <span class="px-2 py-0.5 rounded-full bg-[#DCFCE7] text-[#15803D] text-[10px] font-bold border border-[#BBF7D0]">Activo</span>
                        </div>
                        <div class="grid grid-cols-1 gap-2 mt-1">
                            <button onclick="window.abrirFormularioMetricas('${perfil.id}')"
                                class="py-2.5 rounded-xl bg-[#22C55E] text-[#0E141A] font-extrabold text-[11px] shadow-sm active:scale-95 transition-transform">
                                Cargar Métricas y Contexto
                            </button>
                        </div>
                    </article>
                `;
            });
            contenedor.innerHTML = htmlHTML;
        }

        // NAVEGACIÓN INFERIOR: Cambiar entre Panel y Alumnos
        window.cambiarVista = function(vista) {
            const vistaLista = document.getElementById('vista-lista');
            const vistaAlumnos = document.getElementById('vista-alumnos');
            const vistaPlantillas = document.getElementById('vista-plantillas');
            const vistaMetricas = document.getElementById('vista-metricas');
            
            const navPanel = document.getElementById('nav-panel');
            const navAlumnos = document.getElementById('nav-alumnos');
            const navPlantillas = document.getElementById('nav-plantillas');

            // Reset navigation icons
            const resetNav = (nav) => {
                nav.className = 'flex flex-col items-center justify-center flex-1 text-[#94A3B8] hover:text-white transition-colors gap-0.5';
                nav.querySelector('span:last-child').className = 'text-[10px] font-medium';
            };
            const activeNav = (nav) => {
                nav.className = 'flex flex-col items-center justify-center flex-1 text-[#22C55E] gap-0.5';
                nav.querySelector('span:last-child').className = 'text-[10px] font-bold';
            };

            resetNav(navPanel);
            resetNav(navAlumnos);
            resetNav(navPlantillas);

            // Hide all views
            vistaLista.classList.add('hidden');
            vistaAlumnos.classList.add('hidden');
            vistaPlantillas.classList.add('hidden');
            vistaMetricas.classList.add('hidden');

            if (vista === 'panel') {
                vistaLista.classList.remove('hidden');
                activeNav(navPanel);
            } else if (vista === 'alumnos') {
                vistaAlumnos.classList.remove('hidden');
                activeNav(navAlumnos);
            } else if (vista === 'plantillas') {
                vistaPlantillas.classList.remove('hidden');
                activeNav(navPlantillas);
            }
        };

        // 3. CAMBIAR A VISTA DE FORMULARIO
        window.abrirFormularioMetricas = function(perfilId) {
            const perfil = perfilesGlobal.find(p => p.id === perfilId);
            const nombreUsuario = perfil.nombre || perfil.name || perfil.full_name || 'Alumno';
            const edadUsuario = perfil.edad || perfil.age || '';
            const sexoUsuario = perfil.sexo || perfil.sex || 'Hombre';
            
            // Llenar etiquetas del título
            document.getElementById('titulo-alumno').innerText = `Métricas para ${nombreUsuario}`;
            document.getElementById('subtitulo-alumno').innerText = `Email: ${perfil.email}`;
            
            // Guardar el ID en el input oculto
            document.getElementById('input-perfil-id').value = perfil.id;
            
            // Pre-llenar edad y sexo si existen
            document.getElementById('input-edad').value = edadUsuario;
            document.getElementById('input-sexo').value = sexoUsuario;

            // Ocultar lista, mostrar métricas
            document.getElementById('vista-lista').classList.add('hidden');
            document.getElementById('vista-metricas').classList.remove('hidden');
        };

        // 4. VOLVER A VISTA DE LISTA
        window.volverALista = function() {
            document.getElementById('vista-metricas').classList.add('hidden');
            document.getElementById('vista-lista').classList.remove('hidden');
            document.getElementById('form-metricas').reset(); // Limpiar inputs
            
            // Limpiar botones contexto
            document.querySelectorAll('.btn-contexto').forEach(b => {
                b.classList.remove('bg-[#22C55E]', 'text-white', 'border-[#22C55E]');
                b.classList.add('text-gray-600', 'border-gray-200');
            });
            document.getElementById('input-contexto').value = '';
        };

        // EVENTOS BOTONES CONTEXTO
        document.querySelectorAll('.btn-contexto').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.btn-contexto').forEach(b => {
                    b.classList.remove('bg-[#22C55E]', 'text-white', 'border-[#22C55E]');
                    b.classList.add('text-gray-600', 'border-gray-200');
                });
                const target = e.currentTarget;
                target.classList.remove('text-gray-600', 'border-gray-200');
                target.classList.add('bg-[#22C55E]', 'text-white', 'border-[#22C55E]');
                document.getElementById('input-contexto').value = target.dataset.value;
            });
        });

        // 5. GUARDAR DATOS DEL FORMULARIO EN LA TABLA MEAL_PLANS
        document.getElementById('form-metricas').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Verificar sesión actual (para evitar errores si cambió en otra pestaña)
            const { data: { session: currentSession } } = await supabase.auth.getSession();
            if (!currentSession || currentSession.user.id !== coachId) {
                alert("Tu sesión expiró o cambiaste de usuario en otra pestaña. Por favor, recarga la página o vuelve a iniciar sesión como Coach.");
                return;
            }

            // Extraer y parsear valores del DOM
            const alumnoId = document.getElementById('input-perfil-id').value;
            const edad = parseInt(document.getElementById('input-edad').value);
            const sexo = document.getElementById('input-sexo').value;
            const peso = parseFloat(document.getElementById('input-peso').value);
            const altura = parseInt(document.getElementById('input-altura').value);
            const pasos = parseInt(document.getElementById('input-pasos').value);
            const met = parseFloat(document.getElementById('input-met').value);
            const horas = parseFloat(document.getElementById('input-horas').value);
            const entrenos = parseInt(document.getElementById('input-entrenos').value);
            const contextoVal = document.getElementById('input-contexto').value;

            // Mapear contexto a porcentaje
            // 1: Déficit (-20%), 2: Mantenimiento (0%), 3: Superávit (+15%)
            let modifier = 0;
            if (contextoVal === "1") modifier = -20;
            if (contextoVal === "2") modifier = 0;
            if (contextoVal === "3") modifier = 15;

            // Calcular calorías y macros
            const tdee = calculateTDEE(sexo, peso, altura, edad, pasos, met, horas, entrenos);
            const targetKcal = Math.round(tdee * (1 + modifier / 100));
            // Distribución típica: 30% Proteína, 40% Carbos, 30% Grasas
            const macros = calculateTargetMacros(targetKcal, { protein: 30, fat: 30, carbs: 40 });

            const payload = {
                alumno_id: alumnoId,
                coach_id: coachId,
                name: 'Plan Nutricional Automático',
                target_calories: targetKcal,
                target_protein_g: Math.round(macros.protein.grams),
                target_carbs_g: Math.round(macros.carbs.grams),
                target_fat_g: Math.round(macros.fat.grams),
                notes: JSON.stringify({ peso, altura, edad, sexo, pasos, met, horas, entrenos, contexto: contextoVal }),
                active: true
            };

            const btnText = e.submitter.innerText;
            e.submitter.innerText = "Guardando...";

            try {
                // Primero desactivar planes anteriores
                await supabase.from('meal_plans')
                    .update({ active: false })
                    .eq('alumno_id', payload.alumno_id);

                // Insertar el nuevo plan
                const { error } = await supabase.from('meal_plans').insert([payload]);
                if (error) throw error;
                
                alert("¡Métricas y Macros calculados y guardados correctamente!");
                window.volverALista();
            } catch (error) {
                console.error("Error al insertar:", error);
                alert("Error al guardar: " + error.message);
            } finally {
                e.submitter.innerText = btnText;
            }
        });

        // Ejecutar la carga al iniciar
        cargarDatosInciales();
