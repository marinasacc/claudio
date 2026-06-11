"""
App de Pedidos Coteminas - Flask local
Gestión de pedidos mensuales para el proveedor Coteminas.

Uso:
    python app.py
    Abrir http://localhost:5050 en el navegador
"""
import os
import io
import re
from datetime import datetime
from flask import (
    Flask, render_template, request, redirect, url_for,
    flash, jsonify, send_file
)
from models import get_db, init_db

app = Flask(__name__)
app.secret_key = 'pedidos-coteminas-tutextil-2026'

MESES = {
    1: 'Enero', 2: 'Febrero', 3: 'Marzo', 4: 'Abril',
    5: 'Mayo', 6: 'Junio', 7: 'Julio', 8: 'Agosto',
    9: 'Septiembre', 10: 'Octubre', 11: 'Noviembre', 12: 'Diciembre'
}

CATEGORIAS_ORDEN = [
    'toalla', 'toallon', 'toallon_grande', 'juego', 'piso',
    'visita', 'toallita', 'bata', 'repasador',
    'sabana', 'funda', 'almohada', 'colcha',
    'acolchado', 'protector', 'mantel', 'camino', 'cortina', 'cubre',
]

CATEGORIAS_DISPLAY = {
    'toalla': 'Toallas',
    'toallon': 'Toallones',
    'toallon_grande': 'Toallones Grandes',
    'juego': 'Juegos',
    'piso': 'Toalla Piso',
    'visita': 'Toalla Visita',
    'toallita': 'Toallitas',
    'bata': 'Batas',
    'repasador': 'Repasadores',
    'sabana': 'Sábanas',
    'funda': 'Fundas',
    'almohada': 'Almohadas',
    'colcha': 'Colchas',
    'acolchado': 'Acolchados',
    'protector': 'Protectores',
    'mantel': 'Manteles',
    'camino': 'Caminos',
    'cortina': 'Cortinas',
    'cubre': 'Cubre',
}


# Keywords para detectar la categoría de un item manual a partir de su descripción.
# Orden importa: las más específicas primero (ej "TOALLON G" antes de "TOALLON").
CATEGORIA_KEYWORDS = [
    ('REPASADOR', 'repasador'),
    ('TOALLON G', 'toallon_grande'),
    ('TOALLON', 'toallon'),
    ('TOALLÓN', 'toallon'),
    ('TOALLA PISO', 'piso'),
    ('TOALLITA', 'toallita'),
    ('PISO', 'piso'),
    ('TOALLA', 'toalla'),
    ('JUEGO', 'juego'),
    ('JGO', 'juego'),
    ('BATA', 'bata'),
    ('VISITA', 'visita'),
    ('SABANA', 'sabana'),
    ('SÁBANA', 'sabana'),
    ('ALMOHADA', 'almohada'),
    ('FUNDA', 'funda'),
    ('COLCHA', 'colcha'),
    ('ACOLCHADO', 'acolchado'),
    ('PROTECTOR', 'protector'),
    ('MANTEL', 'mantel'),
    ('CAMINO', 'camino'),
    ('CORTINA', 'cortina'),
    ('CUBRE', 'cubre'),
]


def detectar_categoria_desc(descripcion):
    """Detectar la categoría de un item a partir de su descripción.
    Devuelve la categoría o None si no se reconoce."""
    if not descripcion:
        return None
    desc_upper = descripcion.upper()
    # Primero por inicio de la descripción (más confiable)
    for keyword, cat in CATEGORIA_KEYWORDS:
        if desc_upper.startswith(keyword):
            return cat
    # Luego por aparición en cualquier parte
    for keyword, cat in CATEGORIA_KEYWORDS:
        if keyword in desc_upper:
            return cat
    return None


@app.template_filter('mes_nombre')
def mes_nombre_filter(mes):
    return MESES.get(mes, str(mes))


@app.template_filter('cat_display')
def cat_display_filter(cat):
    return CATEGORIAS_DISPLAY.get(cat, cat.title() if cat else 'Otro')


def _etiqueta_tipo_pedido(pedido):
    """Devuelve 'Total' o 'Parcial N' para un pedido.
    Los parciales se numeran según el orden de creación dentro del mismo mes/año."""
    if pedido['tipo'] == 'total':
        return 'Total'
    # Parcial: numerar según cuántos parciales del mismo mes/año hay hasta este (inclusive)
    conn = get_db()
    parciales = conn.execute("""
        SELECT id FROM pedidos
        WHERE tipo = 'parcial' AND mes = ? AND anio = ?
        ORDER BY created_at, id
    """, (pedido['mes'], pedido['anio'])).fetchall()
    conn.close()
    ids = [r['id'] for r in parciales]
    try:
        num = ids.index(pedido['id']) + 1
    except ValueError:
        num = len(ids) + 1
    return f'Parcial {num}'


