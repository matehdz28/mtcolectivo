from fastapi import APIRouter, Depends, HTTPException, Response, Request
from sqlalchemy.orm import Session
from datetime import timezone
import os

from app.database import SessionLocal
from app.models import Order
from app.deps import get_current_user
from app.schemas import User

# ================================
# 🔐 API KEY para Google Forms
# ================================
FORM_API_KEY = os.getenv("FORM_API_KEY", "super-secret-key")


# ================================
# 🟢 ENDPOINT PÚBLICO PARA GOOGLE FORMS
# (NO requiere JWT)
# ================================
public_router = APIRouter(prefix="/orders", tags=["Orders – Public"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@public_router.post("/form-submit", include_in_schema=False)
def form_submit(request: Request, payload: dict, db: Session = Depends(get_db)):
    # Seguridad: validar API KEY
    api_key = request.headers.get("x-api-key")
    if api_key != FORM_API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API key")

    # Crear Order
    order = Order(
        nombre=payload.get("nombre"),
        fecha=payload.get("fecha"),
        dir_salida=payload.get("direccion_salida"),
        dir_destino=payload.get("destino"),
        hor_ida=payload.get("hora_salida"),
        hor_regreso=payload.get("hora_regreso"),
        duracion=None,
        capacidadu=None,
        subtotal=None,
        descuento=None,
        total=None,
        abonado=None,
        fecha_abono=None,
        liquidar=None,
    )

    db.add(order)
    db.commit()
    db.refresh(order)

    return {"status": "ok", "order_id": order.id}


# ================================
# 🔐 RUTAS PRIVADAS (requieren JWT)
# ================================
private_router = APIRouter(
    prefix="/orders",
    tags=["Orders"],
    dependencies=[Depends(get_current_user)]
)

def serialize_order(o: Order) -> dict:
    if o.created_at:
        dt = o.created_at
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        else:
            dt = dt.astimezone(timezone.utc)
        created_iso = dt.isoformat(timespec="seconds").replace("+00:00", "Z")
    else:
        created_iso = None

    return {
        "id": o.id,
        "nombre": o.nombre,
        "fecha": o.fecha,
        "dir_salida": o.dir_salida,
        "dir_destino": o.dir_destino,
        "hor_ida": o.hor_ida,
        "hor_regreso": o.hor_regreso,
        "duracion": o.duracion,
        "capacidadu": o.capacidadu,
        "subtotal": o.subtotal,
        "descuento": o.descuento,
        "total": o.total,
        "abonado": o.abonado,
        "fecha_abono": o.fecha_abono,
        "liquidar": o.liquidar,
        "created_at": created_iso,
    }

@private_router.get("", response_model=list[dict])
@private_router.get("/", response_model=list[dict])
def list_orders(db: Session = Depends(get_db)):
    orders = db.query(Order).order_by(Order.id.desc()).all()
    return [serialize_order(o) for o in orders]

@private_router.delete("/{order_id}", status_code=204)
def delete_order(order_id: int, db: Session = Depends(get_db)):
    order = db.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    db.delete(order)
    db.commit()
    return Response(status_code=204)