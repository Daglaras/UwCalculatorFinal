from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import sqlite3
import os

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Use /tmp for SQLite on Vercel (serverless)
DB_PATH = "/tmp/window_calculator.db"


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def row_to_dict(row):
    if row is None:
        return None
    return dict(row)


def rows_to_list(rows):
    return [dict(row) for row in rows]


def init_db():
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.executescript('''
        -- 0. TYPES (Sliding / Opening)
        CREATE TABLE IF NOT EXISTS types (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            name_gr TEXT NOT NULL,
            image_url TEXT
        );

        -- 1. CATEGORIES (global window types)
        CREATE TABLE IF NOT EXISTS categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            type_id INTEGER NOT NULL,
            name TEXT NOT NULL UNIQUE,
            num_glasses INTEGER NOT NULL,
            has_special_calculation BOOLEAN DEFAULT FALSE,
            image_url TEXT,
            FOREIGN KEY (type_id) REFERENCES types(id)
        );

        -- 2. SERIES (PR320, PR45, IQ34, IQ460, IQ580)
        CREATE TABLE IF NOT EXISTS series (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            type_id INTEGER NOT NULL,
            name TEXT NOT NULL UNIQUE,
            code TEXT NOT NULL,
            a REAL NOT NULL,
            b REAL,
            x REAL NOT NULL,
            uf1 REAL,
            uf2 REAL,
            e REAL,
            f REAL,
            e_narrow REAL,
            f_narrow REAL,
            image_url TEXT,
            FOREIGN KEY (type_id) REFERENCES types(id)
        );

        -- 3. DRIVERS (case profiles - codes with 2xx)
        CREATE TABLE IF NOT EXISTS drivers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            series_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            FOREIGN KEY (series_id) REFERENCES series(id)
        );

        -- 4. DRIVER_CATEGORIES (which drivers fit which categories)
        CREATE TABLE IF NOT EXISTS driver_categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            driver_id INTEGER NOT NULL,
            category_id INTEGER NOT NULL,
            FOREIGN KEY (driver_id) REFERENCES drivers(id),
            FOREIGN KEY (category_id) REFERENCES categories(id),
            UNIQUE(driver_id, category_id)
        );

        -- 5. SASHES (file/glass profiles - codes with 3xx)
        CREATE TABLE IF NOT EXISTS sashes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            series_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            b_override REAL,
            FOREIGN KEY (series_id) REFERENCES series(id)
        );

        -- 6. SERIES_CATEGORY_PARAMS (GW/GH calculation parameters)
        CREATE TABLE IF NOT EXISTS series_category_params (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            series_id INTEGER NOT NULL,
            category_id INTEGER NOT NULL,
            sash_id INTEGER,
            gw_divisor REAL NOT NULL,
            gw_offset REAL NOT NULL,
            gh_offset REAL NOT NULL,
            narrow_gw_offset REAL,
            FOREIGN KEY (series_id) REFERENCES series(id),
            FOREIGN KEY (category_id) REFERENCES categories(id),
            FOREIGN KEY (sash_id) REFERENCES sashes(id)
        );
    ''')
    
    # Check if data exists
    cursor.execute("SELECT COUNT(*) FROM types")
    if cursor.fetchone()[0] == 0:
        # Insert initial data
        
        # Types
        cursor.executescript('''
            INSERT INTO types (name, name_gr) VALUES ('Sliding', 'Συρόμενο');
            INSERT INTO types (name, name_gr) VALUES ('Opening', 'Ανοιγόμενο');
        ''')
        
        # Categories (all for Sliding type_id=1)
        cursor.executescript('''
            INSERT INTO categories (type_id, name, num_glasses, has_special_calculation) VALUES 
                (1, 'Δίφυλλο Επάλληλο', 2, FALSE),
                (1, 'Τρίφυλλο Επάλληλο', 3, FALSE),
                (1, 'Τετράφυλλο Επάλληλο', 4, FALSE),
                (1, 'Τετράφυλλο Φιλητό', 4, TRUE);
        ''')
        
        # Series (all for Sliding type_id=1)
        # Values: a, b (default), x, uf1, uf2, e, f, e_narrow, f_narrow
        cursor.executescript('''
            INSERT INTO series (type_id, name, code, a, b, x, uf1, uf2, e, f, e_narrow, f_narrow) VALUES 
                (1, 'PR320', '320', 40.83, 91.48, 8.4, 4.2, 4.5, 97.93, 191.36, NULL, NULL),
                (1, 'PR45', '45', 44.16, 97.8, 9.3, 4.3, 4.9, 112.97, 202.8, NULL, NULL),
                (1, 'IQ34', '34', 32.57, 81.6, 6.88, 3.9, 4.7, 85.51, 170.87, 25.5, NULL),
                (1, 'IQ460', '460', 45.1, 81.53, 8, 3.8, 4.6, 85.43, 173.06, 40.5, NULL),
                (1, 'IQ580', '580', 45.5, NULL, 8, 3.8, 5.2, 97.43, 197.06, 40.5, 173.06);
        ''')
        
        # Drivers
        # PR320 drivers (IDs 1-6)
        cursor.executescript('''
            INSERT INTO drivers (series_id, name) VALUES 
                (1, '320-201'),
                (1, '320-202'),
                (1, '320-203'),
                (1, '320-204'),
                (1, '320-205'),
                (1, '320-206');
        ''')
        
        # PR45 drivers (IDs 7-12)
        cursor.executescript('''
            INSERT INTO drivers (series_id, name) VALUES 
                (2, '45-201'),
                (2, '45-202'),
                (2, '45-203'),
                (2, '45-208'),
                (2, '45-209'),
                (2, '45-210');
        ''')
        
        # IQ34 drivers (IDs 13-15)
        cursor.executescript('''
            INSERT INTO drivers (series_id, name) VALUES 
                (3, '34-201'),
                (3, '34-202'),
                (3, '34-203');
        ''')
        
        # IQ460 drivers (IDs 16-21)
        cursor.executescript('''
            INSERT INTO drivers (series_id, name) VALUES 
                (4, '460-201'),
                (4, '460-202'),
                (4, '460-203'),
                (4, '460-205'),
                (4, '460-206'),
                (4, '460-208');
        ''')
        
        # IQ580 drivers (IDs 22-27)
        cursor.executescript('''
            INSERT INTO drivers (series_id, name) VALUES 
                (5, '580-201'),
                (5, '580-202'),
                (5, '580-203'),
                (5, '580-205'),
                (5, '580-206'),
                (5, '580-209');
        ''')
        
        # Sashes
        # PR320 sashes (IDs 1-2)
        cursor.executescript('''
            INSERT INTO sashes (series_id, name, b_override) VALUES 
                (1, '320-301', NULL),
                (1, '320-302', NULL);
        ''')
        
        # PR45 sashes (IDs 3-4)
        cursor.executescript('''
            INSERT INTO sashes (series_id, name, b_override) VALUES 
                (2, '45-301', NULL),
                (2, '45-302', NULL);
        ''')
        
        # IQ34 sashes (IDs 5-6)
        cursor.executescript('''
            INSERT INTO sashes (series_id, name, b_override) VALUES 
                (3, '34-301', NULL),
                (3, '34-302', NULL);
        ''')
        
        # IQ460 sashes (IDs 7-8)
        cursor.executescript('''
            INSERT INTO sashes (series_id, name, b_override) VALUES 
                (4, '460-301', NULL),
                (4, '460-302', NULL);
        ''')
        
        # IQ580 sashes (IDs 9-10)
        cursor.executescript('''
            INSERT INTO sashes (series_id, name, b_override) VALUES 
                (5, '580-301', NULL),
                (5, '580-302', NULL);
        ''')
        
        # Driver-Category mappings
        # PR320 drivers (IDs 1-6)
        cursor.executescript('''
            -- 320-201: Διφυλλο, Τετραφυλο φιλητο
            INSERT INTO driver_categories (driver_id, category_id) VALUES (1, 1), (1, 4);
            -- 320-202: Διφυλλο, Τετραφυλο φιλητο
            INSERT INTO driver_categories (driver_id, category_id) VALUES (2, 1), (2, 4);
            -- 320-203: Τριφυλλο επαλληλο
            INSERT INTO driver_categories (driver_id, category_id) VALUES (3, 2);
            -- 320-204: Τετραφυλλο επαλληλο
            INSERT INTO driver_categories (driver_id, category_id) VALUES (4, 3);
            -- 320-205: Τριφυλλο επαλληλο
            INSERT INTO driver_categories (driver_id, category_id) VALUES (5, 2);
            -- 320-206: Τριφυλλο επαλληλο
            INSERT INTO driver_categories (driver_id, category_id) VALUES (6, 2);
        ''')
        
        # PR45 drivers (IDs 7-12)
        cursor.executescript('''
            -- 45-201: Διφυλλο, Τετραφυλο φιλητο
            INSERT INTO driver_categories (driver_id, category_id) VALUES (7, 1), (7, 4);
            -- 45-202: Διφυλλο, Τετραφυλο φιλητο
            INSERT INTO driver_categories (driver_id, category_id) VALUES (8, 1), (8, 4);
            -- 45-203: Τριφυλλο επαλληλο
            INSERT INTO driver_categories (driver_id, category_id) VALUES (9, 2);
            -- 45-208: Τετραφυλλο επαλληλο
            INSERT INTO driver_categories (driver_id, category_id) VALUES (10, 3);
            -- 45-209: Τριφυλλο επαλληλο
            INSERT INTO driver_categories (driver_id, category_id) VALUES (11, 2);
            -- 45-210: Διφυλλο, Τετραφυλο φιλητο
            INSERT INTO driver_categories (driver_id, category_id) VALUES (12, 1), (12, 4);
        ''')
        
        # IQ34 drivers (IDs 13-15)
        cursor.executescript('''
            -- 34-201: Διφυλλο, Τετραφυλο φιλητο
            INSERT INTO driver_categories (driver_id, category_id) VALUES (13, 1), (13, 4);
            -- 34-202: Διφυλλο, Τετραφυλο φιλητο
            INSERT INTO driver_categories (driver_id, category_id) VALUES (14, 1), (14, 4);
            -- 34-203: Τριφυλλο επαλληλο
            INSERT INTO driver_categories (driver_id, category_id) VALUES (15, 2);
        ''')
        
        # IQ460 drivers (IDs 16-21)
        cursor.executescript('''
            -- 460-201: Διφυλλο, Τετραφυλο φιλητο
            INSERT INTO driver_categories (driver_id, category_id) VALUES (16, 1), (16, 4);
            -- 460-202: Διφυλλο, Τετραφυλο φιλητο
            INSERT INTO driver_categories (driver_id, category_id) VALUES (17, 1), (17, 4);
            -- 460-203: Τριφυλλο επαλληλο
            INSERT INTO driver_categories (driver_id, category_id) VALUES (18, 2);
            -- 460-205: Τετραφυλλο επαλληλο
            INSERT INTO driver_categories (driver_id, category_id) VALUES (19, 3);
            -- 460-206: Τριφυλλο επαλληλο
            INSERT INTO driver_categories (driver_id, category_id) VALUES (20, 2);
            -- 460-208: Τριφυλλο επαλληλο
            INSERT INTO driver_categories (driver_id, category_id) VALUES (21, 2);
        ''')
        
        # IQ580 drivers (IDs 22-27)
        cursor.executescript('''
            -- 580-201: Διφυλλο, Τετραφυλο φιλητο
            INSERT INTO driver_categories (driver_id, category_id) VALUES (22, 1), (22, 4);
            -- 580-202: Διφυλλο, Τετραφυλο φιλητο
            INSERT INTO driver_categories (driver_id, category_id) VALUES (23, 1), (23, 4);
            -- 580-203: Τριφυλλο επαλληλο
            INSERT INTO driver_categories (driver_id, category_id) VALUES (24, 2);
            -- 580-205: Τετραφυλλο επαλληλο
            INSERT INTO driver_categories (driver_id, category_id) VALUES (25, 3);
            -- 580-206: Τριφυλλο επαλληλο
            INSERT INTO driver_categories (driver_id, category_id) VALUES (26, 2);
            -- 580-209: Τριφυλλο επαλληλο
            INSERT INTO driver_categories (driver_id, category_id) VALUES (27, 2);
        ''')
        
        # Series-Category params (GW/GH formulas)
        # PR320 (series_id=1)
        cursor.executescript('''
            INSERT INTO series_category_params (series_id, category_id, sash_id, gw_divisor, gw_offset, gh_offset, narrow_gw_offset) VALUES 
                (1, 1, NULL, 2, 151, 226, NULL),
                (1, 2, NULL, 3, 126, 226, NULL),
                (1, 3, NULL, 4, 113.4, 226, NULL),
                (1, 4, NULL, 4, 137, 226, NULL);
        ''')
        
        # PR45 (series_id=2) - Δίφυλλο shares params with Τετράφυλλο Φιλητό except gw_divisor
        cursor.executescript('''
            INSERT INTO series_category_params (series_id, category_id, sash_id, gw_divisor, gw_offset, gh_offset, narrow_gw_offset) VALUES 
                (2, 1, NULL, 2, 140, 231, NULL),
                (2, 2, NULL, 3, 130, 231, NULL),
                (2, 3, NULL, 4, 118, 231, NULL),
                (2, 4, NULL, 4, 140, 231, NULL);
        ''')
        
        # IQ34 (series_id=3)
        cursor.executescript('''
            INSERT INTO series_category_params (series_id, category_id, sash_id, gw_divisor, gw_offset, gh_offset, narrow_gw_offset) VALUES 
                (3, 1, NULL, 2, 128, 192.6, 98),
                (3, 2, NULL, 3, 106.5, 192.6, 66.53),
                (3, 4, NULL, 4, 117.1, 192.6, 87.1);
        ''')
        
        # IQ460 (series_id=4)
        cursor.executescript('''
            INSERT INTO series_category_params (series_id, category_id, sash_id, gw_divisor, gw_offset, gh_offset, narrow_gw_offset) VALUES 
                (4, 1, NULL, 2, 144, 224.6, 114),
                (4, 2, NULL, 3, 122.53, 224.6, 82.53),
                (4, 4, NULL, 4, 133.1, 224.6, 103.1);
        ''')
        
        # IQ580 (series_id=5)
        cursor.executescript('''
            INSERT INTO series_category_params (series_id, category_id, sash_id, gw_divisor, gw_offset, gh_offset, narrow_gw_offset) VALUES 
                (5, 1, NULL, 2, 160, 256.6, 130),
                (5, 2, NULL, 3, 138.53, 256.6, 98.53),
                (5, 4, NULL, 4, 149.1, 256.6, 119.1);
        ''')
    
    conn.commit()
    conn.close()


