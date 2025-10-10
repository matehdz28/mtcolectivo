from sqlalchemy import Column, Integer, String, Float, DateTime
from datetime import datetime
from app.database import Base  # ✅ ya no con ".."

class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    # datos generales
    nombre = Column(String, nullable=True)
    fecha = Column(String, nullable=True)
    dir_salida = Column(String, nullable=True)
    dir_destino = Column(String, nullable=True)
    hor_ida = Column(String, nullable=True)
    hor_regreso = Column(String, nullable=True)
    duracion = Column(String, nullable=True)
    capacidadu = Column(String, nullable=True)

    # montos
    subtotal = Column(Float, nullable=True)   # 👈 NUEVO
    descuento = Column(Float, nullable=True)
    total = Column(Float, nullable=True)      # total final (subtotal - descuento)
    abonado = Column(Float, nullable=True)
    fecha_abono = Column(String, nullable=True)
    liquidar = Column(Float, nullable=True)   # total - abonado

    created_at = Column(DateTime, default=datetime.utcnow)

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    fullname = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)