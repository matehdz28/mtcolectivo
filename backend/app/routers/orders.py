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

from datetime import datetime, timedelta

PRICE_TABLE = {
    6: 2500.00,
    14: 4500.00,
    20: 5500.00,
    45: 9500.00,
}

def assign_capacidad(pasajeros: int) -> int:
    if pasajeros <= 6:
        return 6
    elif pasajeros <= 14:
        return 14
    elif pasajeros <= 20:
        return 20
    else:
        return 45

def parse_time(t: str) -> datetime:
    """
    Convierte '3:22:00 a.m.' → datetime
    """
    t = t.replace("a.m.", "AM").replace("p.m.", "PM")
    return datetime.strptime(t.strip(), "%I:%M:%S %p")

def is_cantaritos(destino: str) -> bool:
    destino = destino.lower()
    keywords = ["cantaritos", "amatit", "tequila"]
    return any(k in destino for k in keywords)


# TABLAS DE TARIFAS ESPECIALES
CANTARITOS_PRICES = {
    "morning": {   # 9am – 4pm
        6:  {"normal": 2500, "desc": 2250},
        14: {"normal": 5000, "desc": 4500},
        20: {"normal": 6000, "desc": 5500},
    },
    "afternoon": {  # 1pm – 8pm
        6:  {"normal": 3000, "desc": 2500},
        14: {"normal": 5500, "desc": 5000},
        20: {"normal": 6500, "desc": 6000},
    }
}


def determine_cantaritos_price(capacidad: int, hora_salida: str) -> float:
    """
    Devuelve el precio correcto según hora y capacidad.
    """

    # Convertir hora “3:22:00 a.m.” → datetime
    t = parse_time(hora_salida)
    hour = t.hour

    # Determinar horario
    if 9 <= hour < 12:
        period = "morning"
    elif 13 <= hour < 16:
        period = "afternoon"
    else:
        # Si cae fuera, aplicar morning por default
        period = "morning"

    price_info = CANTARITOS_PRICES.get(period, {}).get(capacidad)

    if price_info is None:
        # No hay precio para esta capacidad → 0
        return 0.0
    
    # ¿Dejamos precio con descuento por default?
    return price_info["desc"]   # <<< usar precio recomendado


@public_router.post("/form-submit", include_in_schema=False)
def form_submit(request: Request, payload: dict, db: Session = Depends(get_db)):
    # --- Seguridad con API KEY ---
    api_key = request.headers.get("x-api-key")
    if api_key != FORM_API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API key")

    # --- Lectura de datos del formulario ---
    pasajeros_str = payload.get("personas", "0")
    pasajeros = int(pasajeros_str)

    hora_ida_raw = payload.get("hora_salida")
    hora_reg_raw = payload.get("hora_regreso")

    # --- Duration ---
    try:
        t1 = parse_time(hora_ida_raw)
        t2 = parse_time(hora_reg_raw)
        duracion = (t2 - t1).total_seconds() / 3600  # horas
        if duracion < 0:
            duracion += 24  # viaje cruza medianoche
    except:
        duracion = 0.0

    # --- Capacidad asignada ---
    capacidadu = assign_capacidad(pasajeros)

    # --- Precio total según capacidad ---
    destino = payload.get("destino", "").lower()
    if is_cantaritos(destino):
        total = determine_cantaritos_price(capacidadu, payload.get("hora_salida"))
    else:
        total = PRICE_TABLE.get(capacidadu, 0.0)

    # --- Crear orden ---
    order = Order(
        nombre=payload.get("nombre"),
        fecha=payload.get("fecha"),
        dir_salida=payload.get("direccion_salida"),
        dir_destino=payload.get("destino"),
        hor_ida=payload.get("hora_salida"),
        hor_regreso=payload.get("hora_regreso"),

        duracion=duracion,
        capacidadu=capacidadu,

        subtotal=total,
        descuento=0.0,
        total=total,           # Precio asignado
        abonado=0.0,
        fecha_abono=None,
        liquidar=total,
    )

    db.add(order)
    db.commit()
    db.refresh(order)

    return {
        "status": "ok",
        "order_id": order.id,
        "capacidad_asignada": capacidadu,
        "duracion_horas": duracion,
        "precio_total": total
    }


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