# backend.py
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import sqlite3
import os

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_PATH = "window_calculator.db"


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

        -- 6. SERIES_CATEGORY_PARAMS (GW/GH formulas per series+category)
        -- For most series, sash_id is NULL (GW/GH same for all sashes)
        -- For IQ580, we need separate entries per sash
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
    cursor.execute("SELECT COUNT(*) FROM categories")
    if cursor.fetchone()[0] == 0:
        # Insert types first
        cursor.executescript('''
            INSERT INTO types (name, name_gr) VALUES 
                ('Sliding', 'Συρόμενα'),
                ('Opening', 'Ανοιγόμενα');
        ''')
        
        # Insert categories (type_id=1 for Sliding)
        cursor.executescript('''
            INSERT INTO categories (type_id, name, num_glasses, has_special_calculation) VALUES 
                (1, 'Δίφυλλο Επάλληλο', 2, FALSE),
                (1, 'Τρίφυλλο Επάλληλο', 3, FALSE),
                (1, 'Τετράφυλλο Επάλληλο', 4, FALSE),
                (1, 'Τετράφυλλο Φιλητό', 4, TRUE);
        ''')
        
        # Insert series with type_id=1 (Sliding) and a, b, x, uf1, uf2, e, f, e_narrow, f_narrow values
        cursor.executescript('''
            INSERT INTO series (type_id, name, code, a, b, x, uf1, uf2, e, f, e_narrow, f_narrow) VALUES 
                (1, 'PR320', '320', 40.83, 91.48, 8.4, 4.2, 4.5, 97.93, 191.36, NULL, NULL),
                (1, 'PR45', '45', 44.16, 97.8, 9.3, 4.3, 4.9, 112.97, 202.8, NULL, NULL),
                (1, 'IQ34', '34', 32.57, 81.6, 6.88, 3.9, 4.7, 85.51, 170.87, 25.5, NULL),
                (1, 'IQ460', '460', 45.1, 81.53, 8, 3.8, 4.6, 85.43, 173.06, 40.5, NULL),
                (1, 'IQ580', '580', 45.5, NULL, 8, 3.8, 5.2, 97.43, 197.06, 40.5, 173.06);
        ''')
        
        # Insert drivers for PR320 (series_id=1)
        cursor.executescript('''
            INSERT INTO drivers (series_id, name) VALUES 
                (1, '320-201'), (1, '320-203'), (1, '320-206'),
                (1, '320-210'), (1, '320-214'), (1, '320-215');
        ''')
        
        # Insert drivers for PR45 (series_id=2)
        cursor.executescript('''
            INSERT INTO drivers (series_id, name) VALUES 
                (2, '45-201'), (2, '45-202'), (2, '45-203'),
                (2, '45-208'), (2, '45-209'), (2, '45-210');
        ''')
        
        # Insert drivers for IQ34 (series_id=3)
        cursor.executescript('''
            INSERT INTO drivers (series_id, name) VALUES 
                (3, '34-201'), (3, '34-202'), (3, '34-203');
        ''')
        
        # Insert drivers for IQ460 (series_id=4)
        cursor.executescript('''
            INSERT INTO drivers (series_id, name) VALUES 
                (4, '460-201'), (4, '460-202'), (4, '460-203'),
                (4, '460-206'), (4, '460-209');
        ''')
        
        # Insert drivers for IQ580 (series_id=5)
        cursor.executescript('''
            INSERT INTO drivers (series_id, name) VALUES 
                (5, '580-201'), (5, '580-202'), (5, '580-203'),
                (5, '580-204'), (5, '580-205'), (5, '580-206'), (5, '580-209');
        ''')
        
        # Insert sashes
        cursor.executescript('''
            -- PR320 sashes (series_id=1)
            INSERT INTO sashes (series_id, name, b_override) VALUES (1, '320-301', NULL);
            
            -- PR45 sashes (series_id=2)
            INSERT INTO sashes (series_id, name, b_override) VALUES 
                (2, '45-301', NULL), (2, '45-302', NULL), (2, '45-303', NULL);
            
            -- IQ34 sashes (series_id=3)
            INSERT INTO sashes (series_id, name, b_override) VALUES (3, '34-301', NULL);
            
            -- IQ460 sashes (series_id=4)
            INSERT INTO sashes (series_id, name, b_override) VALUES 
                (4, '460-301', NULL), (4, '460-302', 36.6);
            
            -- IQ580 sashes (series_id=5) - different b values!
            INSERT INTO sashes (series_id, name, b_override) VALUES 
                (5, '580-301', 93.5), (5, '580-302', 81.5);
        ''')
        
        # Driver-Category mappings
        # Categories: 1=Δίφυλλο, 2=Τρίφυλλο, 3=Τετράφυλλο Επάλληλο, 4=Τετράφυλλο Φιλητό
        
        # PR320 drivers
        cursor.executescript('''
            -- 320-201: Διφυλλο, Τετραφυλο φιλητο
            INSERT INTO driver_categories (driver_id, category_id) VALUES (1, 1), (1, 4);
            -- 320-203: Διφυλλο, Τετραφυλο φιλητο
            INSERT INTO driver_categories (driver_id, category_id) VALUES (2, 1), (2, 4);
            -- 320-206: Τριφυλλο επαλληλο
            INSERT INTO driver_categories (driver_id, category_id) VALUES (3, 2);
            -- 320-210: Τετραφυλλο επαλληλο
            INSERT INTO driver_categories (driver_id, category_id) VALUES (4, 3);
            -- 320-214: Διφυλλο, Τετραφυλο φιλητο
            INSERT INTO driver_categories (driver_id, category_id) VALUES (5, 1), (5, 4);
            -- 320-215: Διφυλλο, Τετραφυλο φιλητο
            INSERT INTO driver_categories (driver_id, category_id) VALUES (6, 1), (6, 4);
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
        
        # IQ460 drivers (IDs 16-20)
        cursor.executescript('''
            -- 460-201: Διφυλλο, Τετραφυλο φιλητο
            INSERT INTO driver_categories (driver_id, category_id) VALUES (16, 1), (16, 4);
            -- 460-202: Τριφυλλο επαλληλο
            INSERT INTO driver_categories (driver_id, category_id) VALUES (17, 2);
            -- 460-203: Διφυλλο, Τετραφυλο φιλητο
            INSERT INTO driver_categories (driver_id, category_id) VALUES (18, 1), (18, 4);
            -- 460-206: Τριφυλλο επαλληλο
            INSERT INTO driver_categories (driver_id, category_id) VALUES (19, 2);
            -- 460-209: Διφυλλο, Τετραφυλο φιλητο
            INSERT INTO driver_categories (driver_id, category_id) VALUES (20, 1), (20, 4);
        ''')
        
        # IQ580 drivers (IDs 21-27)
        cursor.executescript('''
            -- 580-201: Διφυλλο, Τετραφυλο φιλητο
            INSERT INTO driver_categories (driver_id, category_id) VALUES (21, 1), (21, 4);
            -- 580-202: Διφυλλο, Τετραφυλο φιλητο
            INSERT INTO driver_categories (driver_id, category_id) VALUES (22, 1), (22, 4);
            -- 580-203: Τριφυλλο επαλληλο
            INSERT INTO driver_categories (driver_id, category_id) VALUES (23, 2);
            -- 580-204: Διφυλλο, Τετραφυλο φιλητο
            INSERT INTO driver_categories (driver_id, category_id) VALUES (24, 1), (24, 4);
            -- 580-205: Τετραφυλλο επαλληλο
            INSERT INTO driver_categories (driver_id, category_id) VALUES (25, 3);
            -- 580-206: Τριφυλλο επαλληλο
            INSERT INTO driver_categories (driver_id, category_id) VALUES (26, 2);
            -- 580-209: Τριφυλλο επαλληλο
            INSERT INTO driver_categories (driver_id, category_id) VALUES (27, 2);
        ''')
        
        # Series-Category params (GW/GH formulas)
        # Format: gw_divisor, gw_offset, gh_offset, narrow_gw_offset
        # GW = (plaisio_width / gw_divisor) - gw_offset
        # GH = plaisio_height - gh_offset
        
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
                (4, 1, NULL, 2, 137.3, 213.6, 115),
                (4, 2, NULL, 3, 112, 213.6, 82.1),
                (4, 4, NULL, 4, 121.3, 213.6, 98.8);
        ''')
        
        # IQ580 (series_id=5) - needs sash_id!
        # Sash IDs: 580-301=11, 580-302=12
        cursor.executescript('''
            -- With 580-301 (sash_id=11)
            INSERT INTO series_category_params (series_id, category_id, sash_id, gw_divisor, gw_offset, gh_offset, narrow_gw_offset) VALUES 
                (5, 1, 11, 2, 155.8, 238, 127.6),
                (5, 2, 11, 3, 128.3, 238, 90.53),
                (5, 3, 11, 4, 114.6, 238, 71.9),
                (5, 4, 11, 4, 139.5, 238, 111);
            
            -- With 580-302 (sash_id=12)
            INSERT INTO series_category_params (series_id, category_id, sash_id, gw_divisor, gw_offset, gh_offset, narrow_gw_offset) VALUES 
                (5, 1, 12, 2, 137.8, 214, 115.6),
                (5, 2, 12, 3, 112.3, 214, 82.35),
                (5, 3, 12, 4, 99.6, 214, 65.9),
                (5, 4, 12, 4, 121.5, 214, 99);
        ''')
    
    conn.commit()
    conn.close()


