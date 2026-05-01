"""
Buscador de recomendaciones Full - MercadoLibre
Lee el archivo exportado y te dice cuantas unidades enviar por SKU o nombre.

PRIMERO: Exportar el CSV desde Chrome (ya está en tu carpeta Descargas)
USO: Doble clic en "Buscar Full MeLi.bat"
"""

import csv
import os
import sys
import glob

DOWNLOADS = os.path.join(os.path.expanduser("~"), "Downloads")
CSV_NAME = "planificacion_full_meli.csv"


def encontrar_csv():
    path = os.path.join(DOWNLOADS, CSV_NAME)
    if os.path.exists(path):
        return path
    # Buscar cualquier archivo con ese nombre en el escritorio también
    alternativas = glob.glob(os.path.join(os.path.expanduser("~"), "Desktop", CSV_NAME))
    if alternativas:
        return alternativas[0]
    return None


def _int(v):
    try:
        return int(v or 0)
    except (ValueError, TypeError):
        return 0


def cargar_datos(csv_path):
    productos = []
    with open(csv_path, encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            mlas = row.get("MLAs", "").strip()
            productos.append({
                "codigo_ml": row.get("Codigo ML", "").strip(),
                "sku":        row.get("SKU", "").strip(),
                "mlas":       mlas,
                "titulo":     row.get("Titulo", "").strip(),
                "variante":   row.get("Variante", "").strip(),
                "vendidos":   _int(row.get("Vendidos 30d", 0)),
                "stock":      _int(row.get("Stock y Camino", 0)),
                "recomendar": _int(row.get("Recomendar", 0)),
            })
    return productos


def buscar(productos, termino):
    t = termino.strip().upper().lstrip("MLA").lstrip("0") if termino.strip().upper().startswith("MLA") else termino.strip().upper()
    resultados = []
    for p in productos:
        # Buscar en SKU, Código ML, título y en los MLAs asociados
        mlas_norm = [m.lstrip("0") for m in p["mlas"].split("|") if m]
        if (t in p["sku"].upper() or
            t in p["codigo_ml"].upper() or
            t in p["titulo"].upper() or
            t in mlas_norm):
            resultados.append(p)
    return resultados


def mostrar_resultados(resultados, termino):
    if not resultados:
        print(f"\n  No encontré nada para '{termino}'.")
        return

    print()
    sep = "=" * 65
    print(sep)
    print(f"  Resultados para: {termino}  ({len(resultados)} variante/s)")
    print(sep)
    print(f"  {'Variante':<25} {'Vendidos':>8} {'Stock':>6} {'Enviar':>7}")
    print("  " + "-" * 50)

    total = 0
    for p in resultados:
        label = p["variante"] or p["titulo"][:25]
        enviar_str = str(p["recomendar"]) if p["recomendar"] > 0 else "ok"
        print(f"  {label:<25} {p['vendidos']:>8} {p['stock']:>6} {enviar_str:>7}")
        total += p["recomendar"]

    if len(resultados) > 1:
        print("  " + "-" * 50)
        print(f"  {'TOTAL':<25} {'':>8} {'':>6} {total:>7}")

    print(sep)
    if resultados:
        print(f"  Producto: {resultados[0]['titulo'][:60]}")
        print(f"  Código ML: {resultados[0]['codigo_ml']}")
    print(sep)


def main():
    print()
    print("=" * 65)
    print("  BUSCADOR FULL - MercadoLibre")
    print("=" * 65)
    print()

    csv_path = encontrar_csv()
    if not csv_path:
        print(f"  No encontré el archivo '{CSV_NAME}' en Descargas.")
        print()
        print("  Para generarlo:")
        print("  1. Abrí Claude Code")
        print("  2. Escribí: actualizar planificacion full")
        print()
        input("Presiona Enter para salir...")
        sys.exit(1)

    from datetime import datetime
    mod_time = datetime.fromtimestamp(os.path.getmtime(csv_path))
    print(f"  Datos del: {mod_time.strftime('%d/%m/%Y %H:%M')}")
    print(f"  Archivo:   {csv_path}")
    print()

    print("  Cargando datos...")
    productos = cargar_datos(csv_path)
    print(f"  {len(productos)} productos cargados.")

    while True:
        print()
        termino = input("  Buscar por SKU, Código ML o nombre (o 'salir'): ").strip()
        if termino.lower() in ("salir", ""):
            break

        resultados = buscar(productos, termino)
        mostrar_resultados(resultados, termino)

    print()
    print("  Hasta luego!")
    input("  Presiona Enter para cerrar...")


if __name__ == "__main__":
    main()
