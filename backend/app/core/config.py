from pathlib import Path

# All paths are anchored relative to this file so the backend works regardless of the
# working directory it's launched from (e.g. `uvicorn app.main:app` from backend/).
BACKEND_ROOT = Path(__file__).resolve().parent.parent.parent
DATA_DIR = BACKEND_ROOT / "data"
CASES_DIR = DATA_DIR / "cases"
MODELS_STORE_DIR = BACKEND_ROOT / "models_store"

CHECKPOINT_PATH = MODELS_STORE_DIR / "model.pt"
METRICS_PATH = MODELS_STORE_DIR / "metrics.json"

MODALITIES = ["t1", "t1ce", "t2", "flair"]

# Standard input size the 3D U-Net expects (D, H, W). Must match training/train_brats.py.
MODEL_INPUT_SHAPE = (128, 128, 128)

# BraTS label convention: 0 = background, 1 = NCR/NET, 2 = ED, 4 = ET.
CLASS_INFO = {
    "ncr": {"label_value": 1, "name": "Necrotic Core (NCR/NET)", "color": "#F97316", "channel": 0},
    "ed": {"label_value": 2, "name": "Edema (ED)", "color": "#FACC15", "channel": 1},
    "et": {"label_value": 4, "name": "Enhancing Tumor (ET)", "color": "#EF4444", "channel": 2},
}

CORS_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

APP_VERSION = "0.1.0"

for d in (DATA_DIR, CASES_DIR, MODELS_STORE_DIR):
    d.mkdir(parents=True, exist_ok=True)
