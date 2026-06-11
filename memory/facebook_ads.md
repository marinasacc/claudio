---
name: Facebook Ads - Tu Textil
description: Estado de campañas de Meta Ads, análisis y cambios aplicados (snapshot 14-may-2026)
type: project
originSessionId: 1eae279f-2dba-4b72-a6f0-2388b2325d0d
---
## Cuenta
- Pixel: Píxel de Tutextil 2022 ok — ID: 380871255968921
- GA4 conectado: G-SF6705R5FB
- Sesión: marina@tucumantextil.com.ar

## Campañas activas (período 23 abr - 13 may 2026)

### "retargeting octubre 02 2025" ✅ La mejor
- Conjunto: "Audiencias calientes"
- Gasto: $64.775 ARS | Compras: 7 | CPA: $9.253 | Presupuesto: $3.000/día
- Frecuencia: 3.25 (atención — audiencia acercándose a saturación)
- Anuncio activo: "Nuevo anuncio de Ventas" — calidad Promedio, interacción Por encima del promedio
- Anuncio pausado: "Fabricamos todo lo que ves" (pausado, gastó $640)

### "VENTAS- REELS DIVERTIDOS" 🟡 En desarrollo
- Conjunto: "REELS IG" (desde 24-abr-2026)
- Gasto: $60.950 ARS | Compras: 3 | CPA: $20.317 | Presupuesto: $3.000/día
- CTR: 7.25% (excelente) | Frecuencia: 1.83 (sana)
- Anuncio: "Envasado al vacio" — calidad Promedio, interacción Por encima del promedio
- Tendencia: 0 compras en primeros 7 días → 3 compras en 21 días (mejorando)

### "Nueva campaña de Ventas" ❌ PAUSADA (14-may-2026)
- Conjunto: "Nuevo conjunto de anuncios de Ventas" (desde 30-dic-2025)
- Gasto: $53.415 ARS | Compras: 2 | CPA: $26.707 | Presupuesto: $2.500/día
- Motivo de pausa: 5 meses activa con CPA consistentemente alto, público frío que no convierte

## Total cuenta (21 días: 23 abr - 13 may)
- Gasto: $179.140 ARS | Compras: 12 | CPA promedio: $14.928

## Cambios aplicados
- 24-abr-2026: ✅ Creada campaña "REELS IG" con reel "Envasado al vacio"
- 14-may-2026: ✅ Pausada "Nueva campaña de Ventas" (CPA $26.707, 5 meses sin mejorar)
- 14-may-2026: ✅ "Fabricamos todo lo que ves" ya inactivo

## Pendiente
- Semana del 21-may: revisar si "REELS DIVERTIDOS" sigue sumando compras
- Evaluar subir presupuesto del reel de $3.000 a $5.000/día si CPA baja
- Monitorear frecuencia del retargeting (3.25 → si supera 4, renovar audiencia o creativos)
- Revisar catálogo: 873 productos sin aprobación para anuncios (Administrador de Ventas)
- Crear campaña Advantage+ Shopping cuando se resuelva el catálogo

## Configuración API de Meta (EN PROGRESO — retomar acá) — 10-jun-2026
Objetivo: conectar la Marketing API de Meta para traer costo/clics/ROAS de campañas
(las VENTAS de Meta ya se ven vía GA4: ~$333.645 en ig/paid + facebook/paid, último período).
GA4 NO da el costo de Meta (Meta no lo comparte con GA4), por eso hace falta la API de Meta.

### Hecho ✅
- App creada en developers.facebook.com: **"Claudio Tu Textil"** (caso de uso "Marketing API")
- Usuario del sistema creado: **"Claudio API"** (rol Employee, identificador 61590482892267)
  - en Business Manager Tutextil y BencasHome
  - Nota: el negocio ya tenía 1 admin del sistema (máx), por eso Claudio API es Employee

### Falta ⏳ (próxima sesión)
1. Asignar la APP "Claudio Tu Textil" al usuario del sistema "Claudio API"
   - Business Settings > Usuarios del sistema > Claudio API > Agregar activos > Apps >
     tildar "Claudio Tu Textil" > activar "Administrar app" > Guardar
   - (El error "No hay permisos disponibles" al generar token = falta este paso)
2. Verificar que también tenga asignada la CUENTA PUBLICITARIA (permiso "Ver rendimiento")
3. Generar token: Generar token nuevo > app Claudio Tu Textil > permiso **ads_read** > Generar
   - El token empieza con EAA... (copiarlo, no se vuelve a mostrar)
4. Conseguir el AD ACCOUNT ID: Business Settings > Cuentas publicitarias > anotar el número
5. Maru pasa TOKEN + AD ACCOUNT ID → guardar en data/meta_token.json (gitignored)
6. Claude escribe script tools/meta_ads_campanas.py (Graph API, endpoint /insights)
   - Métricas: spend, clicks, impressions, actions (compras), purchase_roas, cpc, frequency

### Permiso necesario
- Solo lectura: **ads_read**. No hace falta admin ni "administrar campañas", con "ver rendimiento" alcanza.

## Reel usado como creativo
- URL: https://www.instagram.com/reel/DXetyD2DdJO/
- Contenido: acolchados hoteleros envasados al vacío, tono humorístico
- URL destino: tutextil.com.ar/hoteleria-institucional/
- UTM: utm_source=facebook&utm_medium=paid&utm_campaign=retargeting_acolchado