# Initialize database on startup
@app.on_event("startup")
async def startup():
    if not os.path.exists(DB_PATH):
        init_db()
    else:
        init_db()


# ===================================
# PUBLIC API ENDPOINTS
# ===================================

@app.get("/api/types")
async def get_all_types():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM types")
    result = rows_to_list(cursor.fetchall())
    conn.close()
    return result


@app.get("/api/types/{type_id}/series")
async def get_series_by_type(type_id: int):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM series WHERE type_id = ?", (type_id,))
    result = rows_to_list(cursor.fetchall())
    conn.close()
    return result


@app.get("/api/types/{type_id}/categories")
async def get_categories_by_type(type_id: int):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM categories WHERE type_id = ?", (type_id,))
    result = rows_to_list(cursor.fetchall())
    conn.close()
    return result


@app.get("/api/series")
async def get_all_series():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM series")
    result = rows_to_list(cursor.fetchall())
    conn.close()
    return result


@app.get("/api/series/{series_id}")
async def get_series(series_id: int):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM series WHERE id = ?", (series_id,))
    result = row_to_dict(cursor.fetchone())
    conn.close()
    return result


@app.get("/api/categories")
async def get_all_categories():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM categories")
    result = rows_to_list(cursor.fetchall())
    conn.close()
    return result


