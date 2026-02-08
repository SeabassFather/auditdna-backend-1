"""
Results API Endpoints
Author: SeabassFather (SG)
Date: 2025-10-27 23:23:34 UTC
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from .database import db

router = APIRouter()

class OrderCreate(BaseModel):
    order_id: str
    traceability_id: str
    customer_name: str
    email: str
    phone: Optional[str] = None
    company_name: Optional[str] = None
    farm_name: Optional[str] = None
    field_number: Optional[str] = None
    acreage: Optional[float] = None
    gps_latitude: Optional[float] = None
    gps_longitude: Optional[float] = None
    sample_type: str
    module_type: str
    total_price: float
    selected_tests: List[dict] = []

class TestResultCreate(BaseModel):
    order_id: str
    test_id: str
    parameter: str
    result_value: Optional[float] = None
    result_text: Optional[str] = None
    result_unit: str
    reference_range_text: str
    interpretation: str
    interpretation_color: Optional[str] = "green"
    lab_technician: Optional[str] = None

@router.post("/orders", tags=["orders"])
async def create_order(order: OrderCreate):
    """Store new order in database"""
    query = """
        INSERT INTO orders (order_id, traceability_id, customer_name, email, phone, 
                          company_name, farm_name, field_number, acreage, gps_latitude, 
                          gps_longitude, sample_type, module_type, total_price, status)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'pending')
    """
    params = (
        order.order_id, order.traceability_id, order.customer_name, order.email,
        order.phone, order.company_name, order.farm_name, order.field_number, 
        order.acreage, order.gps_latitude, order.gps_longitude, order.sample_type,
        order.module_type, order.total_price
    )
    
    try:
        db.execute_query(query, params)
        
        # Insert selected tests
        if order.selected_tests:
            test_query = """
                INSERT INTO test_selections (order_id, test_id, test_name, test_category, test_price)
                VALUES (%s, %s, %s, %s, %s)
            """
            for test in order.selected_tests:
                db.execute_query(test_query, (
                    order.order_id, test.get('id'), test.get('name'), 
                    test.get('category'), test.get('price')
                ))
        
        return {"status": "success", "order_id": order.order_id, "message": "Order created successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.get("/results/{order_id}", tags=["results"])
async def get_results(order_id: str):
    """Retrieve order and test results"""
    order_query = "SELECT * FROM orders WHERE order_id = %s OR traceability_id = %s"
    order = db.fetch_all(order_query, (order_id, order_id))
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    order_data = order[0]
    
    # Get test selections
    tests_query = "SELECT * FROM test_selections WHERE order_id = %s"
    selected_tests = db.fetch_all(tests_query, (order_data['order_id'],))
    
    # Get test results
    results_query = "SELECT * FROM test_results WHERE order_id = %s ORDER BY analysis_date DESC"
    results = db.fetch_all(results_query, (order_data['order_id'],))
    
    # Get recommendations
    recs_query = "SELECT * FROM recommendations WHERE order_id = %s ORDER BY recommendation_priority DESC"
    recommendations = db.fetch_all(recs_query, (order_data['order_id'],))
    
    # Get reports
    reports_query = "SELECT * FROM reports WHERE order_id = %s ORDER BY generated_date DESC"
    reports = db.fetch_all(reports_query, (order_data['order_id'],))
    
    return {
        "order": order_data,
        "selected_tests": selected_tests,
        "results": results,
        "recommendations": recommendations,
        "reports": reports,
        "status": order_data['status'],
        "results_count": len(results)
    }

@router.post("/results", tags=["results"])
async def add_test_result(result: TestResultCreate):
    """Lab technician adds test result"""
    query = """
        INSERT INTO test_results (order_id, test_id, parameter, result_value, result_text,
                                result_unit, reference_range_text, interpretation, 
                                interpretation_color, lab_technician, analysis_date)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
    """
    params = (
        result.order_id, result.test_id, result.parameter, result.result_value,
        result.result_text, result.result_unit, result.reference_range_text, 
        result.interpretation, result.interpretation_color, result.lab_technician
    )
    
    try:
        result_id = db.execute_query(query, params)
        
        # Check if all tests are complete, update order status
        check_query = """
            SELECT COUNT(*) as selected, 
                   (SELECT COUNT(*) FROM test_results WHERE order_id = %s) as completed
            FROM test_selections WHERE order_id = %s
        """
        counts = db.fetch_one(check_query, (result.order_id, result.order_id))
        
        if counts and counts['selected'] <= counts['completed']:
            update_query = "UPDATE orders SET status = 'completed', completion_date = NOW() WHERE order_id = %s"
            db.execute_query(update_query, (result.order_id,))
        
        return {"status": "success", "result_id": result_id, "message": "Test result added successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.get("/orders/pending", tags=["orders"])
async def get_pending_orders():
    """Get all pending orders for lab technicians"""
    query = """
        SELECT o.*, COUNT(ts.id) as test_count
        FROM orders o
        LEFT JOIN test_selections ts ON o.order_id = ts.order_id
        WHERE o.status IN ('pending', 'processing')
        GROUP BY o.order_id
        ORDER BY o.order_date DESC
    """
    orders = db.fetch_all(query)
    return {"orders": orders, "count": len(orders)}

@router.get("/health/database", tags=["health"])
async def check_database():
    """Check database connectivity"""
    is_connected = db.test_connection()
    return {"status": "healthy" if is_connected else "unhealthy", "database": "auditdna"}