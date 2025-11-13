from datetime import datetime

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException

from backend.app.core.database import db
from backend.app.core.dependencies import get_admin_user

router = APIRouter(prefix="/api", tags=["products"])


def serialize_doc(doc: dict | None):
    if doc and "_id" in doc:
        doc["_id"] = str(doc["_id"])
    return doc


@router.get("/admin/products")
async def get_all_products():
    products = await db.products.find({}).to_list(1000)
    return [serialize_doc(p) for p in products]


@router.post("/admin/products", dependencies=[Depends(get_admin_user)])
async def create_product(product: dict, current_user: dict = Depends(get_admin_user)):
    product_dict = dict(product)
    product_dict["createdAt"] = datetime.utcnow()
    product_dict["createdBy"] = current_user["_id"]
    result = await db.products.insert_one(product_dict)
    return {"id": str(result.inserted_id), "message": "Product created successfully"}


@router.put("/admin/products/{product_id}", dependencies=[Depends(get_admin_user)])
async def update_product(product_id: str, product: dict):
    result = await db.products.update_one({"_id": ObjectId(product_id)}, {"$set": dict(product)})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"message": "Product updated successfully"}


@router.delete("/admin/products/{product_id}", dependencies=[Depends(get_admin_user)])
async def delete_product(product_id: str):
    result = await db.products.delete_one({"_id": ObjectId(product_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"message": "Product deleted successfully"}
