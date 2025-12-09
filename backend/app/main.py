from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from app.database import Base, engine
from app.routers import pdf, orders, auth

app = FastAPI(
    title="MT Colectivo API",
    docs_url="/secret-docs",
    redoc_url=None,
    openapi_url="/secret-openapi.json"
)

@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)
    # mini-migración
    with engine.connect() as conn:
        cols = [row[1] for row in conn.execute(text("PRAGMA table_info('orders')")).fetchall()]
        if "subtotal" not in cols:
            conn.execute(text("ALTER TABLE orders ADD COLUMN subtotal REAL"))
            conn.commit()

# Monta SIN prefijo extra (los routers ya tienen prefix)
app.include_router(auth.router)    # si auth.router ya tiene prefix="/auth"
app.include_router(pdf.router)     # pdf.router ya trae prefix="/pdf"
app.include_router(orders.router)  # orders.router ya trae prefix="/orders"

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health():
    return {"status": "ok"}