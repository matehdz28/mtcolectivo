from sqlalchemy.orm import Session
from . import models

def create_order(db: Session, data: dict):
    obj = models.Order(**data)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj