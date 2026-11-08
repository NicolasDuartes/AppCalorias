# Reglas de Ingeniería y Documentación del Proyecto — AppCalorias

Este archivo es leído automáticamente por los agentes en cada sesión de trabajo dentro del repositorio `AppCalorias`. Su cumplimiento es **obligatorio e inquebrantable**.

---

## 1. Protocolo Inquebrantable del Google Doc Oficial (`Documentación by IA`)

El documento vivo del equipo en Google Docs tiene el ID:
`18s7zuFP1w0_MDb8nW-CmYZ0FsMx2IASV9H6AzQ2fqcU`

### Reglas Críticas (Cero Tolerancia a Errores)
1. **PROHIBIDO usar `drive_service.files().update(..., media_body=...)`:**
   - **NUNCA** subas HTML, Markdown ni texto plano mediante la API de Google Drive para actualizar el documento. Eso sobrescribe el archivo entero como un documento de una sola pestaña y **destruye las 16+ pestañas y subpestañas** del equipo.
2. **PROHIBIDO usar `gdocs_client.py` del skill `google-docs-expert`:**
   - Ese cliente usa OAuth del proyecto `615900867042` donde la API de Google Docs está deshabilitada (`403 SERVICE_DISABLED`).
3. **Credencial y API Obligatorias:**
   - Autentica **SIEMPRE** con la Service Account:
     `C:\Users\gian9\.gemini\antigravity\credentials\service_account.json`
   - Usa exclusivamente `build('docs', 'v1', credentials=creds)`, lee con `documents().get(documentId=DOC_ID, includeTabsContent=True)` y actualiza in-place por pestaña con `documents().batchUpdate` especificando `'tabId': tab_id` en cada rango.
4. **Pestañas Intocables del Equipo:**
   - **JAMÁS** borres ni sobrescribas el contenido del equipo en:
     - `t.0` (`General (en proceso)`, párrafos 1–13 del equipo) y sus subpestañas `t.du52qftqucxo` (`Características Generales`) y `t.qw5aqle4z2h8` (`Características Distingibles`).
     - `t.3mn5xatzpdlo` (`Algoritmo de Equivalencia`, incluyendo notas de `benja:`) y sus subpestañas `t.gr8v007d0ysx` (`API - OPEN FOOD`), `t.3xsoh92m3qkg` (`características`), `t.bdkggblox4g1` (`OBSOLETO - Primer idea`) y `t.hgdtgjo2udko` (`SEGUNDA IDEA`).
     - `t.n2zoiaaci8u8` (`Pestaña 17`) o cualquier pestaña creada manualmente por el equipo.
5. **Auditoría Previa contra Snapshot (`scratch/doc_baseline_snapshot.json`):**
   - Antes de actualizar cualquier pestaña técnica (`t.o56s675ko202`, `t.pmkpo41dcm27`, `t.kjdtl22zjfxk`, `t.lz2tn39q6cao`, `t.790cw4crhltz`, `t.z7m310w7sqce`, `t.o8ooq6iemumd`, `t.69mbyy9w5nk`), ejecuta `python scratch/diff_live_doc.py` para verificar si el equipo hizo cambios manuales desde el último snapshot. Al terminar la actualización, ejecuta `python scratch/snapshot_doc.py`.
6. **Diseño Editorial Puro y Formato de Tareas/Versiones:**
   - **Cero tablas** y **cero falsas viñetas** en las pestañas técnicas: usa `TITLE`, `HEADING_1`, `HEADING_2`, `NORMAL_TEXT`, `CODE` y viñetas nativas (`BULLET_DISC_CIRCLE_SQUARE`).
   - **Prohibido borrar tareas completadas** en `Roadmap & Pasos Faltantes` (`t.kjdtl22zjfxk`) y `Errores & Deuda Técnica` (`t.lz2tn39q6cao`).
   - **Tareas 100% completadas (`CHECKBOX`):** `☑ <Prefijo en negrita:> <Descripción> [Completado - DD/MM/AAAA]` con sangría francesa (`20pt` / `-20pt`) y color verde esmeralda (`#16A34A`) en `☑` y en `[Completado - DD/MM/AAAA]`.
   - **Tareas parcialmente completadas (`PARCIAL`):** `<Tramo completado con strikethrough nativo> [PARCIAL - DD/MM/AAAA]: Pendiente: <qué falta> | Motivo: <por qué se pospone>` con viñeta nativa, `strikethrough: True` + gris `#64748B` en el tramo resuelto y `[PARCIAL - DD/MM/AAAA]` en azul `#2563EB`.
   - **`CONTROL DE VERSIONES` (`t.69mbyy9w5nk`):** Solo versiones Major/Minor, **máximo 10 renglones** por versión, separadas obligatoriamente por la línea divisoria:
     `-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------`

> Para el detalle completo del protocolo de Google Docs, consulta `.agents/rules/google-docs-protocol.md`.
