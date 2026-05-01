# Sistema de Stock Tu Textil - Instrucciones

## ¿Qué es esto?
Un sistema de dos partes:
1. **Formulario de carga**: los empleados registran movimientos de stock desde el celular
2. **Panel de actualización**: Marina revisa los pendientes y actualiza TiendaNube con un botón

## URLs
- **Formulario (empleados)**: https://script.google.com/macros/s/AKfycbwhhBlelah3ds4mdOkhJY0lR9EAFaUWXrCBZCZA0wOtnKdMezUSC7pUKMhXGssmz_0p/exec
- **Panel actualización (Marina)**: https://script.google.com/macros/s/AKfycbwhhBlelah3ds4mdOkhJY0lR9EAFaUWXrCBZCZA0wOtnKdMezUSC7pUKMhXGssmz_0p/exec?page=actualizar
- **Google Sheet**: https://docs.google.com/spreadsheets/d/10gyg3GgtGgbUx2HHUmGs6W6v5sIIU3lXBULgs_AL79o/edit

## Campos del formulario
1. **Empleado** - desplegable con nombres predefinidos
2. **Producto (SKU)** - buscador con autocompletado (muestra SKU + nombre)
3. **Variante** - se filtra según el producto elegido
4. **Tipo de movimiento**: Ingreso | Actualización | Vendido | Full (MeLi)
5. **Cantidad** - número positivo
6. **Ubicación** - Local o Depósito

## Tipos de movimiento
- **Ingreso**: suma la cantidad al stock actual
- **Actualización**: reemplaza el stock actual con la cantidad ingresada
- **Vendido**: resta la cantidad al stock actual
- **Full**: resta la cantidad (envío a MercadoLibre Full/fulfillment)

## ¿Cómo actualizar el stock en TiendaNube?
1. Abrir el **Panel de actualización** (link arriba)
2. Revisar los registros pendientes en la tabla
3. Click en **"🚀 Actualizar todos en TiendaNube"**
4. El sistema por cada registro: consulta stock actual → calcula → actualiza → marca como procesado
5. Se muestra el resultado de cada operación (stock anterior → stock nuevo)

## Empleados configurados
Elio, Claudio, Willy, Luis, Laura, Romina, Fabiana, Manuel, Sergio, Marina, Otro

## ¿Cómo actualizar los productos?
Cuando se agregan nuevos productos en TiendaNube:
1. Exportar el CSV de productos desde TiendaNube admin
2. Pedirle a Claude que regenere el CSV y actualice la pestaña "Productos" del Sheet

## ¿Cómo modificar el código?
- Archivos fuente: `Code.gs`, `Formulario.html`, `Actualizador.html`
- Editor: https://script.google.com/u/0/home/projects/1PnMzH0fPqtSS8vvWtqieMI9rGK4lRX6DP00a8r9IOJGmQIdr50Y53ayM/edit
- IMPORTANTE: después de cambiar el código, ir a **Implementar → Gestionar implementaciones → lápiz → Nueva versión → Implementar**

## Conexiones
- **TiendaNube API**: token guardado en PropertiesService del script (configurado con setTokenManual)
- **Google Sheet**: conectado al mismo spreadsheet donde vive el Apps Script
