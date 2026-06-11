"""
Ventas de la tienda por canal de tráfico (Google Analytics GA4).

Responde "¿qué ventas vinieron de Google Ads / orgánico / Instagram / etc.?"
cruzando las ventas REALES de la tienda con su origen de tráfico.

Requiere:
- API Google Analytics Data habilitada en el proyecto claudio-491623
- Cuenta de servicio claudio@claudio-491623.iam.gserviceaccount.com con rol Lector en la propiedad GA4
- Credenciales en data/google_credentials.json

Uso:
    python tools/ventas_por_canal.py                 # ultimos 30 dias
    python tools/ventas_por_canal.py 2026-05-12 2026-06-10   # rango especifico
"""
import sys
import os
from datetime import datetime, timedelta
from google.oauth2 import service_account
from google.analytics.data_v1beta import BetaAnalyticsDataClient
from google.analytics.data_v1beta.types import (
    RunReportRequest, DateRange, Dimension, Metric, OrderBy
)

PROPERTY_ID = '328969480'  # propiedad GA4 de Tu Textil (a107376290p328969480)
CREDS_PATH = os.path.join(os.path.dirname(__file__), '..', 'data', 'google_credentials.json')


def get_client():
    creds = service_account.Credentials.from_service_account_file(
        CREDS_PATH, scopes=['https://www.googleapis.com/auth/analytics.readonly'])
    return BetaAnalyticsDataClient(credentials=creds)


def reporte(inicio, fin):
    client = get_client()

    # 1) Por grupo de canal (visión general)
    req_canal = RunReportRequest(
        property=f'properties/{PROPERTY_ID}',
        date_ranges=[DateRange(start_date=inicio, end_date=fin)],
        dimensions=[Dimension(name='sessionDefaultChannelGroup')],
        metrics=[Metric(name='sessions'), Metric(name='transactions'), Metric(name='totalRevenue')],
        order_bys=[OrderBy(metric=OrderBy.MetricOrderBy(metric_name='totalRevenue'), desc=True)],
    )
    resp = client.run_report(req_canal)
    print(f"\n=== VENTAS POR CANAL ({inicio} a {fin}) ===")
    print(f"{'Canal':<24}{'Sesiones':>10}{'Ventas':>8}{'Ingresos':>16}")
    print('-' * 58)
    for r in resp.rows:
        canal = r.dimension_values[0].value
        ses = r.metric_values[0].value
        tx = r.metric_values[1].value
        rev = float(r.metric_values[2].value or 0)
        print(f"{canal:<24}{ses:>10}{tx:>8}{rev:>16,.0f}")

    # 2) Por fuente/medio (para aislar Google Ads = google/cpc)
    req_sm = RunReportRequest(
        property=f'properties/{PROPERTY_ID}',
        date_ranges=[DateRange(start_date=inicio, end_date=fin)],
        dimensions=[Dimension(name='sessionSourceMedium')],
        metrics=[Metric(name='sessions'), Metric(name='transactions'), Metric(name='totalRevenue')],
        order_bys=[OrderBy(metric=OrderBy.MetricOrderBy(metric_name='totalRevenue'), desc=True)],
    )
    resp_sm = client.run_report(req_sm)
    print(f"\n=== POR FUENTE / MEDIO (top 12) ===")
    print(f"{'Fuente / Medio':<34}{'Sesiones':>10}{'Ventas':>8}{'Ingresos':>16}")
    print('-' * 68)
    google_ads_rev = 0
    for r in resp_sm.rows[:12]:
        sm = r.dimension_values[0].value
        ses = r.metric_values[0].value
        tx = r.metric_values[1].value
        rev = float(r.metric_values[2].value or 0)
        marca = ''
        if sm == 'google / cpc':
            marca = '  <- GOOGLE ADS'
            google_ads_rev = rev
        print(f"{sm:<34}{ses:>10}{tx:>8}{rev:>16,.0f}{marca}")

    print(f"\n>>> GOOGLE ADS (google/cpc): ${google_ads_rev:,.0f} en ventas reales de la tienda")


if __name__ == '__main__':
    if len(sys.argv) >= 3:
        inicio, fin = sys.argv[1], sys.argv[2]
    else:
        hoy = datetime.now()
        fin = hoy.strftime('%Y-%m-%d')
        inicio = (hoy - timedelta(days=30)).strftime('%Y-%m-%d')
    reporte(inicio, fin)