@app.template_filter('etiqueta_tipo')
def etiqueta_tipo_filter(pedido):
    return _etiqueta_tipo_pedido(pedido)


@app.template_filter('fecha_legible')
def fecha_legible_filter(fecha):
    """Convierte 'YYYY-MM-DD' (o timestamp) a 'DD/MM/YYYY'."""
    if not fecha:
        return ''
    try:
        f = str(fecha)[:10]  # tomar solo YYYY-MM-DD
        partes = f.split('-')
        if len(partes) == 3:
            return f"{partes[2]}/{partes[1]}/{partes[0]}"
    except Exception:
        pass
    return str(fecha)


# ── PÁGINA PRINCIPAL ─────────────────────────────────────────────────

@app.route('/')
def index():
    """Dashboard principal con pedidos recientes."""
    conn = get_db()
    pedidos = conn.execute("""
        SELECT p.*,
            (SELECT COUNT(*) FROM pedido_items WHERE pedido_id = p.id AND destino='tucuman') as items_tucuman,
            (SELECT COUNT(*) FROM pedido_items WHERE pedido_id = p.id AND destino='alsina') as items_alsina,
            (SELECT SUM(cantidad) FROM pedido_items WHERE pedido_id = p.id AND destino='tucuman') as total_tucuman,
            (SELECT SUM(cantidad) FROM pedido_items WHERE pedido_id = p.id AND destino='alsina') as total_alsina
        FROM pedidos p
        ORDER BY p.anio DESC, p.mes DESC, p.created_at DESC
    """).fetchall()
    conn.close()
    return render_template('index.html', pedidos=pedidos, meses=MESES)


# ── PEDIDOS ──────────────────────────────────────────────────────────

@app.route('/pedido/nuevo', methods=['GET', 'POST'])
def nuevo_pedido():
    """Crear un nuevo pedido."""
    if request.method == 'POST':
        mes = int(request.form['mes'])
        anio = int(request.form['anio'])
        tipo = request.form.get('tipo', 'total')
        fecha_pedido = request.form.get('fecha_pedido', '').strip() or datetime.now().strftime('%Y-%m-%d')
        notas = request.form.get('notas', '').strip()

        conn = get_db()
        cursor = conn.execute(
            "INSERT INTO pedidos (mes, anio, tipo, estado, fecha_pedido, notas) VALUES (?, ?, ?, 'sin_finalizar', ?, ?)",
            (mes, anio, tipo, fecha_pedido, notas)
        )
        pedido_id = cursor.lastrowid
        conn.commit()
        conn.close()

        flash(f'Pedido {MESES[mes]} {anio} creado', 'success')
        return redirect(url_for('editar_pedido', pedido_id=pedido_id))

    now = datetime.now()
    return render_template('nuevo_pedido.html',
                           meses=MESES,
                           anio_actual=now.year,
                           mes_actual=now.month,
                           fecha_hoy=now.strftime('%Y-%m-%d'))


@app.route('/pedido/<int:pedido_id>')
def editar_pedido(pedido_id):
    """Pantalla principal de edición de un pedido."""
    conn = get_db()
    pedido = conn.execute("SELECT * FROM pedidos WHERE id = ?", (pedido_id,)).fetchone()
    if not pedido:
        flash('Pedido no encontrado', 'error')
        return redirect(url_for('index'))

    # Items del pedido agrupados por destino
    items_tucuman = conn.execute("""
        SELECT pi.*, p.descripcion as prod_descripcion, COALESCE(p.categoria, pi.categoria_manual) as prod_categoria,
               p.linea as prod_linea, p.ean as prod_ean,
               p.sku_tu_textil as prod_sku, p.mla_ids as prod_mla
        FROM pedido_items pi
        LEFT JOIN productos p ON pi.producto_id = p.id
        WHERE pi.pedido_id = ? AND pi.destino = 'tucuman'
        ORDER BY p.categoria, p.linea, p.descripcion
    """, (pedido_id,)).fetchall()

    items_alsina = conn.execute("""
        SELECT pi.*, p.descripcion as prod_descripcion, COALESCE(p.categoria, pi.categoria_manual) as prod_categoria,
               p.linea as prod_linea, p.ean as prod_ean,
               p.sku_tu_textil as prod_sku, p.mla_ids as prod_mla
        FROM pedido_items pi
        LEFT JOIN productos p ON pi.producto_id = p.id
        WHERE pi.pedido_id = ? AND pi.destino = 'alsina'
        ORDER BY p.categoria, p.linea, p.descripcion
    """, (pedido_id,)).fetchall()

    # Categorías disponibles en el catálogo
    categorias = conn.execute("""
        SELECT DISTINCT categoria FROM productos WHERE estado='activo' ORDER BY categoria
    """).fetchall()

    conn.close()

    return render_template('editar_pedido.html',
                           pedido=pedido,
                           items_tucuman=items_tucuman,
                           items_alsina=items_alsina,
                           categorias=categorias,
                           categorias_display=CATEGORIAS_DISPLAY,
                           meses=MESES)


