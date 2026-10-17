"""
columnas.py — lo que comparten la planilla y el script de carga.

Las categorías y los valores permitidos tienen que coincidir con la
migración 20261017120000_alimentos.sql.
"""

# Código en la base → nombre de la hoja en la planilla
CATEGORIAS = {
    'carnes': 'Carnes',
    'pescados': 'Pescados y mariscos',
    'huevos': 'Huevos',
    'lacteos': 'Lácteos',
    'cereales': 'Cereales, panes y pastas',
    'legumbres': 'Legumbres',
    'verduras': 'Verduras',
    'frutas': 'Frutas',
    'grasas': 'Grasas, aceites y frutos secos',
    'dulces': 'Dulces y azúcares',
    'bebidas': 'Bebidas',
    'preparaciones': 'Preparaciones',
}

COCCIONES = ['crudo', 'cocido', 'listo']
FUENTES = ['equipo', 'tabla_ar', 'usda', 'off', 'coach', 'alumno']

COLUMNAS = [
    {'clave': 'nombre', 'ancho': 30, 'ayuda': 'Obligatorio. Como lo dice la gente ("Pechuga de pollo", no "Pollo, pechuga, cocido").'},
    {'clave': 'coccion', 'ancho': 10, 'ayuda': 'Obligatorio. crudo, cocido o listo (listo = se come como viene: fruta, yogur, pan).'},
    {'clave': 'kcal', 'ancho': 8, 'ayuda': 'Obligatorio. Calorías cada 100 g (0 a 900).'},
    {'clave': 'proteinas', 'ancho': 10, 'ayuda': 'Obligatorio. Gramos cada 100 g.'},
    {'clave': 'carbohidratos', 'ancho': 13, 'ayuda': 'Obligatorio. Gramos cada 100 g.'},
    {'clave': 'grasas', 'ancho': 8, 'ayuda': 'Obligatorio. Gramos cada 100 g. Proteínas + carbohidratos + grasas no puede pasar de 100.'},
    {'clave': 'porcion_g', 'ancho': 10, 'ayuda': 'Opcional. Gramos de una porción habitual (la cantidad que la app propone al agregarlo).'},
    {'clave': 'porcion_texto', 'ancho': 16, 'ayuda': 'Opcional. Cómo se ve esa porción: "4 cucharadas", "1 taza".'},
    {'clave': 'unidad_nombre', 'ancho': 13, 'ayuda': 'Solo si se cuenta por unidades: u, rebanada, taza... Va junto con unidad_g.'},
    {'clave': 'unidad_g', 'ancho': 10, 'ayuda': 'Solo si se cuenta por unidades: cuánto pesa 1 unidad, en gramos.'},
    {'clave': 'sinonimos', 'ancho': 26, 'ayuda': 'Opcional. Otros nombres separados por coma: "aguacate, avocado".'},
    {'clave': 'marca', 'ancho': 14, 'ayuda': 'Solo para productos envasados.'},
    {'clave': 'fuente', 'ancho': 10, 'ayuda': 'De dónde salen los valores: equipo, tabla_ar, usda u off (Open Food Facts). Vacío = equipo.'},
    {'clave': 'fuente_ref', 'ancho': 12, 'ayuda': 'Opcional. Id en la fuente (ej. el fdcId de USDA o el código de barras).'},
    {'clave': 'excepcion_kcal', 'ancho': 14, 'ayuda': '"sí" solo si las calorías no coinciden con los macros a propósito (ej. bebidas con alcohol).'},
    {'clave': 'control', 'ancho': 34, 'ayuda': 'No se completa: se calcula sola. Tiene que decir OK.'},
]
