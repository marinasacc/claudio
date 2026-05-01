"""
Sincronizador de stock MercadoLibre
Lee la hoja PendientesMeLi del Google Sheet y actualiza el stock en MeLi.

USO: Doble clic en "Sync MeLi.bat"
"""

import json
import time
import urllib.request
import urllib.parse
import urllib.error

SHEET_ID = '10gyg3GgtGgbUx2HHUmGs6W6v5sIIU3lXBULgs_AL79o'
CREDENTIALS_FILE = 'C:/Users/maru/Documents/claudio/data/google_credentials.json'
TOKEN_FILE = 'C:/Users/maru/Documents/claudio/data/meli_token.json'


def get_sheets_service():
    from google.oauth2 import service_account
    from googleapiclient.discovery import build
    creds = service_account.Credentials.from_service_account_file(
        CREDENTIALS_FILE,
        scopes=['https://www.googleapis.com/auth/spreadsheets']
    )
    return build('sheets', 'v4', credentials=creds)


def cargar_token():
    with open(TOKEN_FILE) as f:
        return json.load(f)


def refrescar_token(token_data):
    data = urllib.parse.urlencode({
        'grant_type': 'refresh_token',
        'client_id': token_data['client_id'],
        'client_secret': token_data['client_secret'],
        'refresh_token': token_data['refresh_token']
    }).encode()
    req = urllib.request.Request('https://api.mercadolibre.com/oauth/token', data=data, method='POST')
    req.add_header('Content-Type', 'application/x-www-form-urlencoded')
    with urllib.request.urlopen(req) as r:
        nuevo = json.load(r)
    token_data.update(nuevo)
    with open(TOKEN_FILE, 'w') as f:
        json.dump(token_data, f, indent=2)
    print('  Token MeLi refrescado.')
    return token_data


def actualizar_stock_meli(mla_id, variation_id, stock, access_token):
    url = f'https://api.mercadolibre.com/items/{mla_id}'
    if variation_id:
        payload = json.dumps({'variations': [{'id': int(variation_id), 'available_quantity': stock}]})
    else:
        payload = json.dumps({'available_quantity': stock})

    req = urllib.request.Request(url, data=payload.encode(), method='PUT')
    req.add_header('Authorization', f'Bearer {access_token}')
    req.add_header('Content-Type', 'application/json')

    try:
        with urllib.request.urlopen(req) as r:
            return True, 'OK'
    except urllib.error.HTTPError as e:
        return False, e.read().decode()[:300]


def main():
    print()
    print('=' * 55)
    print('  SYNC STOCK → MERCADOLIBRE')
    print('=' * 55)

    service = get_sheets_service()
    sheets = service.spreadsheets()

    result = sheets.values().get(
        spreadsheetId=SHEET_ID,
        range='PendientesMeLi!A:H'
    ).execute()
    rows = result.get('values', [])

    pendientes = [
        (i + 2, row)
        for i, row in enumerate(rows[1:])
        if len(row) >= 7 and row[6] == 'PENDIENTE'
    ]

    if not pendientes:
        print('\n  Sin pendientes — todo al día.')
        print()
        input('  Presioná Enter para cerrar...')
        return

    print(f'\n  {len(pendientes)} pendiente(s) para actualizar.\n')

    token_data = cargar_token()
    actualizados = 0
    errores = 0
    updates = []

    for fila_num, row in pendientes:
        mla_id = row[3].strip()
        variation_id = row[4].strip() if len(row) > 4 else ''
        try:
            stock = int(float(row[5]))
        except (ValueError, IndexError):
            stock = 0
        sku = row[1]
        variante = row[2] if len(row) > 2 else ''

        label = f'{mla_id}' + (f' var {variation_id}' if variation_id else '')
        print(f'  {sku} ({variante}) → {label} = {stock} uds')

        success, resp = actualizar_stock_meli(mla_id, variation_id, stock, token_data['access_token'])

        # Si el token expiró, refrescar y reintentar
        if not success and '"unauthorized"' in resp.lower():
            token_data = refrescar_token(token_data)
            success, resp = actualizar_stock_meli(mla_id, variation_id, stock, token_data['access_token'])

        if success:
            print(f'    ✓ OK')
            updates.append({'range': f'PendientesMeLi!G{fila_num}:H{fila_num}', 'values': [['OK', 'Actualizado']]})
            actualizados += 1
        else:
            print(f'    ✗ ERROR: {resp[:100]}')
            updates.append({'range': f'PendientesMeLi!G{fila_num}:H{fila_num}', 'values': [['ERROR', resp[:200]]]})
            errores += 1

        time.sleep(0.3)

    if updates:
        sheets.values().batchUpdate(
            spreadsheetId=SHEET_ID,
            body={'valueInputOption': 'RAW', 'data': updates}
        ).execute()

    print()
    print('=' * 55)
    print(f'  Resultado: {actualizados} OK, {errores} con error')
    print('=' * 55)
    print()
    input('  Presioná Enter para cerrar...')


if __name__ == '__main__':
    main()
