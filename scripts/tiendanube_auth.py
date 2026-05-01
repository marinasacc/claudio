"""
Script para obtener el access_token de TiendaNube.
Ejecutar una sola vez. Abre el browser para autorizar la app.
"""

import http.server
import webbrowser
import urllib.parse
import json
import os
import sys

# Configuracion de la app
CLIENT_ID = "28096"
CLIENT_SECRET = "2e9e0e07a9893dde449edd356501f1fa7af7ee1a65795e4c"
REDIRECT_PORT = 8080
REDIRECT_URI = f"http://localhost:{REDIRECT_PORT}/callback"

# Donde guardar el token
TOKEN_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data", "tiendanube_token.json")

auth_code = None

class CallbackHandler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        global auth_code
        parsed = urllib.parse.urlparse(self.path)
        params = urllib.parse.parse_qs(parsed.query)

        if parsed.path == "/callback" and "code" in params:
            auth_code = params["code"][0]
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.end_headers()
            self.wfile.write(b"<html><body><h1>Autorizado!</h1><p>Ya podes cerrar esta ventana.</p></body></html>")
        else:
            self.send_response(400)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.end_headers()
            self.wfile.write(b"<html><body><h1>Error</h1><p>No se recibio el codigo de autorizacion.</p></body></html>")

    def log_message(self, format, *args):
        pass  # Silenciar logs del servidor


def exchange_code_for_token(code):
    """Intercambia el codigo de autorizacion por un access_token."""
    import urllib.request

    url = "https://www.tiendanube.com/apps/authorize/token"
    data = json.dumps({
        "client_id": CLIENT_ID,
        "client_secret": CLIENT_SECRET,
        "grant_type": "authorization_code",
        "code": code
    }).encode("utf-8")

    req = urllib.request.Request(url, data=data, headers={
        "Content-Type": "application/json"
    })

    with urllib.request.urlopen(req) as response:
        return json.loads(response.read().decode("utf-8"))


def main():
    print("=" * 50)
    print("  TiendaNube - Autorizacion de App")
    print("=" * 50)
    print()

    # Iniciar servidor local
    server = http.server.HTTPServer(("localhost", REDIRECT_PORT), CallbackHandler)

    # Abrir browser para autorizar
    auth_url = f"https://www.tiendanube.com/apps/{CLIENT_ID}/authorize?state=claudio"
    print(f"Abriendo el browser para autorizar la app...")
    print(f"URL: {auth_url}")
    print()
    print("Si no se abre automaticamente, copia y pega la URL en tu browser.")
    print("Esperando autorizacion...")
    print()

    webbrowser.open(auth_url)

    # Esperar el callback
    server.handle_request()
    server.server_close()

    if not auth_code:
        print("ERROR: No se recibio el codigo de autorizacion.")
        sys.exit(1)

    print(f"Codigo recibido! Intercambiando por token...")

    # Intercambiar por token
    try:
        token_data = exchange_code_for_token(auth_code)

        # Guardar token
        os.makedirs(os.path.dirname(TOKEN_FILE), exist_ok=True)
        with open(TOKEN_FILE, "w") as f:
            json.dump(token_data, f, indent=2)

        print()
        print("=" * 50)
        print("  TOKEN OBTENIDO!")
        print("=" * 50)
        print(f"  Store ID: {token_data.get('user_id')}")
        print(f"  Scope: {token_data.get('scope')}")
        print(f"  Guardado en: {TOKEN_FILE}")
        print()

    except Exception as e:
        print(f"ERROR al obtener el token: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
