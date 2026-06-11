"""
Estado de las campañas de Google Ads — SIN la API de Google Ads.

Saca costo, clics, impresiones, ventas, ingresos y ROAS de cada campaña
de Google Ads directamente desde Google Analytics (GA4), que ya está
vinculado a la cuenta de Google Ads. Reemplaza el export CSV manual.

Datos:
- COSTO / clics / impresiones: vienen de Google Ads (exactos, vía el vínculo Ads<->GA4)
- VENTAS / ingresos / ROAS: atribución REAL de la tienda (modelo de GA4)
  (puede diferir de la auto-atribución de Google Ads, que suele ser más optimista)

Limitaciones (para esto sí hay que mirar el panel de Google Ads):
- No trae "% impresiones perdidas por presupuesto" (métrica exclusiva de Google Ads)
- No permite CAMBIAR presupuestos ni pausar (eso se hace en el panel web)

Uso:
    python tools/google_ads_campanas.py                      # ultimos 30 dias
    python tools/google_ads_campanas.py 2026-05-12 2026-06-10
"""
import sys
import os
from datetime import datetime, timedelta
from google.oauth2 import service_account
from google.analytics.data_v1beta import BetaAnalyticsDataClient
from google.analytics.data_v1beta.types import (
    RunReportRequest, DateRange, Dimension, Metric, OrderBy
)

PROPERTY_ID = '328969480'
CREDS_PATH = os.path.join(os.path.dirname(__file__), '..', 'data', 'google_credentials.json')


def get_client():
    creds = service_account.Credentials.from_service_account_file(
        CREDS_PATH, scopes=['https://www.googleapis.com/auth/analytics.readonly'])
    return BetaAnalyticsDataClient(credentials=creds)


def reporte(inicio, fin):
    client = get_client()
    req = RunReportRequest(
        property=f'properties/{PROPERTY_ID}',
        date_ranges=[DateRange(start_date=inicio, end_date=fin)],
        dimensions=[Dimension(name='sessionGoogleAdsCampaignName')],
        metrics=[
            Metric(name='advertiserAdCost'),
            Metric(name='advertiserAdClicks'),
            Metric(name='advertiserAdImpressions'),
            Metric(name='advertiserAdCostPerClick'),
            Metric(name='transactions'),
            Metric(name='totalRevenue'),
            Metric(name='returnOnAdSpend'),
        ],
        order_bys=[OrderBy(metric=OrderBy.MetricOrderBy(metric_name='advertiserAdCost'), desc=True)],
    )
    resp = client.run_report(req)

    print(f"\n=== CAMPAÑAS GOOGLE ADS ({inicio} a {fin}) ===")
    print("(costo/clics = datos de Google Ads | ventas/ROAS = atribución real de la tienda)\n")
    print(f"{'Campaña':<38}{'Costo':>11}{'Clics':>7}{'Impres.':>9}{'CPC':>7}{'Ventas':>7}{'Ingresos':>13}{'ROAS':>6}")
    print('-' * 98)

    tot_costo = tot_clics = tot_impr = tot_tx = tot_rev = 0
    for r in resp.rows:
        camp = r.dimension_values[0].value
        if camp in ('(not set)', '(organic)'):
            # Ventas que GA4 no pudo asignar a una campaña específica de Ads
            continue
        costo = float(r.metric_values[0].value or 0)
        clics = int(float(r.metric_values[1].value or 0))
        impr = int(float(r.metric_values[2].value or 0))
        cpc = float(r.metric_values[3].value or 0)
        tx = int(float(r.metric_values[4].value or 0))
        rev = float(r.metric_values[5].value or 0)
        roas = float(r.metric_values[6].value or 0)
        if costo == 0 and rev == 0:
            continue
        tot_costo += costo; tot_clics += clics; tot_impr += impr
        tot_tx += tx; tot_rev += rev
        print(f"{camp[:36]:<38}{costo:>11,.0f}{clics:>7}{impr:>9,}{cpc:>7,.0f}{tx:>7}{rev:>13,.0f}{roas:>6.2f}")

    roas_tot = (tot_rev / tot_costo) if tot_costo else 0
    print('-' * 98)
    print(f"{'TOTAL':<38}{tot_costo:>11,.0f}{tot_clics:>7}{tot_impr:>9,}{'':>7}{tot_tx:>7}{tot_rev:>13,.0f}{roas_tot:>6.2f}")
    print(f"\nROAS total (ingresos tienda / costo Ads): {roas_tot:.2f}  →  ${roas_tot:,.2f} de venta por cada $1 gastado")


if __name__ == '__main__':
    if len(sys.argv) >= 3:
        inicio, fin = sys.argv[1], sys.argv[2]
    else:
        hoy = datetime.now()
        fin = hoy.strftime('%Y-%m-%d')
        inicio = (hoy - timedelta(days=30)).strftime('%Y-%m-%d')
    reporte(inicio, fin)
