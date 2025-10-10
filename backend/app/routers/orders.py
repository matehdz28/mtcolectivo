from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models import Order

router = APIRouter(prefix="/orders", tags=["Orders"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Aceptar /orders  y /orders/
@router.get("", response_model=list[dict])
@router.get("/", response_model=list[dict])
def list_orders(db: Session = Depends(get_db)):
    orders = db.query(Order).order_by(Order.id.desc()).all()
    return [
    {
        "id": o.id,
        "nombre": o.nombre,
        "fecha": o.fecha,
        "dir_salida": o.dir_salida,
        "dir_destino": o.dir_destino,
        "hor_ida": o.hor_ida,
        "hor_regreso": o.hor_regreso,
        "duracion": o.duracion,
        "capacidadu": o.capacidadu,
        "subtotal": o.subtotal,         # ✅ nuevo campo
        "descuento": o.descuento,
        "total": o.total,
        "abonado": o.abonado,
        "fecha_abono": o.fecha_abono,
        "liquidar": o.liquidar,
        "created_at": o.created_at.isoformat() if o.created_at else None,
    }
    for o in orders
]

@router.delete("/{order_id}", status_code=204)
def delete_order(order_id: int, db: Session = Depends(get_db)):
    order = db.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    db.delete(order)
    db.commit()
    return Response(status_code=204)