@app.get("/api/series/{series_id}/categories")
async def get_categories_for_series(series_id: int):
    """Get categories available for a series (based on what drivers support)"""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT DISTINCT c.* FROM categories c
        JOIN driver_categories dc ON c.id = dc.category_id
        JOIN drivers d ON dc.driver_id = d.id
        WHERE d.series_id = ?
        ORDER BY c.num_glasses
    ''', (series_id,))
    result = rows_to_list(cursor.fetchall())
    conn.close()
    return result


@app.get("/api/series/{series_id}/category/{category_id}/drivers")
async def get_drivers_for_category(series_id: int, category_id: int):
    """Get drivers that support a specific category in a series"""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT d.* FROM drivers d
        JOIN driver_categories dc ON d.id = dc.driver_id
        WHERE d.series_id = ? AND dc.category_id = ?
    ''', (series_id, category_id))
    result = rows_to_list(cursor.fetchall())
    conn.close()
    return result


@app.get("/api/series/{series_id}/sashes")
async def get_sashes_for_series(series_id: int):
    """Get all sashes for a series"""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM sashes WHERE series_id = ?", (series_id,))
    result = rows_to_list(cursor.fetchall())
    conn.close()
    return result


@app.get("/api/series/{series_id}/category/{category_id}/params")
async def get_category_params(series_id: int, category_id: int, sash_id: Optional[int] = None):
    """Get GW/GH params for a series+category (and optionally sash for IQ580)"""
    conn = get_db()
    cursor = conn.cursor()
    
    if sash_id:
        cursor.execute('''
            SELECT * FROM series_category_params 
            WHERE series_id = ? AND category_id = ? AND sash_id = ?
        ''', (series_id, category_id, sash_id))
    else:
        cursor.execute('''
            SELECT * FROM series_category_params 
            WHERE series_id = ? AND category_id = ? AND sash_id IS NULL
        ''', (series_id, category_id))
    
    result = row_to_dict(cursor.fetchone())
    conn.close()
    return result


