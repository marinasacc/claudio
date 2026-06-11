---
name: Google Ads - Análisis y seguimiento
description: Campañas activas, métricas, decisiones y plan de optimización
type: reference
---

## Cuenta: 160-816-7156

## Snapshot 22-may-2026 (período 22 abr - 21 may)

### Totales cuenta (30 días)
- Impresiones: 103.173
- Clics: 4.184
- Coste total: $356.290
- Conversiones: 10
- Valor conversiones: $1.870.140
- ROAS general: 5,25
- CPC medio: $85,16
- Coste/conversión: $35.629

### Campañas habilitadas

#### 1. trafico sitio web (PMax) — PRINCIPAL
- Presupuesto: $7.045/día → **SUBIDO A $9.000/día el 22-may-2026**
- Estrategia: Maximizar valor de conversiones
- Impresiones: 100.210 | Clics: 3.462 | CTR: 3,45%
- CPC: $60,30
- Conversiones: 6 | Tasa: 0,15%
- Valor conversiones: $907.230
- ROAS: 4,35
- Coste/conversión: $34.795
- Estado: limitada por presupuesto
- **Concentra 59% del gasto y 60% de las conversiones**

#### 2. Intención BRAND TU TEXTIL - marina 120922 (Search)
- Presupuesto: $3.500/día (sin cambios por ahora, revisar semana que viene)
- Estrategia: Cuota de impresiones objetivo
- Impresiones: 1.771 | Clics: 628 | CTR: 35,46%
- CPC: $162
- Conversiones: 3 | Tasa: 0,48%
- Valor conversiones: $718.960
- ROAS: 7,07
- Coste/conversión: $33.913
- Estado: limitada por presupuesto + algunos anuncios limitados por política

#### 3. INSTITUCIONAL 17032026 (Search) — **PAUSADA el 22-may-2026**
- Presupuesto era: $1.500/día
- Estrategia: Maximizar conversiones
- CPC: $487 (muy caro)
- Solo 94 clics y 1 conversión en 30 días
- Coste/conversión: $45.780
- **Motivo de pausa: CPC altísimo, bajo volumen, peor rendimiento que PMax**

### Campañas en pausa (ya estaban)
- HOTELES E INSTITUCIONES (Buscar, $2.000/día)
- AMBOS (PMax, $7.034/día)
- Prueba Maximo rendmiento 230225 (PMax, $10.000/día)

### Campañas retiradas
- 48 campañas retiradas (históricas, sin actividad)

## Decisiones tomadas 22-may-2026
1. **Pausar INSTITUCIONAL 17032026** — CPC de $487, solo 1 conversión, quema plata
2. **Subir PMax "trafico sitio web"** de $7.045 → $9.000/día — mejor rendimiento, estaba limitada por presupuesto
3. **BRAND se deja en $3.500/día** — revisar la semana que viene si conviene bajar

## Plan de seguimiento
- **Semana del 29-may-2026**: Maru pasa nuevo export CSV de Google Ads
  - Verificar si ROAS de PMax se mantiene arriba de 4 con el nuevo presupuesto
  - Si ROAS se mantiene → subir a $11.000/día
  - Si ROAS baja → volver a $9.000 o ajustar
  - Evaluar si bajar BRAND de $3.500 a $1.500-2.000/día
- Subir presupuesto gradual (20-30% por semana), no de golpe

## Snapshot 10-jun-2026 (período 12 may - 10 jun)

### Totales cuenta (30 días)
- Impresiones: 96.047
- Clics: 4.034
- Coste total: $318.540
- Conversiones: 9,99 (~10)
- Valor conversiones: $1.978.336
- ROAS general: 6,21 (subió desde 5,25)
- CPC medio: $78,96
- Coste/conversión: $31.892
- **MEJORÓ vs 22-may: gastó -11%, vendió +6%, ROAS +18%. Las decisiones del 22-may funcionaron.**

### Campañas habilitadas
1. **trafico sitio web (PMax)** — $8.805/día
   - Impr 94.154 | Clics 3.489 | CTR 3,71% | CPC $64,47
   - Conversiones 7,83 | Valor $1.491.582 | **ROAS 6,63** (subió desde 4,35)
   - Coste $224.923 | Coste/conv $28.730
   - **YA NO está limitada por presupuesto** (gasta ~$7.500/día de $9.000 → tiene aire)
   - Concentra 70% del gasto y 75% del valor de conversiones
2. **BRAND TU TEXTIL** (Search) — $3.500/día
   - Impr 1.566 | Clics 510 | CTR 32,57% | CPC $154,76
   - Conversiones 2,16 | Valor $486.753 | ROAS 6,17 (bajó desde 7,07)
   - Sigue limitada por presupuesto (38,76% impr perdidas por presup.)
   - Bajó respecto al mes anterior pero sigue rentable

### Campañas en pausa
- INSTITUCIONAL 17032026: confirmado bien pausada. Antes de pausar (tramo 12-22 may) gastó $14.690 con 0 conversiones.
- AMBOS (PMax), HOTELES E INSTITUCIONES, Prueba Maximo rendimiento (siguen en pausa)

### Cruce con ventas reales (GA4) — 10-jun-2026
- Google Ads se auto-atribuía: $1.978.336
- Google Analytics (ventas reales tienda, google/cpc): $1.901.155 con 9 ventas
- **Coinciden (~4% de diferencia) → el tracking está bien, los números de Ads son confiables**
- ROAS real ≈ $1.901.155 / $318.541 ≈ 6,0
- Panorama de canales (12may-10jun): Google Ads $1,90M | Orgánico Google (gratis) $1,27M | Instagram Ads $334k | Directo $167k
- Para reconsultar: `python tools/ventas_por_canal.py <inicio> <fin>`

### Decisión / recomendación 10-jun-2026
- **NO subir PMax a $11.000** aunque ROAS sea 6,63: ya no está limitada por presupuesto (gasta $7.500 de $9.000). Subir el techo no haría nada si no lo está tocando. Mantener $9.000.
- BRAND: rindió menos este mes (ROAS 7,07→6,17). Sigue rentable. Mantener $3.500 y observar; el plan previo de bajarla a $2.000 queda en stand-by.
- Próximo chequeo: ver si PMax vuelve a tocar el techo de presupuesto. Si lo toca Y mantiene ROAS alto, ahí sí subir.

## Historial de análisis
- 14-may-2026: Primer análisis, se recomendó bajar campaña de $3.000 a $1.500
- 22-may-2026: Segundo análisis con export CSV, se pausó INSTITUCIONAL y subió PMax a $9.000
- 10-jun-2026: Tercer análisis. Cuenta mejoró (ROAS 5,25→6,21). PMax voló (ROAS 4,35→6,63) y dejó de estar limitada por presupuesto. Recomendación: no subir presupuestos, mantener.
