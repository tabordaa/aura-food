from fastapi import APIRouter, Depends
from typing import List
from sqlalchemy.orm import Session
from .. import database, schemas, models

router = APIRouter(tags=['Products'])

@router.get("", response_model=List[schemas.ProductResponse])
def get_products(db: Session = Depends(database.get_db)):
    products = db.query(models.Product).all()
    return products