# ===================================
# CALCULATION ENDPOINT
# ===================================

class CalculationRequest(BaseModel):
    series_id: int
    category_id: int
    driver_id: int
    sash_id: int
    plaisio_width: float  # FW
    plaisio_height: float  # FH
    ug_value: float
    psi_value: float
    is_narrow: bool = False  # στενή επαλληλία checkbox
    has_rolo: bool = False
    rolo_height: Optional[float] = None
    ur_value: Optional[float] = None


@app.post("/api/calculate")
async def calculate(req: CalculationRequest):
    conn = get_db()
    cursor = conn.cursor()
    
    # Get series data
    cursor.execute("SELECT * FROM series WHERE id = ?", (req.series_id,))
    series = row_to_dict(cursor.fetchone())
    if not series:
        raise HTTPException(status_code=404, detail="Series not found")
    
    # Get category data
    cursor.execute("SELECT * FROM categories WHERE id = ?", (req.category_id,))
    category = row_to_dict(cursor.fetchone())
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    # Get sash data
    cursor.execute("SELECT * FROM sashes WHERE id = ?", (req.sash_id,))
    sash = row_to_dict(cursor.fetchone())
    if not sash:
        raise HTTPException(status_code=404, detail="Sash not found")
    
    # Get driver data
    cursor.execute("SELECT * FROM drivers WHERE id = ?", (req.driver_id,))
    driver = row_to_dict(cursor.fetchone())
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")
    
    # Get GW/GH params
    # For IQ580 (series_id=5), we need sash-specific params
    if req.series_id == 5:
        cursor.execute('''
            SELECT * FROM series_category_params 
            WHERE series_id = ? AND category_id = ? AND sash_id = ?
        ''', (req.series_id, req.category_id, req.sash_id))
    else:
        cursor.execute('''
            SELECT * FROM series_category_params 
            WHERE series_id = ? AND category_id = ? AND sash_id IS NULL
        ''', (req.series_id, req.category_id))
    
    params = row_to_dict(cursor.fetchone())
    if not params:
        raise HTTPException(status_code=404, detail="Category params not found for this series")
    
    conn.close()
    
    # === CALCULATIONS ===
    
    # Get values
    a = series['a']
    b = sash['b_override'] if sash['b_override'] else series['b']
    x = series['x']
    uf1 = series['uf1']
    uf2 = series['uf2']
    e = series['e']  # Akentrou value (normal)
    f = series['f']  # For Φιλητό
    e_narrow = series['e_narrow']  # Akentrou value (narrow)
    f_narrow = series['f_narrow']  # For Φιλητό (narrow)
    num_glasses = category['num_glasses']
    has_special = category['has_special_calculation']
    
    # =========================================
    # INPUT VALUES
    # =========================================
    # FW, FH: Frame dimensions (mm)
    # Ug: Glass U-value (W/m2K)
    # Psi: Linear thermal transmittance (W/mK)
    FW = req.plaisio_width    # mm
    FH_original = req.plaisio_height   # mm (original height)
    Ug = req.ug_value         # W/m2K
    Psi = req.psi_value       # W/mK
    
    # =========================================
    # ROLO HEIGHT ADJUSTMENT
    # =========================================
    # If Rolo is selected, FH becomes FH' = FH - rolo_height
    Ar = None
    Uw_open = None
    Uw_closed = None
    
    if req.has_rolo and req.rolo_height:
        FH = FH_original - req.rolo_height  # FH' = effective height (mm)
        Ar = (FW * req.rolo_height) / 1_000_000  # Roller area (m2)
    else:
        FH = FH_original  # Use original height
    
    # =========================================
    # GW/GH PARAMETERS (from database)
    # =========================================
    gw_divisor = params['gw_divisor']
    gw_offset = params['narrow_gw_offset'] if req.is_narrow and params['narrow_gw_offset'] else params['gw_offset']
    gh_offset = params['gh_offset']
    
    # =========================================
    # CALCULATIONS - LENGTHS (mm to m where noted)
    # =========================================
    # l: Profile depth (m) - converted from mm
    l = (a + b - x) / 1000  # mm to m
    
    # GW, GH: Glass dimensions (mm) - using adjusted FH if rolo
    GW = (FW / gw_divisor) - gw_offset  # mm
    GH = FH - gh_offset                  # mm
    
    # Kentro_height: Center profile height (mm)
    Kentro_height = FH - (2 * l * 1000)  # mm (l converted back to mm)
    kentro_width = GW                     # mm
    
    # =========================================
    # AKENTROU VALUE SELECTION
    # =========================================
    # e or e_narrow based on narrow checkbox (mm)
    if req.is_narrow and e_narrow:
        akentrou_value = e_narrow  # mm
    else:
        akentrou_value = e         # mm
    
    # =========================================
    # CALCULATIONS - AREAS (mm2 to m2)
    # =========================================
    # Akoufomatos: Total frame area (m2) - using adjusted FH
    Akoufomatos = (FH * FW) / 1_000_000  # mm2 to m2
    
    # Aw: Window area (m2) - same as Akoufomatos
    Aw = Akoufomatos  # m2
    
    # Af1: Frame perimeter area (m2)
    Af1 = Akoufomatos - ((FH/1000 - 2*l) * (FW/1000 - 2*l))  # m2
    
    # Af2: Center mullion area x (num_glasses - 1) (m2)
    Af2 = (num_glasses - 1) * (Kentro_height * akentrou_value) / 1_000_000  # mm2 to m2
    
    # Aff2: Center mullion area x (num_glasses - 2) for Filitou (m2)
    Aff2 = (num_glasses - 2) * (Kentro_height * akentrou_value) / 1_000_000  # mm2 to m2
    
    # Af: Total frame area (m2)
    Af = Af1 + Af2  # m2
    
    # Ag: Glass area (m2)
    Ag = Akoufomatos - Af  # m2
    
    # =========================================
    # CALCULATIONS - PERIMETER (mm to m)
    # =========================================
    # Ig: Glass perimeter x num_glasses (m)
    Ig = (2 * GH + 2 * GW) * num_glasses / 1000  # mm to m
    
    # =========================================
    # CALCULATIONS - U-VALUE
    # =========================================
    # Afilitou: Special area for Filitou calculation (m2)
    Afilitou = None
    
    if has_special:
        # Filitou (Tetrafyllo Filitou) calculation
        # Uses Aff2 and adds Afilitou x Uff term
        afilitou_value = f_narrow if (req.is_narrow and f_narrow) else f  # mm
        Afilitou = (Kentro_height * afilitou_value) / 1_000_000 if afilitou_value else 0  # mm2 to m2
        Uff = uf1  # W/m2K
        
        # Af x Uf for Filitou (W/K)
        Af_Uf = (Af1 * uf1) + (Aff2 * uf2) + (Afilitou * Uff)
    else:
        # Standard calculation
        # Af x Uf (W/K)
        Af_Uf = (Af1 * uf1) + (Af2 * uf2)
    
    # Uw: Overall U-value (W/m2K) - calculated with FH' if rolo
    # Formula: Uw = (Af x Uf + Ag x Ug + Ig x Psi) / Aw
    Uw = (Af_Uf + (Ag * Ug) + (Ig * Psi)) / Aw  # W/m2K
    
    # =========================================
    # ROLO (ROLLER SHUTTER) U-VALUES
    # =========================================
    if req.has_rolo and req.rolo_height and req.ur_value:
        # Uw and Aw are already calculated with FH' (adjusted height)
        # Now calculate Uw_open including roller area
        # Formula: Uw_open = (Uw * Aw + Ar * Ur) / (Aw + Ar)
        Uw_open = (Uw * Aw + Ar * req.ur_value) / (Aw + Ar)
        
        # Uw_closed: U-value when roller is closed
        # Formula: Uw_closed = 1 / ((1/Uw_open) + 0.15)
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
        # Debug info - ALL variables
        "debug": {
            # Input values
            "input_FW": FW,
            "input_FH_original": FH_original,
            "input_FH_effective": FH,
            "rolo_height": req.rolo_height if req.has_rolo else None,
            "Ug": Ug,
            "Psi": Psi,
            # Series values
            "a": a,
            "b": b,
            "x": x,
            "uf1": uf1,
            "uf2": uf2,
            "e": e,
            "f": f,
            "e_narrow": e_narrow,
            "f_narrow": f_narrow,
            # Params values
            "gw_divisor": gw_divisor,
            "gw_offset": gw_offset,
            "gh_offset": gh_offset,
            "narrow_gw_offset": params['narrow_gw_offset'],
            # Calculated intermediate values
            "l": round(l, 4),
            "GW": round(GW, 4),
            "GH": round(GH, 4),
            "Kentro_height": round(Kentro_height, 4),
            "kentro_width": round(kentro_width, 4),
            "akentrou_value": akentrou_value,
            # Areas
            "Akoufomatos": round(Akoufomatos, 6),
            "Af1": round(Af1, 6),
            "Af2": round(Af2, 6),
            "Aff2": round(Aff2, 6),
            "Af": round(Af, 6),
            "Ag": round(Ag, 6),
            "Aw": round(Aw, 6),
            # Perimeter
            "Ig": round(Ig, 6),
            # U-value calculations
            "Af_Uf": round(Af_Uf, 6),
            "Afilitou": round(Afilitou, 6) if Afilitou else None,
            "Ar": round(Ar, 6) if Ar else None,
            "Uw": round(Uw, 6),
            "Uw_open": round(Uw_open, 6) if Uw_open else None,
            "Uw_closed": round(Uw_closed, 6) if Uw_closed else None,
            # Category info
            "num_glasses": num_glasses,
            "has_special": has_special,
            "is_narrow": req.is_narrow,
        }
    }


