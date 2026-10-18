#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
test_supabase_modules.py — Suite de verificación estructural para los módulos de Supabase API
Verifica (sin conectar a la base de datos real):
1. frontend/js/data/alimentos-api.js existe y exporta: buscarAlimentos, obtenerAlimento, crearAlimento, obtenerCategorias.
2. frontend/js/data/planes-api.js existe y exporta: obtenerPlanActivo, crearPlan, activarPlan, archivarPlan.
3. frontend/js/data/registro-api.js existe y exporta: obtenerOCrearRegistroDiario, registrarAlimentoConsumido, obtenerConsumoDiario.
4. Cada módulo importa `supabase` de `./supabase.js`.
5. Cada función exportada tiene documentación JSDoc adecuada.
"""

import os
import re
import sys

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, 'frontend', 'js', 'data')

ALIMENTOS_API_PATH = os.path.join(DATA_DIR, 'alimentos-api.js')
PLANES_API_PATH = os.path.join(DATA_DIR, 'planes-api.js')
REGISTRO_API_PATH = os.path.join(DATA_DIR, 'registro-api.js')

def extract_jsdoc_before_pos(content, pos):
    """
    Busca si inmediatamente antes de la posición `pos` (salvo espacios/saltos de línea)
    existe un bloque de comentarios JSDoc /** ... */.
    """
    prefix = content[:pos].rstrip()
    if prefix.endswith('*/'):
        start_comment = prefix.rfind('/**')
        if start_comment != -1 and start_comment < len(prefix):
            return prefix[start_comment:]
    return None

def check_module_exports_and_jsdoc(module_path, module_name, required_exports):
    errors = []
    skipped = []

    if not os.path.exists(module_path):
        skipped.append(f"[SKIP] Módulo {module_name} no existe todavía en {module_path}")
        return errors, skipped, {}

    with open(module_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Verificar import de supabase
    # Busca import { supabase } from './supabase.js'
    import_match = re.search(r"import\s*\{[^}]*\bsupabase\b[^}]*\}\s*from\s*['\"]\./supabase\.js['\"]", content)
    if not import_match:
        errors.append(f"{module_name}: no importa 'supabase' de './supabase.js'")

    # 2. Verificar cada export requerido y su JSDoc
    # Encuentra todas las funciones o constantes exportadas
    pattern = re.compile(r'export\s+(?:async\s+)?(?:function|const|let)\s+([A-Za-z0-9_]+)')
    all_exports = {}
    for match in pattern.finditer(content):
        name = match.group(1)
        pos = match.start()
        jsdoc = extract_jsdoc_before_pos(content, pos)
        all_exports[name] = jsdoc

    for req in required_exports:
        if req not in all_exports:
            errors.append(f"{module_name}: falta exportar '{req}'")
        else:
            doc = all_exports[req]
            if not doc:
                errors.append(f"{module_name}: la función exportada '{req}' no tiene comentario JSDoc /** ... */")
            elif '@param' not in doc and '@returns' not in doc and len(doc.strip()) < 15:
                errors.append(f"{module_name}: el JSDoc de '{req}' está incompleto o vacío")

    return errors, skipped, all_exports


def test_supabase_modules():
    print("=" * 70)
    print(" SUITE DE VERIFICACIÓN ESTRUCTURAL: MÓDULOS DATA / SUPABASE API")
    print("=" * 70)

    total_passed = 0
    total_failed = 0
    total_skipped = 0
    all_errors = []

    # Test 1: alimentos-api.js
    print("\n[TEST 1] Verificando alimentos-api.js y funciones requeridas...")
    req_alimentos = ['buscarAlimentos', 'obtenerAlimento', 'crearAlimento', 'obtenerCategorias']
    errs1, skips1, exports1 = check_module_exports_and_jsdoc(ALIMENTOS_API_PATH, 'alimentos-api.js', req_alimentos)
    if skips1:
        for s in skips1:
            print(f"  -> {s}")
        total_skipped += 1
    elif errs1:
        for e in errs1:
            print(f"  -> ERROR: {e}")
        all_errors.extend(errs1)
        total_failed += 1
    else:
        print(f"  -> OK: alimentos-api.js exporta correctamente {req_alimentos} con JSDoc e import de supabase.")
        total_passed += 1

    # Test 2: planes-api.js
    print("\n[TEST 2] Verificando planes-api.js y funciones requeridas...")
    req_planes = ['obtenerPlanActivo', 'crearPlan', 'activarPlan', 'archivarPlan']
    errs2, skips2, exports2 = check_module_exports_and_jsdoc(PLANES_API_PATH, 'planes-api.js', req_planes)
    if skips2:
        for s in skips2:
            print(f"  -> {s}")
        total_skipped += 1
    elif errs2:
        for e in errs2:
            print(f"  -> ERROR: {e}")
        all_errors.extend(errs2)
        total_failed += 1
    else:
        print(f"  -> OK: planes-api.js exporta correctamente {req_planes} con JSDoc e import de supabase.")
        total_passed += 1

    # Test 3: registro-api.js
    print("\n[TEST 3] Verificando registro-api.js y funciones requeridas...")
    req_registro = ['obtenerOCrearRegistroDiario', 'registrarAlimentoConsumido', 'obtenerConsumoDiario']
    errs3, skips3, exports3 = check_module_exports_and_jsdoc(REGISTRO_API_PATH, 'registro-api.js', req_registro)
    if skips3:
        for s in skips3:
            print(f"  -> {s}")
        total_skipped += 1
    elif errs3:
        for e in errs3:
            print(f"  -> ERROR: {e}")
        all_errors.extend(errs3)
        total_failed += 1
    else:
        print(f"  -> OK: registro-api.js exporta correctamente {req_registro} con JSDoc e import de supabase.")
        total_passed += 1

    # Test 4: Integridad cruzada de imports a supabase.js
    print("\n[TEST 4] Verificando existencia de frontend/js/data/supabase.js...")
    supabase_path = os.path.join(DATA_DIR, 'supabase.js')
    if not os.path.exists(supabase_path):
        all_errors.append("frontend/js/data/supabase.js no existe")
        total_failed += 1
    else:
        with open(supabase_path, 'r', encoding='utf-8') as f:
            sub_content = f.read()
        if 'export const supabase' not in sub_content and 'export let supabase' not in sub_content and 'export { supabase' not in sub_content:
            all_errors.append("supabase.js debe exportar el cliente 'supabase'")
            total_failed += 1
        else:
            print("  -> OK: supabase.js existe y exporta cliente 'supabase'.")
            total_passed += 1

    print("\n" + "=" * 70)
    print(f"RESUMEN SUPABASE MODULES: {total_passed} PASSED | {total_failed} FAILED | {total_skipped} SKIPPED")
    print("=" * 70)

    if total_failed > 0:
        return 1
    return 0

if __name__ == '__main__':
    code = test_supabase_modules()
    sys.exit(code)
