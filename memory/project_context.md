---
name: Contexto del proyecto Claudio
description: Carpeta base en C:\Users\maru\Documents\claudio para herramientas de automatización del negocio Tu Textil (stock, Excel, MercadoLibre, TiendaNube, Google Ads)
type: project
---

Claudio es el espacio de trabajo donde se crean herramientas para automatizar el negocio de Maru.

**Plataformas clave:**
- MercadoLibre (marketplace) — API disponible
- TiendaNube (tienda propia) — API disponible
- Google Ads (marketing/publicidad)
- Google Merchant Center (catálogo de productos en Google)
- Google Analytics (métricas web)
- Google My Business (perfil del negocio en Google)

**Pain points identificados:**
- Sincronización de stock entre plataformas (TiendaNube + MercadoLibre)
- Reformateo de Excel: tiene su Excel maestro y necesita generar otro Excel con columnas en el orden específico de TiendaNube para subidas masivas. Hoy lo hace dato por dato manualmente.
- Gestión manual de datos entre múltiples plataformas
- Calidad de anuncio de branding en Google Ads marcada como "Baja"
- Política de devolución incompleta en Merchant Center

**Decisiones técnicas:**
- Python como lenguaje principal (ideal para manipulación de Excel, APIs, automatización)
- Las herramientas deben ser usables sin conocimientos de programación
- Excel/CSV como formato preferido de entrada y salida
- Claude in Chrome solo para exploración puntual — es lento y gasta muchos tokens
- Para operaciones recurrentes: usar APIs directas (TiendaNube API, MercadoLibre API, Google APIs) via Python
- Próximo paso: crear MCPs propios para TiendaNube y MercadoLibre para interacción directa desde Claude Code
- No existen MCPs oficiales para ninguna de las plataformas del negocio (verificado 28-mar-2026)

**APIs a configurar (pendiente):**
- TiendaNube API: requiere token de acceso (crear app en Partners)
- MercadoLibre API: requiere OAuth (registrar app en developers.mercadolibre.com.ar)
- Google Sheets API: requiere credenciales de servicio o OAuth

**Why:** Maru pierde tiempo en tareas repetitivas de reformateo y sincronización manual entre plataformas.
**How to apply:** Priorizar herramientas que eliminen trabajo manual repetitivo, con interfaces simples (arrastrar archivo, doble clic para ejecutar). Todo en español.
