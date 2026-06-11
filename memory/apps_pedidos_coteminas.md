# App Pedidos Coteminas

## Ubicación
- Carpeta: `apps/pedidos-coteminas/`
- Iniciar: doble clic en `iniciar.bat` o `python -X utf8 app.py`
- URL: http://localhost:5050

## Stack
- Flask local + SQLite + Bootstrap 5
- Puerto 5050

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
- **Confirmaciones**: pegar texto del email del proveedor
- **Historial**: todos los pedidos anteriores consultables
- **Catálogo**: ver los 520 productos con filtros, SKU y MLA

## SKU Tu Textil + MLA MercadoLibre
- `mapear_sku_mla.py` lee `PEDIDO COTEMINAS.xlsx` y asigna a cada producto del catálogo:
  - `sku_tu_textil`: código interno (ej TOA171C, GR140B)
  - `mla_ids`: publicaciones de MercadoLibre (ej MLA1940235324), separadas por coma
- 320/520 productos con SKU, 202/520 con MLA
- Con el MLA, Maru entra a ML y ve cuánto vendió el último mes para estimar el pedido
- Se puede buscar productos por SKU o MLA en el buscador
- Reglas de mapeo (SKU -> query SQL) están en `build_mapping_rules()` dentro de mapear_sku_mla.py

## Notas técnicas
- Puerto 5050, `use_reloader=False` (evita doble proceso y locks de SQLite)
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