# ===================================
# ADMIN API - GET ALL DATA
# ===================================

@app.get("/api/admin/all-data")
async def get_all_data():
    conn = get_db()
    cursor = conn.cursor()
    
    data = {}
    
    cursor.execute("SELECT * FROM types")
    data['types'] = rows_to_list(cursor.fetchall())
    
    cursor.execute("SELECT * FROM categories")
    data['categories'] = rows_to_list(cursor.fetchall())
    
    cursor.execute("SELECT * FROM series")
    data['series'] = rows_to_list(cursor.fetchall())
    
    cursor.execute("SELECT * FROM drivers")
    data['drivers'] = rows_to_list(cursor.fetchall())
    
    cursor.execute("SELECT * FROM driver_categories")
    data['driver_categories'] = rows_to_list(cursor.fetchall())
    
    cursor.execute("SELECT * FROM sashes")
    data['sashes'] = rows_to_list(cursor.fetchall())
    
    cursor.execute("SELECT * FROM series_category_params")
    data['series_category_params'] = rows_to_list(cursor.fetchall())
    
    conn.close()
    return data


# ===================================
# ADMIN API - UPDATE ENDPOINTS
# ===================================

class UpdateSeriesRequest(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    a: Optional[float] = None
    b: Optional[float] = None
    x: Optional[float] = None
    uf1: Optional[float] = None
    uf2: Optional[float] = None
    e: Optional[float] = None
    f: Optional[float] = None
    e_narrow: Optional[float] = None
    f_narrow: Optional[float] = None
    image_url: Optional[str] = None


@app.put("/api/admin/series/{series_id}")
async def update_series(series_id: int, req: UpdateSeriesRequest):
    conn = get_db()
    cursor = conn.cursor()
    
    updates = []
    values = []
    
    for field in ['name', 'code', 'a', 'b', 'x', 'uf1', 'uf2', 'e', 'f', 'e_narrow', 'f_narrow', 'image_url']:
        val = getattr(req, field)
        if val is not None:
            updates.append(f"{field} = ?")
            values.append(val)
    
    if updates:
        values.append(series_id)
        cursor.execute(f"UPDATE series SET {', '.join(updates)} WHERE id = ?", values)
        conn.commit()
    
    cursor.execute("SELECT * FROM series WHERE id = ?", (series_id,))
    result = row_to_dict(cursor.fetchone())
    conn.close()
    return result


class UpdateCategoryRequest(BaseModel):
    name: Optional[str] = None
    num_glasses: Optional[int] = None
    has_special_calculation: Optional[bool] = None
    image_url: Optional[str] = None


@app.put("/api/admin/categories/{category_id}")
async def update_category(category_id: int, req: UpdateCategoryRequest):
    conn = get_db()
    cursor = conn.cursor()
    
    updates = []
    values = []
    
    for field in ['name', 'num_glasses', 'has_special_calculation', 'image_url']:
        val = getattr(req, field)
        if val is not None:
            updates.append(f"{field} = ?")
            values.append(val)
    
    if updates:
        values.append(category_id)
        cursor.execute(f"UPDATE categories SET {', '.join(updates)} WHERE id = ?", values)
        conn.commit()
    
    cursor.execute("SELECT * FROM categories WHERE id = ?", (category_id,))
    result = row_to_dict(cursor.fetchone())
    conn.close()
    return result


class UpdateParamsRequest(BaseModel):
    gw_divisor: Optional[float] = None
    gw_offset: Optional[float] = None
    gh_offset: Optional[float] = None
    narrow_gw_offset: Optional[float] = None


@app.put("/api/admin/series-category-params/{param_id}")
async def update_params(param_id: int, req: UpdateParamsRequest):
    conn = get_db()
    cursor = conn.cursor()
    
    updates = []
    values = []
    
    for field in ['gw_divisor', 'gw_offset', 'gh_offset', 'narrow_gw_offset']:
        val = getattr(req, field)
        if val is not None:
            updates.append(f"{field} = ?")
            values.append(val)
    
    if updates:
        values.append(param_id)
        cursor.execute(f"UPDATE series_category_params SET {', '.join(updates)} WHERE id = ?", values)
        conn.commit()
    
    cursor.execute("SELECT * FROM series_category_params WHERE id = ?", (param_id,))
    result = row_to_dict(cursor.fetchone())
    conn.close()
    return result


@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "database": DB_PATH}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
