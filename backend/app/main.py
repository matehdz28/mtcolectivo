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
    with engine.connect() as conn:
        cols = [row[1] for row in conn.execute(text("PRAGMA table_info('orders')")).fetchall()]
        if "subtotal" not in cols:
            conn.execute(text("ALTER TABLE orders ADD COLUMN subtotal REAL"))
            conn.commit()

# =======================
# ROUTERS
# =======================

# 🔐 Login / Auth
app.include_router(auth.router)

# 📄 PDF — Requiere JWT
app.include_router(pdf.router)

# 🟢 PUBLICO: Google Forms puede entrar aquí
app.include_router(orders.public_router)

# 🔐 PRIVADO: Panel administrativo protegido con JWT
app.include_router(orders.private_router)

# =======================
# CORS
# =======================
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],     # si quieres solo localhost, ajusta aquí
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health():
    return {"status": "ok"}