@app.route('/pedido/<int:pedido_id>/estado', methods=['POST'])
def cambiar_estado_pedido(pedido_id):
    """Cambiar estado del pedido (sin_finalizar <-> finalizado)."""
    conn = get_db()
    pedido = conn.execute("SELECT * FROM pedidos WHERE id = ?", (pedido_id,)).fetchone()
    if not pedido:
        flash('Pedido no encontrado', 'error')
        return redirect(url_for('index'))

    nuevo_estado = request.form.get('estado', 'sin_finalizar')
    cerrado_at = datetime.now().isoformat() if nuevo_estado == 'finalizado' else None

    conn.execute("""
        UPDATE pedidos SET estado = ?, cerrado_at = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    """, (nuevo_estado, cerrado_at, pedido_id))
    conn.commit()
    conn.close()

    if nuevo_estado == 'finalizado':
        flash('Pedido marcado como FINALIZADO', 'success')
    else:
        flash('Pedido marcado como SIN FINALIZAR (podés seguir agregando)', 'info')

    return redirect(url_for('editar_pedido', pedido_id=pedido_id))


@app.route('/pedido/<int:pedido_id>/editar-info', methods=['POST'])
def editar_info_pedido(pedido_id):
    """Editar mes, año y tipo de un pedido existente."""
    conn = get_db()
    pedido = conn.execute("SELECT * FROM pedidos WHERE id = ?", (pedido_id,)).fetchone()
    if not pedido:
        flash('Pedido no encontrado', 'error')
        return redirect(url_for('index'))

    mes = int(request.form.get('mes', pedido['mes']))
    anio = int(request.form.get('anio', pedido['anio']))
    tipo = request.form.get('tipo', pedido['tipo'])
    fecha_pedido = request.form.get('fecha_pedido', '').strip() or pedido['fecha_pedido']
    notas = request.form.get('notas', pedido['notas'] or '').strip()

    conn.execute("""
        UPDATE pedidos SET mes = ?, anio = ?, tipo = ?, fecha_pedido = ?, notas = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    """, (mes, anio, tipo, fecha_pedido, notas, pedido_id))
    conn.commit()
    conn.close()

    flash('Datos del pedido actualizados', 'success')
    return redirect(url_for('editar_pedido', pedido_id=pedido_id))


@app.route('/pedido/<int:pedido_id>/eliminar', methods=['POST'])
def eliminar_pedido(pedido_id):
    """Eliminar un pedido y todos sus items."""
    conn = get_db()
    conn.execute("DELETE FROM pedido_items WHERE pedido_id = ?", (pedido_id,))
    conn.execute("DELETE FROM confirmacion_items WHERE confirmacion_id IN (SELECT id FROM confirmaciones WHERE pedido_id = ?)", (pedido_id,))
    conn.execute("DELETE FROM confirmaciones WHERE pedido_id = ?", (pedido_id,))
    conn.execute("DELETE FROM pedidos WHERE id = ?", (pedido_id,))
    conn.commit()
    conn.close()
    flash('Pedido eliminado', 'info')
    return redirect(url_for('index'))


# ── CATÁLOGO / BÚSQUEDA DE PRODUCTOS ─────────────────────────────────

@app.route('/api/productos')
def api_productos():
    """API para buscar productos del catálogo. Usado por AJAX."""
    q = request.args.get('q', '').strip()
    categoria = request.args.get('categoria', '').strip()
    linea = request.args.get('linea', '').strip()
    limit = int(request.args.get('limit', 50))

    conn = get_db()
    conditions = ["estado = 'activo'"]
    params = []

    if q:
        # Buscar en descripción, código, EAN, SKU interno y MLA
        conditions.append("(descripcion LIKE ? OR codigo LIKE ? OR ean LIKE ? OR sku_tu_textil LIKE ? OR mla_ids LIKE ?)")
        like = f"%{q}%"
        params.extend([like, like, like, like, like])

    if categoria:
        conditions.append("categoria = ?")
        params.append(categoria)

    if linea:
        conditions.append("linea = ?")
        params.append(linea)

    where = " AND ".join(conditions)
    rows = conn.execute(f"""
        SELECT id, codigo, descripcion, categoria, linea, diseno,
               color_nombre, color_codigo, ean, tamanio, fuente,
               sku_tu_textil, mla_ids
        FROM productos
        WHERE {where}
        ORDER BY categoria, linea, descripcion
        LIMIT ?
    """, params + [limit]).fetchall()

    conn.close()
    return jsonify([dict(r) for r in rows])


