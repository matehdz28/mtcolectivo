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
@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)

    # mini-migración para columnas que pudieron faltar
    with engine.connect() as conn:
        rows = conn.execute(text("PRAGMA table_info('orders')")).fetchall()
        cols = [row[1] for row in rows]

        # nombre_columna: tipo_sqlite
        needed_cols = {
            "dir_salida": "TEXT",
            "dir_destino": "TEXT",
            "hor_ida": "TEXT",
            "hor_regreso": "TEXT",
            "duracion": "TEXT",
            "capacidadu": "TEXT",
            "subtotal": "REAL",
            "descuento": "REAL",
            "total": "REAL",
            "abonado": "REAL",
            "fecha_abono": "TEXT",
            "liquidar": "REAL",
        }

        for col_name, col_type in needed_cols.items():
            if col_name not in cols:
                conn.execute(text(f"ALTER TABLE orders ADD COLUMN {col_name} {col_type}"))

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