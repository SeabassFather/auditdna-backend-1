"""SQLite Database Connection - Author: SeabassFather (SG)"""
import sqlite3
from contextlib import contextmanager
import os

class DatabaseConnection:
    def __init__(self):
        self.db_path = os.path.join(os.path.dirname(__file__), "..", "auditdna.db")
        print(f"DATABASE: SQLite at {self.db_path}")
        self.initialize_database()
    
    @contextmanager
    def get_connection(self):
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        try:
            yield conn
        finally:
            conn.close()
    
    def execute_query(self, query, params=None):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(query, params or ())
            conn.commit()
            return cursor.lastrowid
    
    def fetch_all(self, query, params=None):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(query, params or ())
            return [dict(row) for row in cursor.fetchall()]
    
    def fetch_one(self, query, params=None):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(query, params or ())
            row = cursor.fetchone()
            return dict(row) if row else None
    
    def initialize_database(self):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("CREATE TABLE IF NOT EXISTS orders (order_id TEXT PRIMARY KEY, traceability_id TEXT UNIQUE NOT NULL, customer_name TEXT NOT NULL, email TEXT NOT NULL, phone TEXT, company_name TEXT, farm_name TEXT, field_number TEXT, acreage REAL, gps_latitude REAL, gps_longitude REAL, sample_type TEXT NOT NULL, module_type TEXT NOT NULL, order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP, status TEXT DEFAULT 'pending', total_price REAL)")
            cursor.execute("CREATE TABLE IF NOT EXISTS test_results (id INTEGER PRIMARY KEY AUTOINCREMENT, order_id TEXT NOT NULL, test_id TEXT NOT NULL, parameter TEXT NOT NULL, result_value REAL, result_text TEXT, result_unit TEXT, reference_range_text TEXT, interpretation TEXT, interpretation_color TEXT DEFAULT 'green', analysis_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (order_id) REFERENCES orders(order_id))")
            cursor.execute("CREATE TABLE IF NOT EXISTS test_selections (id INTEGER PRIMARY KEY AUTOINCREMENT, order_id TEXT NOT NULL, test_id TEXT NOT NULL, test_name TEXT NOT NULL, test_category TEXT, test_price REAL, FOREIGN KEY (order_id) REFERENCES orders(order_id))")
            cursor.execute("CREATE TABLE IF NOT EXISTS reports (id INTEGER PRIMARY KEY AUTOINCREMENT, order_id TEXT NOT NULL, pdf_file_path TEXT, generated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP, download_count INTEGER DEFAULT 0, FOREIGN KEY (order_id) REFERENCES orders(order_id))")
            cursor.execute("INSERT OR IGNORE INTO orders (order_id, traceability_id, customer_name, email, sample_type, module_type, status, total_price, farm_name, field_number, gps_latitude, gps_longitude) VALUES ('DEMO-WATER-001', 'TRACE-DEMO-001', 'Demo Customer', 'demo@auditdna.com', 'water', 'water', 'completed', 250.00, 'Green Valley Farms', 'A-12', 36.678889, -121.655556)")
            cursor.execute("INSERT OR IGNORE INTO test_results (order_id, test_id, parameter, result_value, result_unit, reference_range_text, interpretation, interpretation_color) VALUES ('DEMO-WATER-001', 'water-ph', 'pH Level', 7.2, 'pH units', '6.5-8.5 optimal', 'SAFE', 'green')")
            cursor.execute("INSERT OR IGNORE INTO test_results (order_id, test_id, parameter, result_value, result_unit, reference_range_text, interpretation, interpretation_color) VALUES ('DEMO-WATER-001', 'water-nitrate', 'Nitrate', 8.5, 'ppm', '< 10 ppm safe', 'SAFE', 'green')")
            cursor.execute("INSERT OR IGNORE INTO test_results (order_id, test_id, parameter, result_value, result_unit, reference_range_text, interpretation, interpretation_color) VALUES ('DEMO-WATER-001', 'water-ecoli', 'E. coli', 0, 'CFU/100mL', '0 CFU/100mL required', 'SAFE', 'green')")
            conn.commit()
            print("DATABASE: Initialized with 4 tables and demo data")
    
    def test_connection(self):
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT COUNT(*) as count FROM orders")
                result = cursor.fetchone()
                print(f"DATABASE: Connection successful ({result['count']} orders)")
                return True
        except Exception as e:
            print(f"DATABASE ERROR: {e}")
            return False

db = DatabaseConnection()
