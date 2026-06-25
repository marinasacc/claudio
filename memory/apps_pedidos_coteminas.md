# App Pedidos Coteminas

## Ubicación
- Carpeta: `apps/pedidos-coteminas/`
- Iniciar: doble clic en `iniciar.bat` o `python -X utf8 app.py`
- URL: http://localhost:5051

## Stack
- Flask local + SQLite + Bootstrap 5
- Puerto 5051 (se cambió de 5050 a 5051 porque chocaba con la app Cuentas Corrientes, que usa 5050)

## Base de datos
- `data/pedidos.db` (SQLite)
- 520 productos importados de:
  - PLANILLA COTEMINAS OI26: 331 productos (toallas, sábanas, almohadas, batas, etc.)
  - Planilla Arco Iris OI26: 189 productos
- Para reimportar: `python -X utf8 importar_productos.py`

## Funcionalidades
- **Tipos de pedido**: TOTAL (el grande del mes) o PARCIAL (durante el mes). Los parciales se numeran automáticamente (Parcial 1, Parcial 2...) por mes/año.
- **Estados**: SIN FINALIZAR (editable, se sigue agregando) o FINALIZADO (cerrado). Se puede reabrir.
- **Fecha del pedido**: campo `fecha_pedido` (YYYY-MM-DD) editable, por defecto la fecha de hoy. Es el día en que se realizó el pedido (útil para parciales). Se muestra en header, lista, historial, resumen y Excel. Filtro `fecha_legible` lo muestra como DD/MM/YYYY.
- **Editar info**: botón lápiz junto al título permite cambiar mes/año/tipo/fecha/notas de un pedido ya creado (ruta /pedido/<id>/editar-info)
- Valores internos en DB: tipo = total/parcial, estado = sin_finalizar/finalizado (antes eran mensual/extra y borrador/terminado, migrados en init_db)
- **Crear pedidos** total o parcial
- **Agregar productos** con selección múltiple (checkboxes que no cierran la lista)
- **Familias**: seleccionar un modelo completo (ej "GR140B Detroit") que abarca todos los colores, ideal para pedir "surtido". Se agrupan por SKU+línea+diseño.
- **Carga manual** para items libres / aclaraciones. Tiene selector de categoría con opción "Detectar automáticamente": si se deja vacío, `detectar_categoria_desc()` deduce la categoría de la descripción (ej "Toallón..." → toallones) para que caiga en su sección y no en "MANUAL". También se puede forzar la categoría a mano.
- **Dos destinos**: Tucumán (Sergio Saccal) y Alsina (Alberto Saccal)
- **Edición incremental**: el pedido queda en borrador, se va completando de a poco
- **Resumen** por depósito con totales por categoría (las familias caen en su categoría real vía categoria_manual)
- **Exportar Excel** con formato APILADO (Alsina arriba, Tucumán abajo, para que el detalle no se superponga). Columnas: MLA | SKU | Descripción | Colores | Cantidad | Detalle. Nombre del archivo: "PEDIDO COTEMINAS - {Mes} {Año} - {Total/Parcial N}.xlsx"
- **Entregas (confirmaciones del proveedor)**: sección independiente en el menú. Se pega el email de facturación de Coteminas y la app lo PARSEA automáticamente (`parser_confirmacion.py`):
  - Detecta depósito por el cliente facturado: SACCAL ALBERTO → Alsina, SACCAL SERGIO → Tucumán
  - Extrae factura, remito, nro de pedido del proveedor, fecha emisión/vencimiento, valor total
  - Lista de productos con cantidades; matchea cada uno al catálogo por `codigo`
  - **Variantes nuevas**: si un código no matchea (color nuevo de un modelo existente), en el preview aparece un desplegable para asignar el SKU a mano (`entrega_items.sku_manual`). Así el cruce lo cuenta bien aunque el color no esté en el catálogo OI26.
  - Campo **fecha de entrega** editable (la que Maru coordina con el proveedor)
  - Tablas: `entregas` + `entrega_items` (independientes de los pedidos). Rutas: /entregas, /entregas/nueva, /entregas/guardar, /entregas/<id>, /entregas/<id>/editar, /entregas/<id>/eliminar
  - Email de ejemplo en `data/email_ejemplo.txt`
  - **Filtros** en la lista de entregas: por depósito y por período (mm/aaaa de la emisión)
  - **Exportar Excel** de cada entrega (cabecera + productos): /entregas/<id>/exportar
