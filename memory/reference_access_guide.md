---
name: Guía de acceso a plataformas de Tu Textil
description: Cómo acceder a cada plataforma desde Claude Code — APIs configuradas, credenciales, URLs
type: reference
---

## APIs CONFIGURADAS Y FUNCIONANDO

### 1. TiendaNube API ✅ ACTIVA
- **Método**: API REST directa (NO usar Claude in Chrome)
- **Store ID**: 858478
- **Token**: guardado en `C:\Users\maru\Documents\claudio\data\tiendanube_token.json`
- **App**: "Actualizar stock - Marina" (app_id: 28096)
- **Scope**: write_products (leer y escribir productos/stock)
- **Ejemplo de uso en Python**:
```python
import json, urllib.request
with open('C:/Users/maru/Documents/claudio/data/tiendanube_token.json') as f:
    token = json.load(f)
url = f"https://api.tiendanube.com/v1/{token['user_id']}/products?per_page=50"
req = urllib.request.Request(url, headers={
    'Authentication': f"bearer {token['access_token']}",
    'User-Agent': 'Claudio (marina@tucumantextil.com.ar)'
})
```
- **Endpoints útiles**:
  - GET /products — listar productos
  - GET /products?q=SKU — buscar por SKU
  - PUT /products/{id}/variants/{variant_id} — actualizar stock/precio
  - Total productos: 998

### 2. Google Sheets API ✅ ACTIVA
- **Método**: API REST con cuenta de servicio (NO usar Claude in Chrome)
- **Credenciales**: `C:\Users\maru\Documents\claudio\data\google_credentials.json`
- **Cuenta de servicio**: claudio@claudio-491623.iam.gserviceaccount.com
- **Proyecto Google Cloud**: claudio-491623
- **Ejemplo de uso en Python**:
```python
from google.oauth2 import service_account
from googleapiclient.discovery import build
SCOPES = ['https://www.googleapis.com/auth/spreadsheets']
creds = service_account.Credentials.from_service_account_file(
    'C:/Users/maru/Documents/claudio/data/google_credentials.json', scopes=SCOPES)
service = build('sheets', 'v4', credentials=creds)
```
- **Sheets conectados**:
  - Stock Tu Textil: `10gyg3GgtGgbUx2HHUmGs6W6v5sIIU3lXBULgs_AL79o`
    - Pestaña "Productos": SKU + Nombre + Variante (2573 filas)
    - Pestaña "Registros": movimientos de stock de empleados

### 3. MercadoLibre API ❌ PENDIENTE
- **Acceso público**: WebFetch a https://www.mercadolibre.com.ar/pagina/tutextilhogaryhotel
- **API**: Requiere OAuth — pendiente de configurar en developers.mercadolibre.com.ar

## APIs CONFIGURADAS (continuación)

### Google Analytics Data API (GA4) ✅ ACTIVA (configurada 10-jun-2026)
- **Método**: API REST con la MISMA cuenta de servicio que Sheets
- **Property ID GA4**: 328969480 (de a107376290p328969480)
- **Credenciales**: `data/google_credentials.json` (cuenta claudio@claudio-491623.iam.gserviceaccount.com con rol Lector en la propiedad)
- **API habilitada** en proyecto claudio-491623 + cuenta de servicio agregada como Lector en GA4 Admin
- **Librería**: `pip install google-analytics-data`
- **Script listo**: `tools/ventas_por_canal.py` — ventas de la tienda por canal/fuente
  - `python tools/ventas_por_canal.py` → últimos 30 días
  - `python tools/ventas_por_canal.py 2026-05-12 2026-06-10` → rango específico
- **Para aislar Google Ads**: dimensión `sessionSourceMedium` = "google / cpc"
  - OJO: en grupo de canal, PMax cae en "Cross-network" y BRAND Search en "Paid Search";
    "Paid Social" = Instagram/Facebook Ads (Meta), NO Google. Por eso conviene usar source/medium.
- **Métricas útiles**: sessions, transactions, totalRevenue, purchaseRevenue
- **Dimensiones útiles**: sessionDefaultChannelGroup, sessionSourceMedium, sessionCampaignName

### Google Ads — datos vía GA4 ✅ (NO hace falta la API de Google Ads)
- Google Ads ESTÁ vinculado a GA4, así que las métricas de campañas (costo, clics,
  impresiones, CPC, ventas, ingresos, ROAS) salen de la API GA4 ya configurada.
- **NO se configuró la API oficial de Google Ads** (evita el trámite del developer token).
- **Script listo**: `tools/google_ads_campanas.py` — estado de campañas de Google Ads
  - `python tools/google_ads_campanas.py 2026-05-12 2026-06-10`
- Costo/clics/impresiones = exactos (vienen de Ads). Ventas/ROAS = atribución real de la tienda.
- **Lo que GA4 NO da** (para eso, panel web de Google Ads o CSV ocasional):
  - "% impresiones perdidas por presupuesto" (saber si una campaña está limitada por presupuesto)
  - Cambiar presupuestos / pausar campañas (decisiones que toma Maru en el panel)
- Dimensiones Ads en GA4: sessionGoogleAdsCampaignName, googleAdsCampaignId, etc.
- Métricas Ads en GA4: advertiserAdCost, advertiserAdClicks, advertiserAdImpressions,
  advertiserAdCostPerClick, returnOnAdSpend

## PLATAFORMAS GOOGLE (solo via Claude in Chrome)

### 4. Google Analytics (panel web)
- **URL directa**: https://analytics.google.com/analytics/web/#/a107376290p328969480/reports/intelligenthome
- **ID propiedad**: a107376290p328969480
- (Para datos: usar la API GA4 de arriba, más rápido)

### 5. Google Ads
- **URL directa**: https://ads.google.com/nav/login?ocid=232988373&uscid=232988373
- **ID cuenta**: 160-816-7156, ocid: 232988373

### 6. Google Merchant Center
- **URL directa**: https://merchants.google.com/mc/overview?a=720109441
- **ID cuenta**: 720109441

### 7. Google My Business
- **Método**: Navegar a https://business.google.com
- **Nombre**: "Tu Textil -Tucumán Textil"

## NOTAS
- Preferir APIs directas sobre Claude in Chrome (más rápido, menos tokens)
- Plataformas Google sin API configurada: usar Claude in Chrome solo para exploración puntual
- Cuenta Google principal: marina@tucumantextil.com.ar
