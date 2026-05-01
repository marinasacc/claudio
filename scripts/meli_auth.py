"""
Configuracion de MercadoLibre API - Ejecutar UNA SOLA VEZ.
Abre el browser para autorizar y guarda el token en data/meli_token.json
"""

import webbrowser
import urllib.parse
import urllib.request
import json
import os
import sys

CLIENT_ID = "2886250865492023"      # App ID de developers.mercadolibre.com.ar
CLIENT_SECRET = "JouWcmb39uwnL7zeaZzry0ypjnpRxniW"  # Secret Key

REDIRECT_URI = "https://httpbin.org/get"
TOKEN_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data", "meli_token.json")


def get_token(code):
    data = urllib.parse.urlencode({
        "grant_type": "authorization_code",
        "client_id": CLIENT_ID,
        "client_secret": CLIENT_SECRET,
        "code": code,
        "redirect_uri": REDIRECT_URI,
    }).encode("utf-8")
    req = urllib.request.Request(
        "https://api.mercadolibre.com/oauth/token",
        data=data,
        headers={"Accept": "application/json", "Content-Type": "application/x-www-form-urlencoded"},
    )
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read().decode("utf-8"))


def extraer_codigo(url_pegada):
    """Extrae el code= de la URL que pego el usuario."""
    try:
        parsed = urllib.parse.urlparse(url_pegada)
        params = urllib.parse.parse_qs(parsed.query)
        codes = params.get("code", [])
        return codes[0] if codes else None
    except Exception:
        return None


def main():
    if not CLIENT_ID or not CLIENT_SECRET:
        print()
        print("=" * 60)
        print("  FALTA CONFIGURAR LAS CREDENCIALES")
        print("=" * 60)
        print()
        print("  Pasos (una sola vez):")
        print()
        print("  1. Ir a: https://developers.mercadolibre.com.ar/")
        print("     (iniciar sesion con tu cuenta de MercadoLibre)")
        print()
        print("  2. Hacer clic en 'Crear aplicacion'")
        print("     Nombre: Claudio (o cualquier nombre)")
        print()
        print("  3. En el campo 'URI de redireccionamiento' poner:")
        print("     https://httpbin.org/get")
        print()
        print("  4. Guardar y copiar:")
        print("     - App ID  (numero largo)")
        print("     - Secret Key")
        print()
        print("  5. Pegar esos valores en este archivo")
        print("     (lineas CLIENT_ID y CLIENT_SECRET al principio)")
        print()
        input("Presiona Enter para salir...")
        sys.exit(1)

    print()
    print("=" * 60)
    print("  MercadoLibre - Autorizacion")
    print("=" * 60)
    print()

    auth_url = (
        "https://auth.mercadolibre.com.ar/authorization"
        f"?response_type=code"
        f"&client_id={CLIENT_ID}"
        f"&redirect_uri={urllib.parse.quote(REDIRECT_URI)}"
    )

    print("Paso 1: Se va a abrir el browser.")
    print("        Inicia sesion con marina@tucumantextil.com.ar y autorizá la app.")
    print()
    input("        Presiona Enter para abrir el browser...")
    webbrowser.open(auth_url)

    print()
    print("Paso 2: Despues de autorizar, el browser va a mostrar")
    print("        una pagina con texto JSON (muchos datos).")
    print()
    print("        Busca la linea que dice: \"code\": \"TG-...")
    print("        Copia la URL completa de la barra de direcciones.")
    print("        (empieza con: https://httpbin.org/get?code=...)")
    print()

    while True:
        url_pegada = input("        Pega la URL aqui y presiona Enter: ").strip()
        code = extraer_codigo(url_pegada)
        if code:
            break
        print()
        print("        No encontre el codigo en esa URL.")
        print("        Asegurate de copiar la URL completa del browser.")
        print()

    print()
    print("Obteniendo token...")

    try:
        token = get_token(code)
        token["client_id"] = CLIENT_ID
        token["client_secret"] = CLIENT_SECRET

        os.makedirs(os.path.dirname(TOKEN_FILE), exist_ok=True)
        with open(TOKEN_FILE, "w") as f:
            json.dump(token, f, indent=2)

        print()
        print("=" * 60)
        print("  LISTO! Token guardado.")
        print("=" * 60)
        print(f"  Archivo: data/meli_token.json")
        print(f"  Usuario: {token.get('user_id')}")
        print()
        print("  Ya podes usar meli_predictor.py")
        print()

    except Exception as e:
        print(f"Error al obtener el token: {e}")
        print("Verifica que el App ID y Secret Key sean correctos.")

    input("Presiona Enter para cerrar...")


if __name__ == "__main__":
    main()