# Initialize DB on startup
init_db()


# ===================================
# PYDANTIC MODELS
# ===================================

class CalculationRequest(BaseModel):
    series_id: int
    category_id: int
    driver_id: int
    sash_id: int
    plaisio_width: float
    plaisio_height: float
    ug_value: float
    psi_value: float
    has_rolo: bool = False
    rolo_height: Optional[float] = None
    ur_value: Optional[float] = None
    is_narrow: bool = False


# ===================================
# API ROUTES
# ===================================

@app.get("/api/types")
def get_types():
    init_db()  # Ensure DB exists
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM types")
    types = rows_to_list(cursor.fetchall())
    conn.close()
    return types


@app.get("/api/types/{type_id}/series")
def get_series_by_type(type_id: int):
    init_db()
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM series WHERE type_id = ?", (type_id,))
    series = rows_to_list(cursor.fetchall())
    conn.close()
    return series


@app.get("/api/types/{type_id}/categories")
def get_categories_by_type(type_id: int):
    init_db()
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM categories WHERE type_id = ?", (type_id,))
    categories = rows_to_list(cursor.fetchall())
    conn.close()
    return categories


@app.get("/api/categories")
def get_all_categories():
    init_db()
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM categories")
    categories = rows_to_list(cursor.fetchall())
    conn.close()
    return categories


