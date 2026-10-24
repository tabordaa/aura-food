
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .. import database, models, schemas

router = APIRouter(tags=['Products'])

@router.get("", response_model=list[schemas.ProductResponse])
def get_products(db: Session = Depends(database.get_db)):
    products = db.query(models.Product).all()
    return products
