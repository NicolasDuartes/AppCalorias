---
trigger: always_on
description: Protocolo estricto e inquebrantable para leer, auditar y actualizar el documento oficial de Google Docs (Documentación by IA) sin destruir pestañas ni trabajo del equipo.
---

# Regla Inquebrantable: Protocolo de Sincronización con Google Docs (`Documentación by IA`)

Esta regla externaliza de forma permanente todos los acuerdos establecidos con el usuario para el manejo del documento oficial del proyecto en Google Drive / Google Docs:
- **Nombre del documento:** `Documentación by IA`
- **Document ID:** `18s7zuFP1w0_MDb8nW-CmYZ0FsMx2IASV9H6AzQ2fqcU`
- **Script canónico de sincronización:** `scratch/sync_gdocs_release.py`
- **Scripts de auditoría y snapshot:** `scratch/snapshot_doc.py` y `scratch/diff_live_doc.py`

---

## 1. Prohibición Absoluta de Sobrescritura por Drive API y Credencial Obligatoria

1. **PROHIBIDO usar `drive_service.files().update(..., media_body=...)`:**
   - **JAMÁS** actualices el documento subiendo un archivo HTML, Markdown o texto plano mediante la API de Google Drive (`files().update` o `MediaIoBaseUpload`). Hacerlo convierte el documento entero en una única pestaña plana y **destruye las 16+ pestañas y subpestañas nativas** del equipo.
2. **PROHIBIDO usar `gdocs_client.py` del skill `google-docs-expert`:**
   - Ese script utiliza credenciales OAuth asociadas al proyecto GCP `615900867042`, el cual tiene la Google Docs API deshabilitada (`HttpError 403 SERVICE_DISABLED`). Nunca intentes hacer fallback a Drive API por ese error.
3. **Credencial y Cliente Obligatorios:**
   - Autentica **SIEMPRE** con la cuenta de servicio (`Service Account`) ubicada en:
     `C:\Users\gian9\.gemini\antigravity\credentials\service_account.json`
   - Utiliza exclusivamente `google.oauth2.service_account.Credentials.from_service_account_file(CREDENTIALS_PATH, scopes=['https://www.googleapis.com/auth/documents'])` y el cliente `build('docs', 'v1', credentials=creds)`.
4. **Operación Multi-Pestaña In-Place:**
   - Lee siempre el documento completo con `service.documents().get(documentId=DOC_ID, includeTabsContent=True).execute()`.
   - Modifica únicamente la pestaña objetivo mediante `service.documents().batchUpdate(documentId=DOC_ID, body={'requests': reqs}).execute()`, incluyendo explícitamente `'tabId': tab_id` en todos los objetos `location` y `range`.

---

## 2. Mapa de Pestañas y Preservación Sagrada del Trabajo del Equipo

El documento posee una jerarquía de pestañas y subpestañas que debe preservarse intacta:

### A. Pestañas Originales del Equipo (INTOCABLES)
- **`t.0` — `General (en proceso)`**:
  - Los párrafos originales del equipo (`Contenido de la aplicación:`, `Navegación en la app:`, `INCENTIVO DE PROGRESO (IDEA)`, índices 1 a 13) **JAMÁS** deben borrarse ni sobrescribirse. Solo puede actualizarse quirúrgicamente el bloque de guía de pestañas al final de `t.0` si es necesario.
  - Subpestañas hijas de `t.0` (**100% intocables**):
    - `t.du52qftqucxo` — `Características Generales`
    - `t.qw5aqle4z2h8` — `Características Distingibles`
- **`t.3mn5xatzpdlo` — `Algoritmo de Equivalencia`** (**100% intocable**, incluye notas de `benja:`):
  - Subpestañas hijas y nietas (**100% intocables**):
    - `t.gr8v007d0ysx` — `API - OPEN FOOD`
      - `t.3xsoh92m3qkg` — `características`
    - `t.bdkggblox4g1` — `OBSOLETO - Primer idea`
    - `t.hgdtgjo2udko` — `SEGUNDA IDEA`
- **`t.n2zoiaaci8u8` — `Pestaña 17`** (y cualquier nueva pestaña creada por los usuarios): **100% intocable**.

### B. Pestañas Técnicas Gestionadas por el Agente (Actualizables In-Place por `tabId`)
1. `t.o56s675ko202` — `Arquitectura & Stack`
2. `t.pmkpo41dcm27` — `Supabase Modelo & RLS`
3. `t.kjdtl22zjfxk` — `Roadmap & Pasos Faltantes`
4. `t.lz2tn39q6cao` — `Errores & Deuda Técnica`
5. `t.790cw4crhltz` — `OpenFDA Suplementos`
6. `t.z7m310w7sqce` — `AI Agents & Tools`
7. `t.o8ooq6iemumd` — `Preguntas Dev & Leads`
8. `t.69mbyy9w5nk` — `CONTROL DE VERSIONES`

---

## 3. Auditoría Previa contra Snapshot (`Protocolo Teamwork`)

1. **Antes de escribir en el Google Doc:**
   - Compara el estado en vivo del documento contra `scratch/doc_baseline_snapshot.json` ejecutando `python scratch/diff_live_doc.py` (o `python scratch/snapshot_doc.py`).
   - Si detectas que un miembro del equipo (Nicolás, Benjamín, Juan Martín) agregó texto manual, comentarios o modificó algún ítem en una pestaña que vas a actualizar, **PROHIBIDO pisar su cambio**. Incorpora su aporte o consulta al usuario antes de modificar esa sección.