@app.route('/api/lineas')
def api_lineas():
    """Obtener líneas disponibles, opcionalmente filtradas por categoría."""
    categoria = request.args.get('categoria', '').strip()
    conn = get_db()
    if categoria:
        rows = conn.execute("""
            SELECT DISTINCT linea FROM productos
            WHERE estado='activo' AND categoria=? AND linea IS NOT NULL
            ORDER BY linea
        """, (categoria,)).fetchall()
    else:
        rows = conn.execute("""
            SELECT DISTINCT linea FROM productos
            WHERE estado='activo' AND linea IS NOT NULL
            ORDER BY linea
        """).fetchall()
    conn.close()
    return jsonify([r['linea'] for r in rows])


@app.route('/api/familias')
def api_familias():
    """Obtener familias (agrupaciones por categoría+línea+diseño) para selección agrupada.
    Devuelve familias con la cantidad de colores/variantes disponibles."""
    q = request.args.get('q', '').strip()
    categoria = request.args.get('categoria', '').strip()
    linea = request.args.get('linea', '').strip()

    conn = get_db()
    conditions = ["estado = 'activo'"]
    params = []

    if q:
        conditions.append("(descripcion LIKE ? OR codigo LIKE ? OR ean LIKE ? OR sku_tu_textil LIKE ? OR mla_ids LIKE ?)")
        like = f"%{q}%"
        params.extend([like, like, like, like, like])
    if categoria:
        conditions.append("categoria = ?")
        params.append(categoria)
    if linea:
        conditions.append("linea = ?")
        params.append(linea)

    where = " AND ".join(conditions)

    # Agrupar por SKU interno + categoría + línea + diseño (sin color)
    # Cada familia abarca todos los colores de un mismo modelo.
    rows = conn.execute(f"""
        SELECT categoria, linea, diseno, sku_tu_textil, mla_ids,
               COUNT(*) as variantes,
               GROUP_CONCAT(DISTINCT color_nombre) as colores,
               MIN(id) as primer_id
        FROM productos
        WHERE {where} AND diseno IS NOT NULL
        GROUP BY categoria, linea, diseno, sku_tu_textil
        HAVING COUNT(*) > 1
        ORDER BY categoria, linea, diseno
        LIMIT 40
    """, params).fetchall()

    conn.close()

    familias = []
    for r in rows:
        colores_list = [c for c in (r['colores'].split(',') if r['colores'] else []) if c]
        cat_display = CATEGORIAS_DISPLAY.get(r['categoria'], r['categoria'] or '')
        nombre = f"{cat_display} {r['linea'] or ''} {r['diseno'] or ''}".strip()
        familias.append({
            'nombre': nombre,
            'categoria': r['categoria'],
            'linea': r['linea'],
            'diseno': r['diseno'],
            'sku_tu_textil': r['sku_tu_textil'],
            'mla_ids': r['mla_ids'],
            'variantes': r['variantes'],
            'colores': colores_list,
            'colores_str': ', '.join(colores_list),
        })

    return jsonify(familias)


# ── ITEMS DEL PEDIDO ─────────────────────────────────────────────────

