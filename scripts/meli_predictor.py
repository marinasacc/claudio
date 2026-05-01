"""
Predictor de unidades para envios Full - MercadoLibre
Muestra la sugerencia por variante (color, talle, etc.)

USO:
  - Doble clic en "Predictor Full MeLi.bat"
  - Ingresar el MLA cuando lo pida (ej: 758936083)
  - Para cada variante, ingresar el stock actual en Full (Enter = 0)
  - Ver cuantas unidades enviar por variante
"""

import json
import os
import sys
import urllib.request
import urllib.parse
from datetime import datetime, timedelta, timezone

TOKEN_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data", "meli_token.json")

DIAS_HISTORIAL = 30
DIAS_A_CUBRIR  = 30
DIAS_SEGURIDAD = 0


def cargar_token():
    if not os.path.exists(TOKEN_FILE):
        print()
        print("ERROR: No encontre el token de MercadoLibre.")
        print("Primero ejecuta meli_auth.py para configurar las credenciales.")
        print()
        input("Presiona Enter para salir...")
        sys.exit(1)
    with open(TOKEN_FILE) as f:
        return json.load(f)


def api_get(path, token, params=None):
    url = f"https://api.mercadolibre.com{path}"
    if params:
        url += "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={
        "Authorization": f"Bearer {token['access_token']}",
        "Accept": "application/json",
    })
    try:
        with urllib.request.urlopen(req) as r:
            return json.loads(r.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8")
        raise Exception(f"Error API {e.code}: {body[:200]}")


def renovar_token(token):
    refresh = token.get("refresh_token", "")
    if not refresh:
        return token
    data = urllib.parse.urlencode({
        "grant_type": "refresh_token",
        "client_id": token.get("client_id", ""),
        "client_secret": token.get("client_secret", ""),
        "refresh_token": refresh,
    }).encode("utf-8")
    req = urllib.request.Request(
        "https://api.mercadolibre.com/oauth/token",
        data=data,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    try:
        with urllib.request.urlopen(req) as r:
            nuevo = json.loads(r.read().decode("utf-8"))
            nuevo["client_id"] = token.get("client_id", "")
            nuevo["client_secret"] = token.get("client_secret", "")
            with open(TOKEN_FILE, "w") as f:
                json.dump(nuevo, f, indent=2)
            return nuevo
    except Exception:
        return token


def label_variante(attributes):
    """Convierte lista de atributos en texto legible: 'Blanco / Liso'"""
    return " / ".join(a["value_name"] for a in attributes if a.get("value_name"))


def obtener_ventas_por_variante(item_id, seller_id, token):
    """
    Retorna un dict:
      { variation_id: {"label": "Blanco / Liso", "vendidos": 42} }
    y el titulo/sku del item.
    """
    fecha_desde = (
        datetime.now(timezone.utc) - timedelta(days=DIAS_HISTORIAL)
    ).strftime("%Y-%m-%dT%H:%M:%S.000-00:00")

    variantes = {}   # variation_id -> {"label": ..., "vendidos": ...}
    titulo = ""
    sku = ""
    offset = 0
    limit = 50

    while True:
        data = api_get("/orders/search", token, {
            "seller": seller_id,
            "order.status": "paid",
            "order.date_created.from": fecha_desde,
            "q": item_id,
            "limit": limit,
            "offset": offset,
        })

        results = data.get("results", [])
        if not results:
            break

        for order in results:
            for it in order.get("order_items", []):
                if it["item"]["id"] != item_id:
                    continue

                if not titulo:
                    titulo = it["item"].get("title", "")
                if not sku:
                    sku = it["item"].get("seller_custom_field") or ""

                vid = it["item"].get("variation_id")
                qty = it.get("quantity", 0)
                attrs = it["item"].get("variation_attributes", [])

                if vid:
                    if vid not in variantes:
                        variantes[vid] = {
                            "label": label_variante(attrs) or str(vid),
                            "vendidos": 0,
                        }
                    variantes[vid]["vendidos"] += qty
                else:
                    # item sin variantes
                    if "SIN_VARIANTE" not in variantes:
                        variantes["SIN_VARIANTE"] = {"label": "—", "vendidos": 0}
                    variantes["SIN_VARIANTE"]["vendidos"] += qty

        total_disponible = data.get("paging", {}).get("total", 0)
        offset += limit
        if offset >= total_disponible:
            break

    return variantes, titulo, sku


def pedir_int(prompt, default=0):
    val = input(prompt).strip()
    if val == "":
        return default
    if val.isdigit():
        return int(val)
    return default


def procesar_item(item_id, token, seller_id):
    print(f"\n  Buscando ventas de {item_id}...\n")

    variantes, titulo, sku = obtener_ventas_por_variante(item_id, seller_id, token)

    if not variantes:
        print(f"  No encontre ventas para {item_id} en los ultimos {DIAS_HISTORIAL} dias.")
        print(f"  Verificá que el MLA sea correcto.")
        return

    # Encabezado
    linea = "=" * 62
    print(linea)
    if titulo:
        t = titulo if len(titulo) <= 58 else titulo[:55] + "..."
        print(f"  {t}")
    print(f"  {item_id}", end="")
    if sku:
        print(f"  |  SKU: {sku}", end="")
    print()
    print(f"  Historial: {DIAS_HISTORIAL} dias  |  Objetivo: {DIAS_A_CUBRIR} dias de cobertura")
    print(linea)

    tiene_variantes = not ("SIN_VARIANTE" in variantes and len(variantes) == 1)

    if tiene_variantes:
        print()
        print("  Ingresa el stock actual en Full para cada variante.")
        print("  (presioná Enter si no tenes stock de esa variante)")
        print()

    # Ordenar por mas vendido
    ordenadas = sorted(variantes.items(), key=lambda x: x[1]["vendidos"], reverse=True)

    total_enviar = 0
    resultados = []

    for vid, v in ordenadas:
        vendidos = v["vendidos"]
        label    = v["label"]
        vpd      = vendidos / DIAS_HISTORIAL
        objetivo = round(vpd * (DIAS_A_CUBRIR + DIAS_SEGURIDAD))

        if tiene_variantes:
            stock    = pedir_int(f"  {label:<30}  (vendidos: {vendidos:>4})  disponible: ", default=0)
            camino   = pedir_int(f"  {'':<30}  {'':>14}  en camino:  ", default=0)
        else:
            stock    = pedir_int(f"  Stock disponible en Full (vendidos: {vendidos}): ", default=0)
            camino   = pedir_int(f"  Unidades en camino:  ", default=0)

        a_enviar = max(0, objetivo - stock - camino)
        total_enviar += a_enviar

        resultados.append({
            "label": label,
            "vendidos": vendidos,
            "vpd": round(vpd, 1),
            "objetivo": objetivo,
            "stock": stock,
            "camino": camino,
            "a_enviar": a_enviar,
        })

    # Resultado final
    print()
    print(linea)
    print(f"  RESUMEN - {item_id}")
    print(linea)

    col_label = max(len(r["label"]) for r in resultados)
    col_label = max(col_label, 8)

    header = f"  {'Variante':<{col_label}}  {'Vendidos':>8}  {'Objetivo':>8}  {'Dispon.':>7}  {'Camino':>6}  {'Enviar':>7}"
    print(header)
    print("  " + "-" * (len(header) - 2))

    for r in resultados:
        enviar_str = str(r["a_enviar"]) if r["a_enviar"] > 0 else "ok"
        print(f"  {r['label']:<{col_label}}  {r['vendidos']:>8}  {r['objetivo']:>8}  {r['stock']:>7}  {r['camino']:>6}  {enviar_str:>7}")

    print("  " + "-" * (len(header) - 2))
    print(f"  {'TOTAL':<{col_label}}  {'':>8}  {'':>8}  {'':>6}  {total_enviar:>7}")
    print(linea)


def main():
    print()
    print("=" * 62)
    print("  PREDICTOR DE ENVIOS FULL - MercadoLibre")
    print("=" * 62)
    print()

    token = cargar_token()

    print("Conectando con MercadoLibre...")
    try:
        me = api_get("/users/me", token)
        seller_id = me["id"]
        token["user_id"] = seller_id
    except Exception:
        print("Token vencido, renovando...")
        token = renovar_token(token)
        try:
            me = api_get("/users/me", token)
            seller_id = me["id"]
            token["user_id"] = seller_id
        except Exception as e:
            print(f"ERROR al conectar: {e}")
            print("Ejecuta meli_auth.py de nuevo para obtener un nuevo token.")
            input("Presiona Enter para salir...")
            sys.exit(1)

    print(f"Conectada como: {me.get('nickname')}")

    print()
    dias_cob = pedir_int(f"Dias de cobertura objetivo (Enter = 30): ", default=30)
    dias_col = pedir_int(f"Dias de colchon de seguridad  (Enter =  0): ", default=0)
    global DIAS_A_CUBRIR, DIAS_SEGURIDAD
    DIAS_A_CUBRIR  = dias_cob
    DIAS_SEGURIDAD = dias_col
    print(f"  -> Cobertura: {DIAS_A_CUBRIR} dias + {DIAS_SEGURIDAD} de colchon")

    while True:
        print()
        entrada = input("MLA a consultar (o 'salir'): ").strip().upper()
        if entrada in ("SALIR", ""):
            break

        if entrada.isdigit():
            item_id = "MLA" + entrada
        elif entrada.startswith("MLA"):
            item_id = entrada
        else:
            print("  Formato invalido. Usá el codigo MLA (ej: 758936083 o MLA758936083).")
            continue

        try:
            procesar_item(item_id, token, seller_id)
        except Exception as e:
            print(f"  Error: {e}")

        print()
        otra = input("Consultar otro MLA? (Enter = si  /  'no' = salir): ").strip().lower()
        if otra == "no":
            break

    print()
    print("Hasta luego!")
    input("Presiona Enter para cerrar...")


if __name__ == "__main__":
    main()