2. **Después de actualizar el Google Doc:**
   - Ejecuta `python scratch/snapshot_doc.py` para actualizar `scratch/doc_baseline_snapshot.json` con la nueva línea base limpia.

---

## 4. Diseño Editorial Puro (Cero Tablas, Cero Falsas Viñetas)

1. **Cero Tablas en Pestañas Técnicas:**
   - No utilices tablas en las pestañas gestionadas por IA (`Arquitectura & Stack`, `Roadmap`, `Errores`, `Control de Versiones`, etc.). Se acordó el diseño **Editorial Puro** para evitar pérdida de información y celdas apretadas.
2. **Jerarquía Tipográfica y Paleta Corporativa (Roboto / Consolas):**
   - `TITLE`: 20 pt, Negrita, Slate 900 (`#0F172A`), `spaceBelow: 12pt`.
   - `HEADING_1`: 13–14 pt, Negrita, Slate 800 (`#1E293B`), `spaceAbove: 14-16pt`, `spaceBelow: 4pt`.
   - `HEADING_2`: 11.5–12 pt, Negrita, Blue 600 (`#2563EB`), `spaceAbove: 8-10pt`, `spaceBelow: 2-3pt`.
   - `NORMAL_TEXT` (`PARAGRAPH` / `BULLET`): 10–10.5 pt, Slate 700 (`#334155`).
   - `CODE`: 9.5 pt, `Consolas`, Slate 800 (`#1E293B`), sangría izquierda `indentStart: 18pt`.
3. **Viñetas Nativas y Prefijos en Negrita (`bold_prefix`):**
   - Usa siempre listas nativas de Google Docs (`createParagraphBullets` con `bulletPreset: 'BULLET_DISC_CIRCLE_SQUARE'`). Prohibido escribir falsas viñetas (`•` o `-`) como texto plano.
   - Cuando un bloque defina `bold_prefix`, el texto del bloque **DEBE** contener ese `bold_prefix` exactamente y el rango de negrita debe calcularse con `bp_idx = text.find(bold_prefix)` (`startIndex: st + bp_idx`, `endIndex: st + bp_idx + len(bold_prefix)`). **Nunca** asumas `st + len(bold_prefix)` si el texto no comienza con `bold_prefix`, para no dejar palabras cortadas a la mitad en negrita.

---

## 5. Estándar de Tareas Completadas y Parciales (`Roadmap` y `Errores`)

1. **Prohibido Borrar Tareas Completadas:**
   - **NUNCA** elimines del Roadmap ni de Errores una tarea que ya se completó. El registro es histórico y acumulativo.
2. **Tareas Completadas al 100% (`CHECKBOX`):**
   - Formato obligatorio:
     `☑ <Prefijo en negrita:> <Descripción de la solución> [Completado - DD/MM/AAAA]`
   - Estilo en Google Docs API:
     - Párrafo `NORMAL_TEXT` con sangría francesa (`indentStart: 20pt`, `indentFirstLine: -20pt`, `spaceAbove: 2.5pt`, `spaceBelow: 2.5pt`), sin `createParagraphBullets`.
     - Símbolo inicial `☑` (`\u2611`) en **Negrita**, tamaño `11.5pt`, color Verde Esmeralda (`#16A34A` / `rgb(0.0863, 0.6275, 0.3843)`).
     - `bold_prefix` en **Negrita**, color Slate 800 (`#1E293B`).
     - Etiqueta final `[Completado - DD/MM/AAAA]` en **Negrita**, tamaño `9.5pt`, color Verde Esmeralda (`#16A34A`).
3. **Tareas Completadas Parcialmente (`PARCIAL`):**
   - Cuando una tarea se resuelve solo en parte, **NO** se marca con `☑`.
   - Formato obligatorio:
     `<Tramo completado> [PARCIAL - DD/MM/AAAA]: Pendiente: <qué falta exactamente> | Motivo: <justificación técnica>`
   - Estilo en Google Docs API:
     - Viñeta nativa (`createParagraphBullets` con `BULLET_DISC_CIRCLE_SQUARE`).
     - El `<Tramo completado>` (`strike_text`) lleva tachado nativo (`strikethrough: True`) y color gris atenuado Slate 500 (`#64748B` / `rgb(0.392, 0.455, 0.545)`).
     - La etiqueta `[PARCIAL - DD/MM/AAAA]` lleva **Negrita** y color Blue 600 (`#2563EB`).
     - El tramo `Pendiente: ... | Motivo: ...` permanece sin tachar en color normal Slate 700 (`#334155`).
   - Cuando en una versión posterior se completa el tramo pendiente, el bloque `PARCIAL` se convierte en `CHECKBOX` (`☑ ... [Completado - DD/MM/AAAA]`).

---

## 6. Estándar de la Pestaña `CONTROL DE VERSIONES` (`t.69mbyy9w5nk`)

1. **Alcance:**
   - Solo se documentan versiones **Mayores (Major)** y **Medianas (Minor)** en orden cronológico inverso (la más reciente arriba). Los cambios atómicos quedan en los commits de Git.
2. **Límite de Extensión y Claridad:**
   - Cada versión debe tener un resumen ejecutivo de **máximo 10 renglones (`≤ 10 renglones`)**, redactado en lenguaje claro y comprensible tanto para desarrolladores como para integrantes no técnicos del equipo.
3. **Separador Visual Obligatorio entre Versiones:**
   - Entre el bloque de gobernanza y cada versión (y al final de cada versión) **DEBE** incluirse el párrafo separador de guiones establecido por el usuario:
     `-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------`
