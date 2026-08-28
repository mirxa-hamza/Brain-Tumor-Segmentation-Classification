from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse

from app.schemas import CaseDetail, CaseSummary, PredictionResult
from app.services import case_store
from app.services.inference import run_inference

router = APIRouter(tags=["cases"])


@router.get("/api/cases", response_model=list[CaseSummary])
def list_cases() -> list[dict]:
    return case_store.list_cases()


@router.post("/api/cases", response_model=CaseDetail)
async def upload_case(name: str = Form(...), files: list[UploadFile] = File(...)) -> dict:
    if not name.strip():
        raise HTTPException(status_code=400, detail="Case name is required")
    if not files:
        raise HTTPException(status_code=400, detail="At least one file is required")
    return await case_store.create_case(name.strip(), files)


@router.get("/api/cases/{case_id}", response_model=CaseDetail)
def get_case(case_id: str) -> dict:
    return case_store.get_case(case_id)


@router.delete("/api/cases/{case_id}")
def delete_case(case_id: str) -> dict:
    case_store.delete_case(case_id)
    return {"ok": True}


@router.get("/api/cases/{case_id}/volume/{modality}")
def get_volume(case_id: str, modality: str) -> FileResponse:
    path = case_store.volume_path(case_id, modality)
    return FileResponse(path, media_type="application/gzip", filename=f"{modality}.nii.gz")


@router.get("/api/cases/{case_id}/segmentation")
def get_segmentation(case_id: str) -> FileResponse:
    path = case_store.segmentation_path(case_id)
    return FileResponse(path, media_type="application/gzip", filename="segmentation.nii.gz")


@router.post("/api/cases/{case_id}/predict", response_model=PredictionResult)
def predict(case_id: str) -> dict:
    case_store.update_case(case_id, status="processing")
    try:
        result = run_inference(case_id)
    except Exception as exc:  # noqa: BLE001
        case_store.update_case(case_id, status="failed", error_message=str(exc))
        raise HTTPException(status_code=500, detail=f"Prediction failed: {exc}") from exc

    case_store.update_case(case_id, status="completed", has_segmentation=True, error_message=None)
    return result
