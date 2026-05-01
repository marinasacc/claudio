---
name: App de Stock - Sistema de carga y actualización
description: Google Apps Script web app para que empleados carguen movimientos de stock y Marina actualice TiendaNube
type: project
---

## Sistema de Stock Tu Textil

### Componentes
1. **Formulario de carga** (empleados): Google Apps Script web app
2. **Panel de actualización** (Marina): misma app con ?page=actualizar
3. **Google Sheet** "Stock Tu Textil": almacena productos y registros

### URLs
- **Formulario empleados**: https://script.google.com/macros/s/AKfycbwhhBlelah3ds4mdOkhJY0lR9EAFaUWXrCBZCZA0wOtnKdMezUSC7pUKMhXGssmz_0p/exec
- **Panel actualización**: https://script.google.com/macros/s/AKfycbwhhBlelah3ds4mdOkhJY0lR9EAFaUWXrCBZCZA0wOtnKdMezUSC7pUKMhXGssmz_0p/exec?page=actualizar
- **Google Sheet**: https://docs.google.com/spreadsheets/d/10gyg3GgtGgbUx2HHUmGs6W6v5sIIU3lXBULgs_AL79o/edit
- **Apps Script editor**: https://script.google.com/u/0/home/projects/1PnMzH0fPqtSS8vvWtqieMI9rGK4lRX6DP00a8r9IOJGmQIdr50Y53ayM/edit

### Estructura del Sheet
- **Pestaña "Productos"**: SKU | Nombre | Variante (2573 filas, cargado desde CSV de TiendaNube)
- **Pestaña "Registros"**: Fecha | Empleado | SKU | Producto | Variante | Tipo de Movimiento | Cantidad | Ubicación | Actualizado en TiendaNube

### Empleados configurados en el formulario
Elio, Claudio, Willy, Luis, Laura, Romina, Fabiana, Manuel, Sergio, Marina, Otro

### Tipos de movimiento
- **Ingreso**: suma al stock actual
- **Actualización**: reemplaza el stock actual
- **Vendido**: resta al stock actual
- **Full**: resta al stock actual (envío a MercadoLibre Full/fulfillment)

### Lógica de unicidad
- Un producto se identifica por **SKU + Nombre** (un mismo SKU puede tener varios productos)
- Las variantes se filtran dinámicamente según el SKU+Nombre elegido

### Flujo completo
1. Empleado abre formulario → elige nombre, busca SKU, selecciona variante, tipo, cantidad, ubicación → envía
2. Se guarda en pestaña "Registros" con columna "Actualizado en TiendaNube" vacía
3. Marina abre panel de actualización → ve pendientes → click "Actualizar todos"
4. El sistema para cada pendiente: consulta stock actual en TiendaNube API → calcula nuevo stock → actualiza via API → marca fila como actualizada con timestamp

### Código fuente local
- `C:\Users\maru\Documents\claudio\apps\stock-form\Code.gs`
- `C:\Users\maru\Documents\claudio\apps\stock-form\Formulario.html`
- `C:\Users\maru\Documents\claudio\apps\stock-form\Actualizador.html`

### Token de TiendaNube en Apps Script
- Guardado en PropertiesService (script properties) con key "TIENDANUBE_TOKEN"
- Se configuró ejecutando la función setTokenManual() desde el editor
