# Claudio - Herramientas de automatización para Tu Textil

## Contexto
Herramientas para el negocio de blanquería de Maru (Tu Textil / Tucumán Textil).
Tienda física en Once, CABA. Fabricación propia. +60 años en el rubro.

## Plataformas del negocio
- **TiendaNube**: tutextil.com.ar (tienda propia)
- **MercadoLibre**: TUTEXTILHOGARYHOTEL (+25K seguidores)
- **Google Ads**: cuenta 160-816-7156 (57 campañas)
- **Google Merchant Center**: cuenta 720109441 (2.512 productos)
- **Google Analytics**: propiedad a107376290p328969480
- **Google My Business**: "Tu Textil -Tucumán Textil" (4.7 estrellas)

## APIs configuradas
- **TiendaNube API** ✅: token en `data/tiendanube_token.json`, store_id 858478
- **Google Sheets API** ✅: credenciales en `data/google_credentials.json`, cuenta de servicio claudio@claudio-491623.iam.gserviceaccount.com
- **Google Analytics API (GA4)** ✅: misma cuenta de servicio, property 328969480. Ventas por canal y datos de campañas de Google Ads (Ads está vinculado a GA4). Scripts: `tools/ventas_por_canal.py`, `tools/google_ads_campanas.py`
- **MercadoLibre API** ❌: pendiente de configurar
- Ver detalles completos y ejemplos de uso en memory/reference_access_guide.md

## Acceso a plataformas Google via Claude in Chrome
Solo para exploración puntual (es lento y gasta muchos tokens).
Para operaciones recurrentes usar APIs directas.
Sesión: marina@tucumantextil.com.ar

## Apps creadas
- **Stock Form + Actualizador**: Apps Script web app — ver memory/apps_stock.md
- **Cuentas Corrientes**: app Flask para gestionar cobranzas de clientes
  - Carpeta: `cuentas_corrientes/` (proyecto independiente con su propio repo y CLAUDE.md)
  - GitHub: https://github.com/marinasacc/cuentas-corrientes
  - Producción: https://tutextil.pythonanywhere.com (PythonAnywhere free)
  - Stack: Flask + SQLite + Bootstrap, deploy a PythonAnywhere
  - Funcionalidades: importar Excel de Magus, grilla con filtros, historial de contactos por cliente, recordatorios por Google Calendar (SMTP+ICS), backup automático a Google Drive (OAuth)
  - Login: usuario y contraseña compartidos por el equipo
  - Para tocar este proyecto, leer primero `cuentas_corrientes/CLAUDE.md` que tiene todo el contexto

## Reglas
- Todo debe ser usable sin conocimientos de programación
- Python como lenguaje principal
- Los scripts deben tener instrucciones claras de uso
- Preferir Excel/CSV como formato de entrada y salida
- Interfaz en español
- Las herramientas deben ser simples: arrastrar archivo, doble clic para ejecutar
- Preferir APIs directas sobre Claude in Chrome
- Guardar automáticamente en memory/ cualquier dato o decisión importante

## Estructura
- `apps/` — aplicaciones web o de escritorio
- `scripts/` — scripts de automatización
- `tools/` — herramientas CLI reutilizables
- `data/` — archivos de datos y credenciales (no se commitean)