@app.get("/api/series")
def get_all_series():
    init_db()
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM series")
    series = rows_to_list(cursor.fetchall())
    conn.close()
    return series


@app.get("/api/series/{series_id}/categories")
def get_categories_for_series(series_id: int):
    init_db()
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT DISTINCT c.* FROM categories c
        JOIN driver_categories dc ON c.id = dc.category_id
        JOIN drivers d ON dc.driver_id = d.id
        WHERE d.series_id = ?
    """, (series_id,))
    categories = rows_to_list(cursor.fetchall())
    conn.close()
    return categories


@app.get("/api/series/{series_id}/category/{category_id}/drivers")
def get_drivers_for_category(series_id: int, category_id: int):
    init_db()
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT d.* FROM drivers d
        JOIN driver_categories dc ON d.id = dc.driver_id
        WHERE d.series_id = ? AND dc.category_id = ?
    """, (series_id, category_id))
    drivers = rows_to_list(cursor.fetchall())
    conn.close()
    return drivers


@app.get("/api/series/{series_id}/sashes")
def get_sashes_for_series(series_id: int):
    init_db()
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM sashes WHERE series_id = ?", (series_id,))
    sashes = rows_to_list(cursor.fetchall())
    conn.close()
    return sashes


@app.get("/api/series/{series_id}/category/{category_id}/params")
def get_category_params(series_id: int, category_id: int, sash_id: Optional[int] = None):
    init_db()
    conn = get_db()
    cursor = conn.cursor()
    
    if sash_id:
        cursor.execute("""
            SELECT * FROM series_category_params 
            WHERE series_id = ? AND category_id = ? AND (sash_id = ? OR sash_id IS NULL)
            ORDER BY sash_id DESC NULLS LAST
            LIMIT 1
        """, (series_id, category_id, sash_id))
    else:
        cursor.execute("""
            SELECT * FROM series_category_params 
            WHERE series_id = ? AND category_id = ? AND sash_id IS NULL
        """, (series_id, category_id))
    
    params = row_to_dict(cursor.fetchone())
    conn.close()
    return params


