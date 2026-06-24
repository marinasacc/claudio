"""
Modelos de base de datos para Pedidos Coteminas.
SQLite con sqlite3 puro (sin ORM).
"""
import sqlite3
import os
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(__file__), 'data', 'pedidos.db')


def get_db():
    """Obtener conexión a la base de datos.
    timeout=15 hace que espere si la DB está bloqueada en vez de fallar al instante.
    """
    conn = sqlite3.connect(DB_PATH, timeout=15)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    conn.execute("PRAGMA busy_timeout=15000")
    return conn


def init_db():
    """Crear todas las tablas."""
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = get_db()
    conn.executescript("""
        -- Catálogo de productos del proveedor
        CREATE TABLE IF NOT EXISTS productos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            codigo TEXT NOT NULL,           -- Código item del proveedor (ej: PAA5RTRORSER0001)
            descripcion TEXT NOT NULL,      -- Descripción completa
            categoria TEXT,                 -- toalla, toallon, sabana, almohada, repasador, etc.
            linea TEXT,                     -- Línea/marca (Palette, Arco Iris, Fantasia, Prata, Unique, etc.)
            diseno TEXT,                    -- Diseño/modelo (Serena, Boston, Detroit, Cody, etc.)
            color_nombre TEXT,              -- Nombre del color (Blanco, Plata, Cobalto, etc.)
            color_codigo TEXT,              -- Código del color (0001, 6333, 6135, etc.)
            tipo TEXT,                      -- Lisa, Jacquard, etc.
            tamanio TEXT,                   -- Tamaño (50x80, 70x130, 1 1/2, 2 1/2, Queen, King, etc.)
            ean TEXT,                       -- Código de barras EAN
            peso_neto REAL,                -- Peso neto en kg
            familia_comercial TEXT,         -- Familia comercial del proveedor
            familia_material TEXT,          -- Familia material del proveedor
            origen TEXT,                    -- Nacional, Importado, Brasil
            estado TEXT DEFAULT 'activo',   -- activo / discontinuado
            coleccion TEXT,                 -- OI26, PV25, etc.
            fuente TEXT,                    -- 'coteminas' o 'arcoiris' (planilla de origen)
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        -- Índices para búsqueda rápida
        CREATE INDEX IF NOT EXISTS idx_productos_categoria ON productos(categoria);
        CREATE INDEX IF NOT EXISTS idx_productos_linea ON productos(linea);
        CREATE INDEX IF NOT EXISTS idx_productos_ean ON productos(ean);
        CREATE INDEX IF NOT EXISTS idx_productos_codigo ON productos(codigo);

        -- Pedidos mensuales
        CREATE TABLE IF NOT EXISTS pedidos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            mes INTEGER NOT NULL,           -- 1-12
            anio INTEGER NOT NULL,          -- 2024, 2025, 2026...
            tipo TEXT DEFAULT 'total',      -- total / parcial
            estado TEXT DEFAULT 'sin_finalizar', -- sin_finalizar / finalizado
            fecha_pedido TEXT,              -- Fecha en que se realizó el pedido (YYYY-MM-DD, editable)
            notas TEXT,                     -- Notas generales del pedido
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            cerrado_at TIMESTAMP            -- Cuándo se marcó como finalizado
        );

        -- Items de cada pedido
        CREATE TABLE IF NOT EXISTS pedido_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            pedido_id INTEGER NOT NULL,
            producto_id INTEGER,            -- NULL si es item manual
            destino TEXT NOT NULL,           -- 'tucuman' o 'alsina'
            cantidad INTEGER NOT NULL DEFAULT 0,
            color_detalle TEXT,             -- Detalle de colores pedidos (ej: "surtido mínimo 6 colores")
            notas TEXT,                     -- Notas adicionales (ej: "sin fucsia, sin lila")
            es_manual INTEGER DEFAULT 0,    -- 1 si fue cargado manualmente
            descripcion_manual TEXT,         -- Descripción para items manuales
            codigo_manual TEXT,             -- Código para items manuales (SKU si es familia)
            categoria_manual TEXT,          -- Categoría para items manuales/familias (para agrupar en resumen)
            es_familia INTEGER DEFAULT 0,   -- 1 si es una familia completa (surtido de colores de un modelo)
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE,
            FOREIGN KEY (producto_id) REFERENCES productos(id)
        );

        CREATE INDEX IF NOT EXISTS idx_items_pedido ON pedido_items(pedido_id);
        CREATE INDEX IF NOT EXISTS idx_items_destino ON pedido_items(destino);

        -- Confirmaciones del proveedor (lo que realmente manda)
        CREATE TABLE IF NOT EXISTS confirmaciones (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            pedido_id INTEGER NOT NULL,
            texto_email TEXT,               -- Texto original del email pegado
            fecha_confirmacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            notas TEXT,
            FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE
        );

        -- Items confirmados por el proveedor
        CREATE TABLE IF NOT EXISTS confirmacion_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            confirmacion_id INTEGER NOT NULL,
            producto_id INTEGER,
            destino TEXT,                   -- tucuman / alsina
            cantidad_confirmada INTEGER DEFAULT 0,
            descripcion TEXT,               -- Descripción tal cual vino en el email
            notas TEXT,
            FOREIGN KEY (confirmacion_id) REFERENCES confirmaciones(id) ON DELETE CASCADE,
            FOREIGN KEY (producto_id) REFERENCES productos(id)
        );

        -- ENTREGAS: confirmaciones de facturación del proveedor (lo que realmente envía)
        -- Independientes de los pedidos. Una entrega = una factura/remito de Coteminas.
        CREATE TABLE IF NOT EXISTS entregas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            destino TEXT,                   -- tucuman (Sergio) / alsina (Alberto)
            cliente TEXT,                   -- nombre del cliente facturado (ej SACCAL ALBERTO JULIO)
            factura TEXT,                   -- nro de factura
            remito TEXT,                    -- nro de remito
            pedido_proveedor TEXT,          -- nro de pedido del proveedor (ej 319176)
            fecha_emision TEXT,             -- dd/mm/aaaa (del email)
            fecha_vencimiento TEXT,         -- dd/mm/aaaa (del email)
            fecha_entrega TEXT,             -- YYYY-MM-DD, la que Maru coordina con el proveedor (editable)
            valor_total REAL,               -- valor total de la factura
            texto_email TEXT,               -- email original pegado
            notas TEXT,
            pedido_id INTEGER,              -- opcional: vínculo a un pedido interno (NULL si no se asocia)
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE SET NULL
        );

        CREATE TABLE IF NOT EXISTS entrega_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            entrega_id INTEGER NOT NULL,
            producto_id INTEGER,            -- NULL si el código no matchea el catálogo
            codigo_item TEXT,               -- código del proveedor tal cual vino en el email
            sku_manual TEXT,                -- SKU asignado a mano (variante nueva de un modelo existente)
            descripcion TEXT,               -- descripción del email
            cantidad INTEGER,
            valor_unit REAL,
            valor_total REAL,
            FOREIGN KEY (entrega_id) REFERENCES entregas(id) ON DELETE CASCADE,
            FOREIGN KEY (producto_id) REFERENCES productos(id)
        );

        CREATE INDEX IF NOT EXISTS idx_entregas_destino ON entregas(destino);
        CREATE INDEX IF NOT EXISTS idx_entrega_items_entrega ON entrega_items(entrega_id);
    """)

    # Migraciones defensivas para bases de datos existentes
    migraciones = [
        ("productos", "sku_tu_textil", "TEXT"),
        ("productos", "mla_ids", "TEXT"),
        ("pedido_items", "categoria_manual", "TEXT"),
        ("pedido_items", "es_familia", "INTEGER DEFAULT 0"),
        ("pedidos", "fecha_pedido", "TEXT"),
        ("entrega_items", "sku_manual", "TEXT"),
    ]
    for tabla, columna, tipo in migraciones:
        cols = [r[1] for r in conn.execute(f"PRAGMA table_info({tabla})").fetchall()]
        if columna not in cols:
            try:
                conn.execute(f"ALTER TABLE {tabla} ADD COLUMN {columna} {tipo}")
            except Exception:
                pass

    # Migrar valores antiguos de tipo/estado a la nueva terminología
    conn.execute("UPDATE pedidos SET tipo='total' WHERE tipo='mensual'")
    conn.execute("UPDATE pedidos SET tipo='parcial' WHERE tipo='extra'")
    conn.execute("UPDATE pedidos SET estado='sin_finalizar' WHERE estado='borrador'")
    conn.execute("UPDATE pedidos SET estado='finalizado' WHERE estado='terminado'")

    # Backfill: pedidos sin fecha_pedido toman la fecha de creación
    conn.execute("""
        UPDATE pedidos SET fecha_pedido = date(created_at)
        WHERE fecha_pedido IS NULL OR fecha_pedido = ''
    """)

    conn.commit()
    conn.close()
    print(f"Base de datos inicializada en {DB_PATH}")


if __name__ == '__main__':
    init_db()
