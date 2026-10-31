#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
test_modularization.py — Suite de pruebas de modularización de arquitectura frontend
Verifica:
1. Cada archivo HTML en frontend/pages/ importa al menos UN módulo JS (<script type="module" src="...">).
2. Cada módulo en frontend/js/ui/ exporta un mapa SELECTORES.
3. Cada selector en SELECTORES existe en el HTML correspondiente.
4. No hay funciones huérfanas en navegacion.js que pertenezcan a una página específica.
5. Cada import en los módulos JS resuelve a un archivo existente.
6. No hay imports circulares entre módulos JS.
"""

import os
import sys
import glob
import re
from urllib.parse import urlparse
from bs4 import BeautifulSoup

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FRONTEND_DIR = os.path.join(BASE_DIR, 'frontend')
PAGES_DIR = os.path.join(FRONTEND_DIR, 'pages')
JS_DIR = os.path.join(FRONTEND_DIR, 'js')
UI_DIR = os.path.join(JS_DIR, 'ui')
UTILS_DIR = os.path.join(JS_DIR, 'utils')
NAVEGACION_JS = os.path.join(UTILS_DIR, 'navegacion.js')

# Mapeo de respaldo si un módulo no está directamente en un <script> de la página
PAGE_MAP_FALLBACK = {
    'dashboard-ui.js': ['pages/alumno/dashboard.html'],
    'reemplazar-ui.js': ['pages/alumno/reemplazar.html'],
    'agregar-ui.js': ['pages/alumno/agregar.html'],
    'cantidad-ui.js': ['pages/alumno/cantidad.html'],
    'plan-ui.js': ['pages/alumno/plan.html'],
    'historial-alumno-ui.js': ['pages/alumno/historial.html'],
    'plan-activo-ui.js': ['pages/coach/plan-activo.html'],
    'plan-archivado-ui.js': ['pages/coach/plan-archivado.html'],
    'plan-editor-ui.js': ['pages/coach/plan-editor.html', 'pages/coach/plan-editor-vacio.html'],
    'plan-nuevo-ui.js': ['pages/coach/plan-nuevo.html'],
    'historial-ui.js': ['pages/coach/historial.html', 'pages/coach/historial-vacio.html'],
    'buscar-alimento-ui.js': ['pages/coach/buscar-alimento.html'],
    'cliente-ui.js': ['pages/coach/cliente.html'],
    'clientes-ui.js': ['pages/coach/clientes.html'],
    'perfil-coach-ui.js': ['pages/coach/perfil.html'],
    'perfil-ui.js': ['pages/alumno/perfil.html'],
    'alimento-form-ui.js': ['pages/alumno/crear-alimento.html', 'pages/alumno/editar-alimento.html'],
    'login-ui.js': ['index.html'],
    'cuenta-ui.js': ['registro.html'],
    'objetivo-ui.js': ['pages/alumno/perfil.html'],
    'rol-ui.js': ['pages/shared/contexto.html'],
    'contexto-ui.js': ['pages/shared/contexto.html'],
    'onboarding-ui.js': ['pages/alumno/onboarding.html'],
    'progreso-ui.js': ['pages/alumno/progreso.html'],
    'alimentos-revision-ui.js': ['pages/coach/alimentos-revision.html'],
    'plantillas-ui.js': ['pages/coach/plantillas.html'],
    'seguimiento-coach-ui.js': ['pages/coach/seguimiento.html'],
    'crear-plato-ui.js': ['pages/alumno/crear-plato.html']
}


def test_1_html_module_scripts():
    print("\n[TEST 1] Verificando que cada HTML en frontend/pages/ importe al menos un módulo JS...")
    errors = []
    html_files = sorted(glob.glob(os.path.join(PAGES_DIR, '**', '*.html'), recursive=True))

    if not html_files:
        errors.append(f"No se encontraron archivos HTML en {PAGES_DIR}")
        return errors

    for html_path in html_files:
        rel_path = os.path.relpath(html_path, FRONTEND_DIR).replace('\\', '/')
        with open(html_path, 'r', encoding='utf-8') as f:
            content = f.read()

        soup = BeautifulSoup(content, 'html.parser')
        module_scripts = [
            s.get('src') for s in soup.find_all('script')
            if s.get('type') == 'module' and s.get('src')
        ]

        if not module_scripts:
            errors.append(f"{rel_path}: no importa ningún módulo JS (<script type=\"module\" src=\"...\">)")

    if not errors:
        print(f"  -> OK: Los {len(html_files)} archivos HTML en frontend/pages/ importan al menos un módulo JS.")
    return errors


def parse_selectores_map(content):
    """
    Extrae los pares clave-selector del mapa SELECTORES exportado en el código JS.
    """
    match = re.search(r'export\s+(?:const|let|var)\s+SELECTORES\s*=\s*\{([^;]+?)\n\};', content, re.DOTALL)
    if not match:
        # Intenta sin salto de línea estricto
        match = re.search(r'export\s+(?:const|let|var)\s+SELECTORES\s*=\s*\{(.+?)\};', content, re.DOTALL)
    if not match:
        return None

    body = match.group(1)
    # Extrae clave: 'selector' o clave: "selector" o clave: `selector` soportando comillas anidadas
    pairs = {}
    pattern = re.compile(r"""(?:['"]?([a-zA-Z0-9_-]+)['"]?)\s*:\s*(?:'([^']*)'|"([^"]*)"|`([^`]*)`)""")
    for m in pattern.finditer(body):
        k = m.group(1)
        v = m.group(2) if m.group(2) is not None else (m.group(3) if m.group(3) is not None else m.group(4))
        pairs[k] = v
    return pairs


def test_2_ui_modules_export_selectores():
    print("\n[TEST 2] Verificando que cada módulo en frontend/js/ui/ exporte un mapa SELECTORES...")
    errors = []
    skipped = []

    if not os.path.exists(UI_DIR):
        skipped.append(f"[SKIP] Directorio {UI_DIR} no existe todavía")
        return errors, skipped

    ui_files = sorted(glob.glob(os.path.join(UI_DIR, '*.js')))
    if not ui_files:
        skipped.append("[SKIP] No hay archivos en frontend/js/ui/ todavía")
        return errors, skipped

    valid_modules = 0
    for js_path in ui_files:
        mod_name = os.path.basename(js_path)
        with open(js_path, 'r', encoding='utf-8') as f:
            content = f.read()

        selectores = parse_selectores_map(content)
        if selectores is None:
            # Si el módulo no exporta SELECTORES
            # Comprobamos si tiene export de SELECTORES con otra sintaxis
            if 'export const SELECTORES' not in content and 'export let SELECTORES' not in content and 'export { SELECTORES' not in content:
                errors.append(f"{mod_name}: no exporta mapa SELECTORES")
            else:
                valid_modules += 1
        else:
            if len(selectores) == 0:
                errors.append(f"{mod_name}: SELECTORES está vacío")
            else:
                valid_modules += 1

    if not errors:
        print(f"  -> OK: Los {valid_modules} módulos UI verificados exportan su mapa SELECTORES.")
    return errors, skipped


def test_3_selectores_exist_in_html():
    print("\n[TEST 3] Verificando que cada selector en SELECTORES exista en el HTML correspondiente...")
    errors = []
    skipped = []

    if not os.path.exists(UI_DIR):
        skipped.append(f"[SKIP] Directorio {UI_DIR} no existe")
        return errors, skipped

    ui_files = sorted(glob.glob(os.path.join(UI_DIR, '*.js')))

    # Construir índice de páginas HTML que importan cada script
    html_files = sorted(glob.glob(os.path.join(FRONTEND_DIR, '**', '*.html'), recursive=True))
    imported_by = {}
    for h_path in html_files:
        rel_h = os.path.relpath(h_path, FRONTEND_DIR).replace('\\', '/')
        with open(h_path, 'r', encoding='utf-8') as f:
            soup = BeautifulSoup(f.read(), 'html.parser')
        for s in soup.find_all('script'):
            src = s.get('src')
            if src:
                base_src = os.path.basename(src)
                if base_src not in imported_by:
                    imported_by[base_src] = []
                imported_by[base_src].append(rel_h)

    for js_path in ui_files:
        mod_name = os.path.basename(js_path)
        with open(js_path, 'r', encoding='utf-8') as f:
            content = f.read()

        selectores = parse_selectores_map(content)
        if not selectores:
            continue

        # Determinar páginas correspondientes
        target_htmls = imported_by.get(mod_name, [])
        if not target_htmls and mod_name in PAGE_MAP_FALLBACK:
            target_htmls = PAGE_MAP_FALLBACK[mod_name]

        if not target_htmls:
            # Si no hay HTML asociado a este módulo UI todavía
            continue

        # Cargar los soups de las páginas destino
        soups = []
        for rel_h in target_htmls:
            full_h = os.path.join(FRONTEND_DIR, rel_h.replace('/', os.sep))
            if os.path.exists(full_h):
                with open(full_h, 'r', encoding='utf-8') as f:
                    # Incluimos templates también extrayendo su contenido si existe
                    h_text = f.read()
                    soups.append((rel_h, BeautifulSoup(h_text, 'html.parser')))

        if not soups:
            continue

        for key, sel_str in selectores.items():
            # Un selector puede ser una lista separada por comas (ej. '.pantalla > .pie, .pie')
            # Si cualquiera de las alternativas existe en alguna de las páginas, es válido
            candidates = [c.strip() for c in sel_str.split(',') if c.strip()]
            found = False

            for cand in candidates:
                for rel_h, soup in soups:
                    try:
                        matches = soup.select(cand)
                        if matches:
                            found = True
                            break
                    except Exception:
                        # Fallback a búsqueda por ID o clase simple si el selector CSS contiene pseudo-clases avanzadas
                        id_m = re.match(r'^#([a-zA-Z0-9_-]+)$', cand)
                        cls_m = re.match(r'^\.([a-zA-Z0-9_-]+)$', cand)
                        if id_m and soup.find(id=id_m.group(1)):
                            found = True
                            break
                        if cls_m and soup.find(class_=cls_m.group(1)):
                            found = True
                            break
                if found:
                    break

            if not found:
                # Caso especial: aviso-flotante o elementos dinámicos que se inyectan en runtime
                if 'aviso-flotante' in sel_str or 'opcion' in key.lower() or 'dinamico' in key.lower():
                    continue
                pages_str = ', '.join([s[0] for s in soups])
                errors.append(f"{mod_name} [{key}='{sel_str}']: no coincide en [{pages_str}]")

    if not errors:
        print("  -> OK: Todos los selectores definidos existen en los HTML correspondientes.")
    return errors, skipped


def test_4_no_orphan_functions_in_navegacion():
    print("\n[TEST 4] Verificando que no haya funciones huérfanas en navegacion.js pertenecientes a páginas específicas...")
    errors = []

    if not os.path.exists(NAVEGACION_JS):
        errors.append(f"No existe {NAVEGACION_JS}")
        return errors

    with open(NAVEGACION_JS, 'r', encoding='utf-8') as f:
        content = f.read()

    # Lista de funciones y datos específicos de páginas que deben haber sido modularizados a sus UI modules
    page_specific_symbols = [
        ('adaptarCantidadContextual', 'cantidad.html / cantidad-ui.js'),
        ('recalcularAportes', 'cantidad.html / cantidad-ui.js'),
        ('actualizarResumenPieAgregar', 'agregar.html / agregar-ui.js'),
        ('adaptarAgregarContextual', 'agregar.html / agregar-ui.js'),
        ('iniciarReemplazarUI', 'reemplazar.html / reemplazar-ui.js'),
        ('iniciarDashboardUI', 'dashboard.html / dashboard-ui.js'),
        ('ALIMENTOS_PLAN_DEFECTO', 'plan-defecto.js')
    ]

    for sym, destino in page_specific_symbols:
        # Detectar definición de función o constante
        if re.search(rf'\bfunction\s+{sym}\b', content) or re.search(rf'\bconst\s+{sym}\b', content):
            errors.append(f"navegacion.js contiene la función/símbolo huérfano '{sym}' que pertenece a {destino}")

    if not errors:
        print("  -> OK: navegacion.js está limpio de funciones huérfanas específicas de páginas.")
    return errors


def test_5_import_resolution():
    print("\n[TEST 5] Verificando que cada import en los módulos JS resuelva a un archivo existente...")
    errors = []
    js_files = sorted(glob.glob(os.path.join(JS_DIR, '**', '*.js'), recursive=True))

    for js_path in js_files:
        rel_js = os.path.relpath(js_path, FRONTEND_DIR).replace('\\', '/')
        with open(js_path, 'r', encoding='utf-8') as f:
            content = f.read()

        # Regex para imports estáticos:
        # import ... from './...' o import './...'
        import_patterns = [
            re.compile(r"""(?:import|export)\s+(?:.*?from\s+)?['"]([^'"]+)['"]"""),
        ]

        for pat in import_patterns:
            for match in pat.finditer(content):
                specifier = match.group(1)
                # Ignorar librerías externas o URLs completas (cdn, http, https)
                if specifier.startswith(('http://', 'https://', '//')):
                    continue
                if specifier.startswith('@') or not (specifier.startswith('./') or specifier.startswith('../')):
                    # bare specifier externo si hubiera
                    continue

                target_path = os.path.normpath(os.path.join(os.path.dirname(js_path), specifier))
                if not os.path.exists(target_path):
                    errors.append(f"[{rel_js}] Import roto: '{specifier}' no resuelve (ruta esperada: {target_path})")

    if not errors:
        print(f"  -> OK: Todos los imports en los {len(js_files)} módulos JS resuelven correctamente.")
    return errors


def test_6_no_circular_imports():
    print("\n[TEST 6] Verificando que no existan imports circulares...")
    errors = []
    js_files = sorted(glob.glob(os.path.join(JS_DIR, '**', '*.js'), recursive=True))

    # Construir grafo de dependencias
    # graph: { archivo_normalizado: set(archivos_importados_normalizados) }
    graph = {}
    for js_path in js_files:
        norm_file = os.path.normpath(js_path)
        graph[norm_file] = set()
        with open(js_path, 'r', encoding='utf-8') as f:
            content = f.read()

        for match in re.finditer(r"""(?:import|export)\s+(?:.*?from\s+)?['"]([^'"]+)['"]""", content):
            specifier = match.group(1)
            if specifier.startswith(('http://', 'https://', '//')) or specifier.startswith('@'):
                continue
            if not (specifier.startswith('./') or specifier.startswith('../')):
                continue

            target = os.path.normpath(os.path.join(os.path.dirname(js_path), specifier))
            if os.path.exists(target):
                graph[norm_file].add(target)

    # Detección de ciclos con DFS (algoritmo de 3 colores: blanco=0, gris=1, negro=2)
    visited = {}
    parent_map = {}
    cycles_found = []

    def dfs(node, path):
        visited[node] = 1 # Gris (en progreso)
        path.append(node)

        for neighbor in graph.get(node, []):
            if visited.get(neighbor, 0) == 1:
                # Ciclo encontrado
                cycle_idx = path.index(neighbor)
                cycle = path[cycle_idx:] + [neighbor]
                cycles_found.append(cycle)
            elif visited.get(neighbor, 0) == 0:
                dfs(neighbor, path)

        path.pop()
        visited[node] = 2 # Negro (completado)

    for node in graph:
        if visited.get(node, 0) == 0:
            dfs(node, [])

    if cycles_found:
        for c in cycles_found:
            cycle_names = [os.path.relpath(p, FRONTEND_DIR).replace('\\', '/') for p in c]
            errors.append("Ciclo de import circular detectado: " + " -> ".join(cycle_names))
    else:
        print(f"  -> OK: Grafo de dependencias acíclico ({len(graph)} módulos analizados, 0 ciclos).")

    return errors


def test_modularization():
    print("=" * 70)
    print(" SUITE DE PRUEBAS DE MODULARIZACIÓN Y ARQUITECTURA FRONTEND")
    print("=" * 70)

    total_passed = 0
    total_failed = 0
    total_skipped = 0
    all_errors = []

    # 1. HTML module scripts
    err1 = test_1_html_module_scripts()
    if err1:
        total_failed += 1
        all_errors.extend(err1)
        for e in err1:
            print(f"  -> ERROR: {e}")
    else:
        total_passed += 1

    # 2. UI modules export SELECTORES
    err2, skips2 = test_2_ui_modules_export_selectores()
    if skips2:
        for s in skips2:
            print(f"  -> {s}")
        total_skipped += len(skips2)
    if err2:
        total_failed += 1
        all_errors.extend(err2)
        for e in err2:
            print(f"  -> ERROR: {e}")
    elif not skips2:
        total_passed += 1

    # 3. SELECTORES exist in HTML
    err3, skips3 = test_3_selectores_exist_in_html()
    if skips3:
        for s in skips3:
            print(f"  -> {s}")
        total_skipped += len(skips3)
    if err3:
        total_failed += 1
        all_errors.extend(err3)
        for e in err3:
            print(f"  -> ERROR: {e}")
    elif not skips3:
        total_passed += 1

    # 4. No orphan functions in navegacion.js
    err4 = test_4_no_orphan_functions_in_navegacion()
    if err4:
        total_failed += 1
        all_errors.extend(err4)
        for e in err4:
            print(f"  -> ERROR: {e}")
    else:
        total_passed += 1

    # 5. Import resolution
    err5 = test_5_import_resolution()
    if err5:
        total_failed += 1
        all_errors.extend(err5)
        for e in err5:
            print(f"  -> ERROR: {e}")
    else:
        total_passed += 1

    # 6. No circular imports
    err6 = test_6_no_circular_imports()
    if err6:
        total_failed += 1
        all_errors.extend(err6)
        for e in err6:
            print(f"  -> ERROR: {e}")
    else:
        total_passed += 1

    print("\n" + "=" * 70)
    print(f"RESUMEN MODULARIZACIÓN: {total_passed} PASSED | {total_failed} FAILED | {total_skipped} SKIPPED")
    print("=" * 70)

    if total_failed > 0:
        return 1
    return 0


if __name__ == '__main__':
    code = test_modularization()
    sys.exit(code)