@app.post("/api/calculate")
def calculate(req: CalculationRequest):
    init_db()
    
    # Validation
    if not (300 <= req.plaisio_height <= 5000):
        raise HTTPException(status_code=400, detail="Plaisio height must be between 300-5000 mm")
    if not (300 <= req.plaisio_width <= 10000):
        raise HTTPException(status_code=400, detail="Plaisio width must be between 300-10000 mm")
    if not (0.3 <= req.ug_value <= 7.0):
        raise HTTPException(status_code=400, detail="Ug value must be between 0.3-7.0 W/m²K")
    if req.psi_value not in [0.05, 0.08, 0.11]:
        raise HTTPException(status_code=400, detail="Psi value must be 0.05, 0.08, or 0.11")
    if req.has_rolo:
        if not req.rolo_height or not (100 <= req.rolo_height <= 1000):
            raise HTTPException(status_code=400, detail="Rolo height must be between 100-1000 mm")
        if not req.ur_value or not (0.6 <= req.ur_value <= 10.0):
            raise HTTPException(status_code=400, detail="Ur value must be between 0.6-10.0 W/m²K")
    
    conn = get_db()
    cursor = conn.cursor()
    
    # Get series data
    cursor.execute("SELECT * FROM series WHERE id = ?", (req.series_id,))
    series = row_to_dict(cursor.fetchone())
    if not series:
        conn.close()
        raise HTTPException(status_code=404, detail="Series not found")
    
    # Get category data
    cursor.execute("SELECT * FROM categories WHERE id = ?", (req.category_id,))
    category = row_to_dict(cursor.fetchone())
    if not category:
        conn.close()
        raise HTTPException(status_code=404, detail="Category not found")
    
    # Get driver data
    cursor.execute("SELECT * FROM drivers WHERE id = ?", (req.driver_id,))
    driver = row_to_dict(cursor.fetchone())
    if not driver:
        conn.close()
        raise HTTPException(status_code=404, detail="Driver not found")
    
    # Get sash data
    cursor.execute("SELECT * FROM sashes WHERE id = ?", (req.sash_id,))
    sash = row_to_dict(cursor.fetchone())
    if not sash:
        conn.close()
        raise HTTPException(status_code=404, detail="Sash not found")
    
    # Get calculation params
    cursor.execute("""
        SELECT * FROM series_category_params 
        WHERE series_id = ? AND category_id = ? AND (sash_id = ? OR sash_id IS NULL)
        ORDER BY sash_id DESC
        LIMIT 1
    """, (req.series_id, req.category_id, req.sash_id))
    params = row_to_dict(cursor.fetchone())
    if not params:
        conn.close()
        raise HTTPException(status_code=404, detail="Category params not found for this series")
    
    conn.close()
    
    # === CALCULATIONS ===
    
    # Get values
    a = series['a']
    b = sash['b_override'] if sash['b_override'] else series['b']
    x = series['x']
    uf1 = series['uf1']
    uf2 = series['uf2']
    e = series['e']
    f = series['f']
    e_narrow = series['e_narrow']
    f_narrow = series['f_narrow']
    num_glasses = category['num_glasses']
    has_special = category['has_special_calculation']
    
    # =========================================
    # INPUT VALUES
    # =========================================
    FW = req.plaisio_width
    FH_original = req.plaisio_height
    Ug = req.ug_value
    Psi = req.psi_value
    
    # =========================================
    # ROLO HEIGHT ADJUSTMENT
    # =========================================
    Ar = None
    Uw_open = None
    Uw_closed = None
    
    if req.has_rolo and req.rolo_height:
        FH = FH_original - req.rolo_height
        Ar = (FW * req.rolo_height) / 1_000_000
    else:
        FH = FH_original
    
    # =========================================
    # GW/GH PARAMETERS
    # =========================================
    gw_divisor = params['gw_divisor']
    gw_offset = params['narrow_gw_offset'] if req.is_narrow and params['narrow_gw_offset'] else params['gw_offset']
    gh_offset = params['gh_offset']
    
    # =========================================
    # CALCULATIONS - LENGTHS
    # =========================================
    l = (a + b - x) / 1000
    GW = (FW / gw_divisor) - gw_offset
    GH = FH - gh_offset
    Kentro_height = FH - (2 * l * 1000)
    kentro_width = GW
    
    # =========================================
    # AKENTROU VALUE SELECTION
    # =========================================
    if req.is_narrow and e_narrow:
        akentrou_value = e_narrow
    else:
        akentrou_value = e
    
    # =========================================
    # CALCULATIONS - AREAS
    # =========================================
    Akoufomatos = (FH * FW) / 1_000_000
    Aw = Akoufomatos
    Af1 = Akoufomatos - ((FH/1000 - 2*l) * (FW/1000 - 2*l))
    Af2 = (num_glasses - 1) * (Kentro_height * akentrou_value) / 1_000_000
    Aff2 = (num_glasses - 2) * (Kentro_height * akentrou_value) / 1_000_000
    Af = Af1 + Af2
    Ag = Akoufomatos - Af
    
    # =========================================
    # CALCULATIONS - PERIMETER
    # =========================================
    Ig = (2 * GH + 2 * GW) * num_glasses / 1000
    
    # =========================================
    # CALCULATIONS - U-VALUE
    # =========================================
    Afilitou = None
    
    if has_special:
        afilitou_value = f_narrow if (req.is_narrow and f_narrow) else f
        Afilitou = (Kentro_height * afilitou_value) / 1_000_000 if afilitou_value else 0
        Uff = uf1
        Af_Uf = (Af1 * uf1) + (Aff2 * uf2) + (Afilitou * Uff)
    else:
        Af_Uf = (Af1 * uf1) + (Af2 * uf2)
    
    Uw = (Af_Uf + (Ag * Ug) + (Ig * Psi)) / Aw
    
    # =========================================
    # ROLO U-VALUES
    # =========================================
    if req.has_rolo and req.rolo_height and req.ur_value:
        Uw_open = (Uw * Aw + Ar * req.ur_value) / (Aw + Ar)
        Uw_closed = 1 / ((1 / Uw_open) + 0.15)
    
    return {
        "Uw": round(Uw, 4),
        "Uw_open": round(Uw_open, 4) if Uw_open else None,
        "Uw_closed": round(Uw_closed, 4) if Uw_closed else None,
        "l": round(l, 4),
        "GW": round(GW, 2),
        "GH": round(GH, 2),
        "Akoufomatos": round(Akoufomatos, 4),
        "Af1": round(Af1, 4),
        "Af2": round(Af2, 4),
        "Aff2": round(Aff2, 4),
        "Af": round(Af, 4),
        "Ag": round(Ag, 4),
        "Ig": round(Ig, 4),
        "Af_Uf": round(Af_Uf, 4),
        "Afilitou": round(Afilitou, 4) if Afilitou else None,
        "Ar": round(Ar, 4) if Ar else None,
        "FH_original": FH_original,
        "FH_effective": FH if req.has_rolo else None,
        "rolo_height": req.rolo_height if req.has_rolo else None,
        "series_name": series['name'],
        "category_name": category['name'],
        "driver_name": driver['name'],
        "sash_name": sash['name'],
        "num_glasses": num_glasses,
        "has_rolo": req.has_rolo,
        "is_narrow": req.is_narrow,
        "has_special": has_special,
    }


# ===================================
# ADMIN API
# ===================================

@app.get("/api/admin/all-data")
def get_all_data():
    init_db()
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM types")
    types = rows_to_list(cursor.fetchall())
    
    cursor.execute("SELECT * FROM categories")
    categories = rows_to_list(cursor.fetchall())
    
    cursor.execute("SELECT * FROM series")
    series = rows_to_list(cursor.fetchall())
    
    cursor.execute("SELECT * FROM drivers")
    drivers = rows_to_list(cursor.fetchall())
    
    cursor.execute("SELECT * FROM sashes")
    sashes = rows_to_list(cursor.fetchall())
    
    cursor.execute("SELECT * FROM driver_categories")
    driver_categories = rows_to_list(cursor.fetchall())
    
    cursor.execute("SELECT * FROM series_category_params")
    series_category_params = rows_to_list(cursor.fetchall())
    
    conn.close()
    
    return {
        "types": types,
        "categories": categories,
        "series": series,
        "drivers": drivers,
        "sashes": sashes,
        "driver_categories": driver_categories,
        "series_category_params": series_category_params
    }