@app.route('/pedido/<int:pedido_id>/agregar', methods=['POST'])
def agregar_item(pedido_id):
    """Agregar item(s) al pedido. Soporta múltiples items vía JSON."""
    conn = get_db()
    pedido = conn.execute("SELECT * FROM pedidos WHERE id = ?", (pedido_id,)).fetchone()
    if not pedido:
        return jsonify({'error': 'Pedido no encontrado'}), 404

    # Detectar si viene como JSON (multi-item) o form (legacy single)
    if request.is_json:
        items = request.get_json()
        if not isinstance(items, list):
            items = [items]

        count = 0
        for item_data in items:
            es_manual = item_data.get('es_manual', False)
            destino = item_data.get('destino', 'tucuman')
            cantidad = int(item_data.get('cantidad', 0))
            color_detalle = item_data.get('color_detalle', '').strip()
            notas = item_data.get('notas', '').strip()

            if es_manual:
                desc = item_data.get('descripcion_manual', '').strip()
                codigo = item_data.get('codigo_manual', '').strip()
                cat_manual = (item_data.get('categoria_manual') or '').strip() or None
                # Si no vino categoría, intentar detectarla de la descripción
                if not cat_manual:
                    cat_manual = detectar_categoria_desc(desc)
                es_familia = 1 if item_data.get('es_familia') else 0
                if desc:
                    conn.execute("""
                        INSERT INTO pedido_items (pedido_id, destino, cantidad, color_detalle, notas,
                                                  es_manual, descripcion_manual, codigo_manual,
                                                  categoria_manual, es_familia)
                        VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?, ?)
                    """, (pedido_id, destino, cantidad, color_detalle, notas, desc, codigo,
                          cat_manual, es_familia))
                    count += 1
            else:
                producto_id = item_data.get('producto_id')
                if producto_id:
                    conn.execute("""
                        INSERT INTO pedido_items (pedido_id, producto_id, destino, cantidad,
                                                  color_detalle, notas)
                        VALUES (?, ?, ?, ?, ?, ?)
                    """, (pedido_id, int(producto_id), destino, cantidad, color_detalle, notas))
                    count += 1

        conn.execute("UPDATE pedidos SET updated_at = CURRENT_TIMESTAMP WHERE id = ?", (pedido_id,))
        conn.commit()
        conn.close()
        return jsonify({'ok': True, 'count': count})

    # Fallback: form POST (single item, legacy)
    es_manual = request.form.get('es_manual') == '1'
    destino = request.form.get('destino', 'tucuman')
    cantidad = int(request.form.get('cantidad', 0))
    color_detalle = request.form.get('color_detalle', '').strip()
    notas = request.form.get('notas', '').strip()

    if es_manual:
        descripcion_manual = request.form.get('descripcion_manual', '').strip()
        codigo_manual = request.form.get('codigo_manual', '').strip()
        categoria_manual = (request.form.get('categoria_manual') or '').strip() or None
        # Si no eligió categoría, detectarla de la descripción
        if not categoria_manual:
            categoria_manual = detectar_categoria_desc(descripcion_manual)
        if not descripcion_manual:
            return jsonify({'error': 'Descripción requerida para item manual'}), 400

        conn.execute("""
            INSERT INTO pedido_items (pedido_id, destino, cantidad, color_detalle, notas,
                                      es_manual, descripcion_manual, codigo_manual, categoria_manual)
            VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?)
        """, (pedido_id, destino, cantidad, color_detalle, notas,
              descripcion_manual, codigo_manual, categoria_manual))
    else:
        producto_id = request.form.get('producto_id')
        if not producto_id:
            return jsonify({'error': 'Producto requerido'}), 400

        conn.execute("""
            INSERT INTO pedido_items (pedido_id, producto_id, destino, cantidad,
                                      color_detalle, notas)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (pedido_id, int(producto_id), destino, cantidad, color_detalle, notas))

    conn.execute("UPDATE pedidos SET updated_at = CURRENT_TIMESTAMP WHERE id = ?", (pedido_id,))
    conn.commit()
    conn.close()

    flash('Item agregado', 'success')
    return redirect(url_for('editar_pedido', pedido_id=pedido_id))


@app.route('/pedido/<int:pedido_id>/item/<int:item_id>/editar', methods=['POST'])
def editar_item(pedido_id, item_id):
    """Editar un item del pedido."""
    conn = get_db()
    cantidad = int(request.form.get('cantidad', 0))
    color_detalle = request.form.get('color_detalle', '').strip()
    notas = request.form.get('notas', '').strip()
    destino = request.form.get('destino')
    # categoria_manual: solo se aplica a items manuales (los del catálogo usan la del producto)
    categoria_manual = request.form.get('categoria_manual')

    updates = ["cantidad = ?", "color_detalle = ?", "notas = ?"]
    params = [cantidad, color_detalle, notas]

    if destino:
        updates.append("destino = ?")
        params.append(destino)

    if categoria_manual is not None:
        cat_val = categoria_manual.strip() or None
        # Si quedó vacío (Detectar automáticamente), deducir de la descripción del item
        if not cat_val:
            row = conn.execute(
                "SELECT descripcion_manual FROM pedido_items WHERE id = ? AND pedido_id = ?",
                (item_id, pedido_id)
            ).fetchone()
            if row and row['descripcion_manual']:
                cat_val = detectar_categoria_desc(row['descripcion_manual'])
        updates.append("categoria_manual = ?")
        params.append(cat_val)

    params.extend([item_id, pedido_id])
    conn.execute(f"""
        UPDATE pedido_items SET {', '.join(updates)}
        WHERE id = ? AND pedido_id = ?
    """, params)

    conn.execute("UPDATE pedidos SET updated_at = CURRENT_TIMESTAMP WHERE id = ?", (pedido_id,))
    conn.commit()
    conn.close()
    flash('Item actualizado', 'success')
    return redirect(url_for('editar_pedido', pedido_id=pedido_id))


@app.route('/pedido/<int:pedido_id>/item/<int:item_id>/eliminar', methods=['POST'])
def eliminar_item(pedido_id, item_id):
    """Eliminar un item del pedido."""
    conn = get_db()
    conn.execute("DELETE FROM pedido_items WHERE id = ? AND pedido_id = ?", (item_id, pedido_id))
    conn.execute("UPDATE pedidos SET updated_at = CURRENT_TIMESTAMP WHERE id = ?", (pedido_id,))
    conn.commit()
    conn.close()
    flash('Item eliminado', 'info')
    return redirect(url_for('editar_pedido', pedido_id=pedido_id))


# ── RESUMEN DEL PEDIDO ───────────────────────────────────────────────

@app.route('/pedido/<int:pedido_id>/resumen')
def resumen_pedido(pedido_id):
    """Resumen detallado del pedido por depósito."""
    conn = get_db()
    pedido = conn.execute("SELECT * FROM pedidos WHERE id = ?", (pedido_id,)).fetchone()
    if not pedido:
        flash('Pedido no encontrado', 'error')
        return redirect(url_for('index'))

    resumen = {}
    for destino in ['tucuman', 'alsina']:
        items = conn.execute("""
            SELECT pi.*, p.descripcion as prod_descripcion, COALESCE(p.categoria, pi.categoria_manual) as prod_categoria,
                   p.linea as prod_linea, p.ean as prod_ean, p.diseno as prod_diseno,
                   p.color_nombre as prod_color
            FROM pedido_items pi
            LEFT JOIN productos p ON pi.producto_id = p.id
            WHERE pi.pedido_id = ? AND pi.destino = ?
            ORDER BY p.categoria, p.linea, p.descripcion
        """, (pedido_id, destino)).fetchall()

        # Agrupar por categoría
        por_categoria = {}
        total_unidades = 0
        for item in items:
            cat = item['prod_categoria'] if item['prod_categoria'] else 'manual'
            if cat not in por_categoria:
                por_categoria[cat] = {'items': [], 'subtotal': 0}
            por_categoria[cat]['items'].append(item)
            por_categoria[cat]['subtotal'] += item['cantidad'] or 0
            total_unidades += item['cantidad'] or 0

        # Ordenar categorías
        categorias_ordenadas = {}
        for cat in CATEGORIAS_ORDEN + ['manual']:
            if cat in por_categoria:
                categorias_ordenadas[cat] = por_categoria[cat]
        # Agregar las que no están en el orden
        for cat in por_categoria:
            if cat not in categorias_ordenadas:
                categorias_ordenadas[cat] = por_categoria[cat]

        resumen[destino] = {
            'items': items,
            'por_categoria': categorias_ordenadas,
            'total_unidades': total_unidades,
            'total_items': len(items),
        }

    # Confirmaciones
    confirmaciones = conn.execute("""
        SELECT * FROM confirmaciones WHERE pedido_id = ? ORDER BY fecha_confirmacion DESC
    """, (pedido_id,)).fetchall()

    conn.close()

    return render_template('resumen.html',
                           pedido=pedido,
                           resumen=resumen,
                           confirmaciones=confirmaciones,
                           meses=MESES,
                           categorias_display=CATEGORIAS_DISPLAY)


# ── EXPORTAR EXCEL ───────────────────────────────────────────────────

@app.route('/pedido/<int:pedido_id>/exportar')
def exportar_excel(pedido_id):
    """Exportar pedido a Excel con formato apilado (Alsina arriba, Tucumán abajo)."""
    import openpyxl
    from openpyxl.styles import Font, Alignment, PatternFill, Border, Side

    conn = get_db()
    pedido = conn.execute("SELECT * FROM pedidos WHERE id = ?", (pedido_id,)).fetchone()
    if not pedido:
        flash('Pedido no encontrado', 'error')
        return redirect(url_for('index'))

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = f"Pedido {MESES[pedido['mes']]} {pedido['anio']}"[:31]

    # Estilos
    cat_font = Font(bold=True, size=11)
    cat_fill = PatternFill(start_color='D9E1F2', end_color='D9E1F2', fill_type='solid')
    thin_border = Border(
        left=Side(style='thin'), right=Side(style='thin'),
        top=Side(style='thin'), bottom=Side(style='thin')
    )
    wrap_align = Alignment(wrap_text=True, vertical='top')

    # Anchos de columna: MLA | SKU | Descripción | Colores | Cantidad | Detalle
    ws.column_dimensions['A'].width = 20  # MLA
    ws.column_dimensions['B'].width = 14  # SKU
    ws.column_dimensions['C'].width = 48  # Descripción
    ws.column_dimensions['D'].width = 18  # Colores
    ws.column_dimensions['E'].width = 12  # Cantidad
    ws.column_dimensions['F'].width = 50  # Detalle

    sub_headers = ['MLA', 'SKU', 'DESCRIPCIÓN', 'COLORES', 'CANTIDAD', 'DETALLE']

    # Lookup SKU -> MLA (para items manuales de familias que guardan el SKU como código)
    sku_mla = {}
    for r in conn.execute("""
        SELECT DISTINCT sku_tu_textil, mla_ids FROM productos
        WHERE sku_tu_textil IS NOT NULL AND mla_ids IS NOT NULL AND mla_ids != ''
    """).fetchall():
        sku_mla[r['sku_tu_textil']] = r['mla_ids']

    # Obtener items por categoría para cada destino
    def get_items_por_cat(destino):
        items = conn.execute("""
            SELECT pi.*, p.descripcion as prod_descripcion, COALESCE(p.categoria, pi.categoria_manual) as prod_categoria,
                   p.linea as prod_linea, p.ean as prod_ean, p.codigo as prod_codigo,
                   p.color_nombre as prod_color, p.sku_tu_textil as prod_sku,
                   p.mla_ids as prod_mla
            FROM pedido_items pi
            LEFT JOIN productos p ON pi.producto_id = p.id
            WHERE pi.pedido_id = ? AND pi.destino = ?
            ORDER BY p.categoria, p.linea, p.descripcion
        """, (pedido_id, destino)).fetchall()

        por_cat = {}
        for item in items:
            cat = item['prod_categoria'] if item['prod_categoria'] else 'manual'
            por_cat.setdefault(cat, []).append(item)
        return por_cat

    def escribir_seccion(row_num, titulo, color_hex, cats_dict):
        """Escribe una sección completa (un depósito) en forma vertical.
        Devuelve (siguiente_fila, total_unidades)."""
        # Título del depósito
        ws.merge_cells(start_row=row_num, start_column=1, end_row=row_num, end_column=6)
        c = ws.cell(row=row_num, column=1, value=titulo)
        c.font = Font(bold=True, size=14, color='FFFFFF')
        c.fill = PatternFill(start_color=color_hex, end_color=color_hex, fill_type='solid')
        c.alignment = Alignment(horizontal='center')
        row_num += 1

        # Sub-headers
        for i, h in enumerate(sub_headers):
            cell = ws.cell(row=row_num, column=i + 1, value=h)
            cell.font = Font(bold=True, size=10)
            cell.border = thin_border
        row_num += 1

        # Categorías presentes en este depósito
        cats = [c for c in (CATEGORIAS_ORDEN + ['manual']) if c in cats_dict]
        total = 0
        for cat in cats:
            cat_name = CATEGORIAS_DISPLAY.get(cat, cat.title()).upper()
            ws.merge_cells(start_row=row_num, start_column=1, end_row=row_num, end_column=6)
            cc = ws.cell(row=row_num, column=1, value=cat_name)
            cc.font = cat_font
            cc.fill = cat_fill
            row_num += 1

            for item in cats_dict[cat]:
                if item['es_manual']:
                    sku_m = item['codigo_manual'] or ''
                    ws.cell(row=row_num, column=1, value=sku_mla.get(sku_m, ''))
                    ws.cell(row=row_num, column=2, value=sku_m)
                    ws.cell(row=row_num, column=3, value=item['descripcion_manual'] or '')
                else:
                    ws.cell(row=row_num, column=1, value=item['prod_mla'] or '')
                    ws.cell(row=row_num, column=2, value=item['prod_sku'] or item['prod_codigo'] or '')
                    ws.cell(row=row_num, column=3, value=item['prod_descripcion'] or '')
                ws.cell(row=row_num, column=4, value=item['color_detalle'] or '')
                ws.cell(row=row_num, column=5, value=item['cantidad'] or 0)
                ws.cell(row=row_num, column=6, value=item['notas'] or '')
                # Bordes + wrap en detalle/colores
                for col in range(1, 7):
                    cell = ws.cell(row=row_num, column=col)
                    cell.border = thin_border
                    if col in (4, 6):
                        cell.alignment = wrap_align
                total += item['cantidad'] or 0
                row_num += 1

        # Total del depósito
        ws.cell(row=row_num, column=4, value='TOTAL:').font = Font(bold=True, size=12)
        tcell = ws.cell(row=row_num, column=5, value=total)
        tcell.font = Font(bold=True, size=12)
        row_num += 1
        return row_num, total

    alsina_cats = get_items_por_cat('alsina')
    tucuman_cats = get_items_por_cat('tucuman')

    # ── Título general con mes/tipo/fecha ──
    tipo_label = _etiqueta_tipo_pedido(pedido)
    ws.merge_cells('A1:F1')
    titulo = f"PEDIDO COTEMINAS — {MESES[pedido['mes']]} {pedido['anio']} — {tipo_label}"
    ws['A1'] = titulo
    ws['A1'].font = Font(bold=True, size=13)
    ws['A1'].alignment = Alignment(horizontal='center')

    ws.merge_cells('A2:F2')
    fecha_txt = fecha_legible_filter(pedido['fecha_pedido'])
    ws['A2'] = f"Fecha del pedido: {fecha_txt}" if fecha_txt else ""
    ws['A2'].font = Font(size=11, italic=True)
    ws['A2'].alignment = Alignment(horizontal='center')

    # ── ALSINA arriba, TUCUMÁN abajo ──
    row = 4
    row, total_alsina = escribir_seccion(row, 'ALSINA - ALBERTO', '2F5496', alsina_cats)
    row += 2  # Espacio entre depósitos
    row, total_tucuman = escribir_seccion(row, 'TUCUMÁN - SERGIO', '548235', tucuman_cats)

    conn.close()

    # Guardar a buffer
    buffer = io.BytesIO()
    wb.save(buffer)
    buffer.seek(0)

    # Nombre del archivo: PEDIDO COTEMINAS - Septiembre 2026 - Total / Parcial N
    filename = f"PEDIDO COTEMINAS - {MESES[pedido['mes']]} {pedido['anio']} - {tipo_label}.xlsx"
    return send_file(
        buffer,
        as_attachment=True,
        download_name=filename,
        mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )


# ── CONFIRMACIONES ───────────────────────────────────────────────────

@app.route('/pedido/<int:pedido_id>/confirmacion', methods=['POST'])
def agregar_confirmacion(pedido_id):
    """Pegar texto del email de confirmación del proveedor."""
    conn = get_db()
    texto = request.form.get('texto_email', '').strip()
    notas = request.form.get('notas', '').strip()

    if not texto:
        flash('Pegá el texto del email de confirmación', 'warning')
        return redirect(url_for('resumen_pedido', pedido_id=pedido_id))

    cursor = conn.execute("""
        INSERT INTO confirmaciones (pedido_id, texto_email, notas)
        VALUES (?, ?, ?)
    """, (pedido_id, texto, notas))
    conf_id = cursor.lastrowid

    # Intentar parsear el email: buscar productos mencionados
    # Por ahora guardar el texto crudo, el parseo se puede mejorar
    conn.commit()
    conn.close()

    flash('Confirmación guardada', 'success')
    return redirect(url_for('resumen_pedido', pedido_id=pedido_id))


# ── HISTORIAL ────────────────────────────────────────────────────────

@app.route('/historial')
def historial():
    """Ver historial de todos los pedidos."""
    conn = get_db()
    pedidos = conn.execute("""
        SELECT p.*,
            (SELECT SUM(cantidad) FROM pedido_items WHERE pedido_id = p.id AND destino='tucuman') as total_tucuman,
            (SELECT SUM(cantidad) FROM pedido_items WHERE pedido_id = p.id AND destino='alsina') as total_alsina,
            (SELECT SUM(cantidad) FROM pedido_items WHERE pedido_id = p.id) as total_general
        FROM pedidos p
        ORDER BY p.anio DESC, p.mes DESC, p.created_at DESC
    """).fetchall()
    conn.close()
    return render_template('historial.html', pedidos=pedidos, meses=MESES)


# ── CATÁLOGO COMPLETO ────────────────────────────────────────────────

@app.route('/catalogo')
def catalogo():
    """Ver el catálogo completo de productos."""
    conn = get_db()
    categoria = request.args.get('categoria', '')
    linea = request.args.get('linea', '')
    q = request.args.get('q', '')

    conditions = ["estado = 'activo'"]
    params = []

    if q:
        conditions.append("(descripcion LIKE ? OR codigo LIKE ? OR ean LIKE ?)")
        like = f"%{q}%"
        params.extend([like, like, like])
    if categoria:
        conditions.append("categoria = ?")
        params.append(categoria)
    if linea:
        conditions.append("linea = ?")
        params.append(linea)

    where = " AND ".join(conditions)
    productos = conn.execute(f"""
        SELECT * FROM productos WHERE {where}
        ORDER BY categoria, linea, descripcion
        LIMIT 500
    """, params).fetchall()

    categorias = conn.execute("""
        SELECT DISTINCT categoria FROM productos WHERE estado='activo' ORDER BY categoria
    """).fetchall()

    lineas = conn.execute("""
        SELECT DISTINCT linea FROM productos WHERE estado='activo' AND linea IS NOT NULL ORDER BY linea
    """).fetchall()

    conn.close()
    return render_template('catalogo.html',
                           productos=productos,
                           categorias=categorias,
                           lineas=lineas,
                           filtro_categoria=categoria,
                           filtro_linea=linea,
                           filtro_q=q,
                           categorias_display=CATEGORIAS_DISPLAY)


if __name__ == '__main__':
    init_db()
    print("\n" + "=" * 50)
    print("  PEDIDOS COTEMINAS - Tu Textil")
    print("  Abrir: http://localhost:5050")
    print("=" * 50 + "\n")
    app.run(debug=True, port=5050, use_reloader=False)
