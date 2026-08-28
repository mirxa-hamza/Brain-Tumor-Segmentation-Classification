"""Case storage: turns an upload (zip or loose files) into a normalized case directory and
tracks metadata as a simple JSON sidecar per case (no database needed for a single-user local app)."""

import json
import re
import shutil
import uuid
import zipfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from fastapi import HTTPException, UploadFile

from app.core.config import CASES_DIR, MODALITIES

_MODALITY_PATTERNS = {
    "t1ce": re.compile(r"(^|[_\-.])t1ce([_\-.]|$)", re.IGNORECASE),
    "t1": re.compile(r"(^|[_\-.])t1([_\-.]|$)", re.IGNORECASE),
    "t2": re.compile(r"(^|[_\-.])t2([_\-.]|$)", re.IGNORECASE),
    "flair": re.compile(r"(^|[_\-.])flair([_\-.]|$)", re.IGNORECASE),
    "seg": re.compile(r"(^|[_\-.])seg([_\-.]|$)", re.IGNORECASE),
}


def guess_modality(filename: str) -> Optional[str]:
    lower = filename.lower()
    if not (lower.endswith(".nii.gz") or lower.endswith(".nii")):
        return None
    if "t1ce" in lower or _MODALITY_PATTERNS["t1ce"].search(lower):
        return "t1ce"
    for key in ("t1", "t2", "flair", "seg"):
        if _MODALITY_PATTERNS[key].search(lower):
            return key
    return None


def _case_dir(case_id: str) -> Path:
    return CASES_DIR / case_id


def _meta_path(case_id: str) -> Path:
    return _case_dir(case_id) / "meta.json"


def _write_meta(case_id: str, meta: dict) -> None:
    _meta_path(case_id).write_text(json.dumps(meta, indent=2, default=str))


def _read_meta(case_id: str) -> dict:
    path = _meta_path(case_id)
    if not path.exists():
        raise HTTPException(status_code=404, detail=f"Case '{case_id}' not found")
    return json.loads(path.read_text())


async def create_case(name: str, files: list[UploadFile]) -> dict:
    case_id = uuid.uuid4().hex[:12]
    case_dir = _case_dir(case_id)
    raw_dir = case_dir / "raw"
    raw_dir.mkdir(parents=True, exist_ok=True)

    found: dict[str, Path] = {}

    zip_files = [f for f in files if (f.filename or "").lower().endswith(".zip")]
    loose_files = [f for f in files if f not in zip_files]

    try:
        for upload in zip_files:
            tmp_zip = case_dir / "_upload.zip"
            with open(tmp_zip, "wb") as fh:
                shutil.copyfileobj(upload.file, fh)
            extract_dir = case_dir / "_extracted"
            with zipfile.ZipFile(tmp_zip) as zf:
                zf.extractall(extract_dir)
            tmp_zip.unlink(missing_ok=True)

            for path in extract_dir.rglob("*"):
                if not path.is_file():
                    continue
                modality = guess_modality(path.name)
                if modality and modality != "seg" and modality not in found:
                    found[modality] = path
            # keep _extracted around isn't necessary once files are copied below

        for upload in loose_files:
            modality = guess_modality(upload.filename or "")
            if not modality or modality == "seg":
                continue
            dest = case_dir / f"_loose_{modality}.nii.gz"
            with open(dest, "wb") as fh:
                shutil.copyfileobj(upload.file, fh)
            found[modality] = dest

        if not found:
            raise HTTPException(
                status_code=400,
                detail="No recognizable T1/T1-CE/T2/FLAIR .nii.gz files were found in the upload.",
            )

        for modality, src_path in found.items():
            dest = raw_dir / f"{modality}.nii.gz"
            shutil.copy2(src_path, dest)

        extract_dir = case_dir / "_extracted"
        if extract_dir.exists():
            shutil.rmtree(extract_dir, ignore_errors=True)
        for loose_tmp in case_dir.glob("_loose_*.nii.gz"):
            loose_tmp.unlink(missing_ok=True)

        modalities_present = [m for m in MODALITIES if (raw_dir / f"{m}.nii.gz").exists()]

        meta = {
            "case_id": case_id,
            "name": name,
            "status": "uploaded",
            "modalities_present": modalities_present,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "has_segmentation": False,
            "error_message": None,
        }
        _write_meta(case_id, meta)
        return meta

    except HTTPException:
        shutil.rmtree(case_dir, ignore_errors=True)
        raise
    except Exception as exc:  # noqa: BLE001
        shutil.rmtree(case_dir, ignore_errors=True)
        raise HTTPException(status_code=500, detail=f"Failed to process upload: {exc}") from exc


def list_cases() -> list[dict]:
    cases = []
    if not CASES_DIR.exists():
        return cases
    for case_dir in sorted(CASES_DIR.iterdir(), reverse=True):
        meta_file = case_dir / "meta.json"
        if meta_file.exists():
            cases.append(json.loads(meta_file.read_text()))
    cases.sort(key=lambda c: c["created_at"], reverse=True)
    return cases


def get_case(case_id: str) -> dict:
    return _read_meta(case_id)


def update_case(case_id: str, **fields) -> dict:
    meta = _read_meta(case_id)
    meta.update(fields)
    _write_meta(case_id, meta)
    return meta


def delete_case(case_id: str) -> None:
    case_dir = _case_dir(case_id)
    if not case_dir.exists():
        raise HTTPException(status_code=404, detail=f"Case '{case_id}' not found")
    shutil.rmtree(case_dir)


def volume_path(case_id: str, modality: str) -> Path:
    if modality not in MODALITIES:
        raise HTTPException(status_code=400, detail=f"Unknown modality '{modality}'")
    path = _case_dir(case_id) / "raw" / f"{modality}.nii.gz"
    if not path.exists():
        raise HTTPException(status_code=404, detail=f"Modality '{modality}' not available for this case")
    return path


def segmentation_path(case_id: str) -> Path:
    path = _case_dir(case_id) / "segmentation.nii.gz"
    if not path.exists():
        raise HTTPException(status_code=404, detail="No segmentation has been computed for this case yet")
    return path


def case_root(case_id: str) -> Path:
    return _case_dir(case_id)
