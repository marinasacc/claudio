"""
Parser de emails de confirmación/facturación de Coteminas.

Extrae de un email pegado: depósito (por cliente), factura, remito,
nro de pedido del proveedor, fechas y la lista de productos con cantidades.

El destino se deduce del nombre del cliente facturado:
  - SACCAL ALBERTO  -> alsina
  - SACCAL SERGIO   -> tucuman
"""
import re


def _num_ar(texto):
    """Convierte un número en formato argentino ('6.207,04' / '102,00') a float."""
    if not texto:
        return None
    t = texto.strip().replace('.', '').replace(',', '.')
    try:
        return float(t)
    except ValueError:
        return None


def detectar_destino(texto):
    """Deduce el depósito a partir del cliente facturado.
      SACCAL ALBERTO -> alsina   |   SACCAL SERGIO -> tucuman
    Devuelve (destino|None, cliente). None = no se pudo determinar (que elija a mano).
    """
    # 1. Buscar la línea del Cliente facturado (no "Estimado Cliente,")
    cliente = ''
    for m in re.finditer(r'^\s*Cliente\b[:\t ]*(.+)$', texto, re.IGNORECASE | re.MULTILINE):
        cand = m.group(1).strip()
        if cand and not cand.startswith(',') and 'SACCAL' in cand.upper():
            cliente = cand
            break
    cliente_up = cliente.upper()

    # 2. Decidir por el nombre en la línea Cliente (lo más confiable)
    if 'ALBERTO' in cliente_up and 'SERGIO' not in cliente_up:
        return 'alsina', cliente
    if 'SERGIO' in cliente_up and 'ALBERTO' not in cliente_up:
        return 'tucuman', cliente

    # 3. Fallback: buscar "SACCAL ALBERTO/SERGIO" en todo el texto
    nombres = set(n.upper() for n in re.findall(r'SACCAL\s+(ALBERTO|SERGIO)', texto, re.IGNORECASE))
    if nombres == {'ALBERTO'}:
        return 'alsina', cliente or 'SACCAL ALBERTO'
    if nombres == {'SERGIO'}:
        return 'tucuman', cliente or 'SACCAL SERGIO'

    # 4. Ambiguo (aparecen los dos, ej dos emails pegados) o no encontrado
    return None, cliente


def parse_email(texto):
    """Parsea el email y devuelve un dict con cabecera + items.

    Devuelve:
        {
          'destino': 'alsina'|'tucuman'|None,
          'cliente': str,
          'factura': str, 'remito': str, 'pedido_proveedor': str,
          'fecha_emision': 'dd/mm/aaaa'|None,
          'fecha_vencimiento': 'dd/mm/aaaa'|None,
          'valor_total': float|None,
          'items': [ {codigo, descripcion, cantidad, valor_unit, valor_total} ],
        }
    """
    res = {
        'destino': None, 'cliente': '',
        'factura': None, 'remito': None, 'pedido_proveedor': None,
        'fecha_emision': None, 'fecha_vencimiento': None,
        'valor_total': None, 'items': [],
    }

    res['destino'], res['cliente'] = detectar_destino(texto)

    # Cabecera
    m = re.search(r'Factura\s+0*(\d+)', texto, re.IGNORECASE)
    if m: res['factura'] = m.group(1)
    m = re.search(r'REMITO\s+0*(\d+)', texto, re.IGNORECASE)
    if m: res['remito'] = m.group(1)
    m = re.search(r'Pedido\s+n[o°.]*\.?\s*0*(\d+)', texto, re.IGNORECASE)
    if m: res['pedido_proveedor'] = m.group(1)
    m = re.search(r'Emisi[oó]n\s+(\d{2}/\d{2}/\d{4})', texto, re.IGNORECASE)
    if m: res['fecha_emision'] = m.group(1)
    m = re.search(r'Vencimiento[:\s]+(\d{2}/\d{2}/\d{4})', texto, re.IGNORECASE)
    if m: res['fecha_vencimiento'] = m.group(1)
    m = re.search(r'Valor\s+Total\s+([\d.,]+)', texto, re.IGNORECASE)
    if m: res['valor_total'] = _num_ar(m.group(1))

    # Productos
    # Patrón: línea que empieza con CÓDIGO (>=6 alfanum en mayúscula) + tab/espacios + descripción.
    # Luego, en las siguientes líneas no vacías: (UN), cantidad, valor unit, valor total.
    lineas = [l.rstrip() for l in texto.splitlines()]
    re_codigo = re.compile(r'^([A-Z0-9]{6,})\s*\t\s*(.+?)\s*\t?\s*$')
    re_codigo_alt = re.compile(r'^([A-Z]{2,}\d[A-Z0-9]{3,})\s+(.+?)\s*$')  # sin tab
    re_num = re.compile(r'^[\d.]+,\d{2}$')  # 102,00 / 6.207,04

    i = 0
    n = len(lineas)
    while i < n:
        linea = lineas[i].strip()
        m = re_codigo.match(lineas[i]) or re_codigo_alt.match(linea)
        if m:
            codigo = m.group(1).strip()
            descripcion = m.group(2).strip()
            # Recolectar los siguientes números (saltando "UN" y vacías)
            nums = []
            j = i + 1
            while j < n and len(nums) < 3:
                t = lineas[j].strip()
                if not t:
                    j += 1
                    continue
                if t.upper() == 'UN' or t.upper() == 'UNID' or t.upper().startswith('UN '):
                    j += 1
                    continue
                if re_num.match(t):
                    nums.append(t)
                    j += 1
                    continue
                # Si aparece otro código u otra cosa, cortar
                break
            if nums:
                cantidad = _num_ar(nums[0]) if len(nums) >= 1 else None
                vunit = _num_ar(nums[1]) if len(nums) >= 2 else None
                vtotal = _num_ar(nums[2]) if len(nums) >= 3 else None
                res['items'].append({
                    'codigo': codigo,
                    'descripcion': descripcion,
                    'cantidad': int(cantidad) if cantidad is not None else None,
                    'valor_unit': vunit,
                    'valor_total': vtotal,
                })
                i = j
                continue
        i += 1

    return res


if __name__ == '__main__':
    import sys
    txt = sys.stdin.read()
    r = parse_email(txt)
    print('Destino:', r['destino'], '| Cliente:', r['cliente'])
    print('Factura:', r['factura'], '| Remito:', r['remito'], '| Pedido prov:', r['pedido_proveedor'])
    print('Emisión:', r['fecha_emision'], '| Vencimiento:', r['fecha_vencimiento'])
    print('Valor total:', r['valor_total'])
    print(f'\nItems ({len(r["items"])}):')
    for it in r['items']:
        print(f"  {it['codigo']:<20} {it['descripcion']:<40} cant={it['cantidad']}")
