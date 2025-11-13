from datetime import datetime

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from backend.app.core.database import db
from backend.app.core.dependencies import get_current_user, get_admin_user

router = APIRouter(prefix="/api", tags=["reports"])


def serialize_doc(doc: dict | None):
    if doc and "_id" in doc:
        doc["_id"] = str(doc["_id"])
    return doc


class Report(BaseModel):
    userId: str
    title: str
    reportType: str
    pdfData: str


class ReportUpload(BaseModel):
    userId: str
    title: str
    reportType: str
    pdfData: str


@router.get("/reports/my")
async def get_my_reports(current_user: dict = Depends(get_current_user)):
    reports = (
        await db.reports.find({"userId": ObjectId(current_user["_id"])})
        .sort("date", -1)
        .to_list(100)
    )
    for report in reports:
        report["userId"] = str(report["userId"])
        report["createdBy"] = str(report["createdBy"])
    return [serialize_doc(r) for r in reports]


@router.post("/reports", dependencies=[Depends(get_admin_user)])
async def create_report(report: Report, current_user: dict = Depends(get_admin_user)):
    report_dict = report.dict()
    report_dict["userId"] = ObjectId(report_dict["userId"])
    report_dict["createdBy"] = ObjectId(current_user["_id"])
    report_dict["date"] = datetime.utcnow()
    result = await db.reports.insert_one(report_dict)
    return {"id": str(result.inserted_id), "message": "Report created successfully"}


@router.post("/admin/reports/upload", dependencies=[Depends(get_admin_user)])
async def upload_report(report_data: ReportUpload, current_user: dict = Depends(get_admin_user)):
    user = await db.users.find_one({"_id": ObjectId(report_data.userId)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    report_dict = {
        "userId": ObjectId(report_data.userId),
        "title": report_data.title,
        "reportType": report_data.reportType,
        "pdfData": report_data.pdfData,
        "date": datetime.utcnow(),
        "createdBy": ObjectId(current_user["_id"]),
    }
    result = await db.reports.insert_one(report_dict)
    return {"id": str(result.inserted_id), "message": "Report uploaded successfully"}