- **Comparativa Pedido vs Confirmado** (`/comparativa`, en el menú): cruza lo pedido (pedido_items) con lo confirmado (entrega_items), agrupado por SKU + depósito. Muestra pedido / confirmado / diferencia con badges (Falta X / Completo / Llegó de más). Cruce por SKU (sku_tu_textil), no por color. Filtro por depósito y opción "solo pedidos finalizados". Items sin SKU (colores fuera de catálogo) caen en fila "(sin SKU)".
- **(viejo) Confirmaciones**: pegar texto del email del proveedor (tablas confirmaciones/confirmacion_items, reemplazadas por entregas)
- **Historial**: todos los pedidos anteriores consultables
- **Catálogo**: ver los 520 productos con filtros, SKU y MLA
  - **Buscador**: busca por descripción, código, EAN, **SKU y MLA** (antes solo desc/código/EAN)
  - **Editar a mano** (botón lápiz por fila → `/catalogo/<id>/editar`): corrige descripción, SKU, MLA, código, categoría, línea, diseño, color, EAN, etc. Es UPDATE (conserva el `id`), así que NO toca pedidos ni entregas (que apuntan por `producto_id`); el pedido muestra la info corregida.
  - **Nuevo producto** (`/catalogo/nuevo`): alta manual de un producto que falte (queda `estado='activo'`, `fuente='manual'`). Campos obligatorios: código y descripción.
  - **Duplicar** (botón "copiar" por fila → `/catalogo/<id>/duplicar`, GET): abre el form de alta precargado con TODOS los datos del producto original; al guardar postea a `/catalogo/nuevo` y crea un producto NUEVO (no toca el original). Ideal para cargar otra variante de color del mismo modelo cambiando solo código/color. El template `producto_form.html` usa `form_action` (destino del POST) y `duplicando` (aviso + título). Original queda intacto.
  - **Discontinuar / reactivar** (`/catalogo/<id>/estado`, POST): soft delete vía `estado='discontinuado'`. Lo oculta del catálogo SIN borrar la fila, así los pedidos que lo referencian siguen intactos. Checkbox "Mostrar también discontinuados" para verlos y reactivarlos.
  - Template del form: `templates/producto_form.html` (compartido nuevo/editar). Lógica en `_leer_form_producto()` + lista `CAMPOS_PRODUCTO` en app.py.
  - **Edición masiva** (`/catalogo/editar-masivo`, POST): checkbox por fila + "seleccionar todos", botón "Editar seleccionados (N)" que abre un modal. Se tilda solo los campos a cambiar (`aplicar_<campo>`) y se aplica el MISMO valor a todos los seleccionados; lo no tildado queda como está en cada producto. Campos masivos: SKU, MLA, categoría, línea, diseño, origen, colección (`CAMPOS_MASIVOS`) + acción de estado (discontinuar/reactivar). Es UPDATE por `id IN (...)`, no toca pedidos. Los ids seleccionados se inyectan como inputs hidden vía JS al hacer submit (los checkboxes NO están dentro de un form para no anidar con los forms de discontinuar por fila). Ideal para asignar el mismo SKU/MLA a todas las variantes de color de un modelo.

## SKU Tu Textil + MLA MercadoLibre
- `mapear_sku_mla.py` lee `PEDIDO COTEMINAS.xlsx` y asigna a cada producto del catálogo:
  - `sku_tu_textil`: código interno (ej TOA171C, GR140B)
  - `mla_ids`: publicaciones de MercadoLibre (ej MLA1940235324), separadas por coma
- 320/520 productos con SKU, 202/520 con MLA
- Con el MLA, Maru entra a ML y ve cuánto vendió el último mes para estimar el pedido
- Se puede buscar productos por SKU o MLA en el buscador
- Reglas de mapeo (SKU -> query SQL) están en `build_mapping_rules()` dentro de mapear_sku_mla.py

## Notas técnicas
- Puerto 5051, `use_reloader=False` (evita doble proceso y locks de SQLite)
- `get_db()` usa timeout=15 y busy_timeout para evitar "database is locked"
- Extracción de diseño/color: lógica posicional [CATEGORIA][LINEA][DISEÑO][COLOR][CODIGO 4 díg]
- Si se reimportan productos (importar_productos.py), HAY QUE re-correr mapear_sku_mla.py después

## Archivos
- `app.py` — Aplicación Flask principal
- `models.py` — Modelos de DB (SQLite puro, con migraciones defensivas)
- `importar_productos.py` — Importador de planillas Excel del proveedor
- `mapear_sku_mla.py` — Asigna SKU interno + MLA a los productos del catálogo
- `iniciar.bat` — Ejecutable para arrancar la app
- `templates/` — Templates HTML (Jinja2)
- `data/pedidos.db` — Base de datos

## Planillas fuente
- `G:\Mi unidad\ML - MARINA NO TOCAR\CODIGOS DE BARRA\PLANILLA COTEMINAS - COLECCION OI26 (3).xlsx`
- `G:\Mi unidad\ML - MARINA NO TOCAR\CODIGOS DE BARRA\Planilla Colección AI OI26 (2).xlsx`
