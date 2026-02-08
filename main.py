"""AuditDNA Backend API - Author: SeabassFather (SG)"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .results_api import router as results_router
from .database import db

app = FastAPI(title="AuditDNA API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(results_router, prefix="/api", tags=["api"])

@app.on_event("startup")
async def startup_event():
    print("=" * 50)
    print("AUDITDNA BACKEND STARTING...")
    print("=" * 50)
    db.test_connection()
    print("BACKEND READY!")
    print("=" * 50)

@app.get("/")
async def root():
    return {"message": "AuditDNA API - Results System Active", "version": "1.0.0", "author": "SeabassFather (SG)"}

@app.get("/health")
async def health():
    return {"status": "healthy", "database": "connected"}