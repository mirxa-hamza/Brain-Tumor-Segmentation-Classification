# CLAUDE.md — NeuroScan AI

This file orients any Claude (or human) session working in this repository. Read it before making changes.

## What this project is

**NeuroScan AI** is a local, full-stack brain tumor **segmentation** web app built on the
[BraTS 2021 Task 1](https://www.kaggle.com/datasets/dschettler8845/brats-2021-task1) dataset.

- **Author:** Hamza Mustafa
- **Scope:** Multi-class tumor sub-region segmentation (Whole Tumor / Tumor Core / Enhancing Tumor)
  from 4-modality brain MRI (T1, T1ce, T2, FLAIR), presented in an interactive web viewer.
  BraTS Task 1 is a segmentation dataset — there is no separate "classification" task; the
  three tumor sub-regions are what the model predicts and what the UI calls "classification"
  results in casual language.
- **Where the model is trained:** on **Kaggle** (GPU notebooks), not locally. See `training/`.
- **Where the model runs for inference:** locally, in the FastAPI backend in `backend/`, once
  the trained checkpoint is copied down from Kaggle.
- **This is a local-only app.** No auth, no multi-user concerns, no cloud deployment. It runs on
  `localhost` on the author's laptop.

## Repository layout

```
.
├── CLAUDE.md              ← you are here
├── PLAN.md                ← phased build plan + current status checklist
├── README.md              ← human-facing quickstart
├── archive.zip            ← the raw BraTS 2021 Task 1 Kaggle download (13+ GB, DO NOT unzip into git/committed paths)
├── frontend/              ← Next.js 14 (App Router) + TypeScript + Tailwind CSS
├── backend/               ← FastAPI (Python) inference + preprocessing service
└── training/              ← Kaggle-ready training script (NOT run locally — copy into a Kaggle notebook)
```

## Architecture decisions (already made — do not re-litigate without asking Hamza)

These were decided with Hamza directly; treat them as settled unless he says otherwise:

1. **Inference architecture:** Python FastAPI backend loads the PyTorch checkpoint directly and
   serves predictions over `localhost:8000`. No ONNX/browser-side inference.
2. **ML framework:** PyTorch.
3. **Task scope:** Segmentation only (WT / TC / ET), no separate grade/type classifier.
4. **Visualization:** [NiiVue](https://github.com/niivue/niivue) (`@niivue/niivue`), a WebGL NIfTI
   viewer, rendered client-side in a `'use client'` React component. Raw modality + predicted
   mask overlay, multi-planar (axial/coronal/sagittal), window/level controls.
5. **Model architecture:** a 3D U-Net (4 input channels → 3 output channels, multi-label sigmoid
   for overlapping WT/TC/ET regions) defined once in `backend/app/models/unet3d.py` and mirrored
   in `training/train_brats.py` so a Kaggle-trained checkpoint loads into the backend with zero
   conversion. **If you change one file's architecture, change the other to match**, or inference
   will fail to load the `state_dict`.
6. **Demo mode:** until a real checkpoint exists at `backend/models_store/model.pt`, the backend
   generates a synthetic plausible-looking tumor mask (`backend/app/services/demo_inference.py`)
   so the full upload → predict → view flow is testable before training finishes. The API
   response always includes `"demo_mode": true/false` and the frontend shows a visible banner
   when running in demo mode. Never let demo output be mistaken for a real prediction in the UI.

## Design system

Dark, data-dense clinical/technical dashboard (not a light patient-facing marketing site).
Chosen via the `ui-ux-pro-max` skill; tokens live in `frontend/tailwind.config.ts` and
`frontend/app/globals.css`. Summary:

- Background `#0A0F1A` / surface `#0F172A` / card `#141B2D`, border `#263149`
- Primary accent (medical teal/cyan): `#0891B2` / glow `#22D3EE`
- Segmentation class colors (used consistently everywhere — legend, overlay, charts):
  NCR/NET (necrotic core) `#F97316`, ED (edema) `#FACC15`, ET (enhancing tumor) `#EF4444`
- Fonts: **IBM Plex Sans** (UI text) + **JetBrains Mono** (numbers, case IDs, file paths, metrics)
- Icons: `lucide-react` only — never emoji as icons
- Motion: `framer-motion`, subtle, respects `prefers-reduced-motion`
- Full rationale in `docs/design-system.md`

## A note on pinned versions

`frontend/package.json` deliberately pins **Next.js 14 / React 18 / Tailwind CSS v3** rather than
whatever is newest when you read this. Those majors remain fully installable from npm
indefinitely and their App Router / config conventions are exactly what's implemented here
(synchronous `params` in route components, `tailwind.config.ts` + `@tailwind base/components/utilities`).
If you want to upgrade to Next 15/16, React 19, or Tailwind v4 later, that's a deliberate,
separate migration (params become `Promise`-based in Next 15+, Tailwind v4 moves theme tokens
into a CSS `@theme` block) — don't bump these blindly.

## How to run it locally

```bash
# Terminal 1 — backend
cd backend
python -m venv .venv && .venv\Scripts\activate   # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Terminal 2 — frontend
cd frontend
npm install
npm run dev   # http://localhost:3000
```

The frontend expects the backend at `http://localhost:8000` (see `frontend/.env.local.example`).

## The Kaggle → local handoff (the part Hamza will actually do)

1. Train on Kaggle using `training/train_brats.py` (paste into a notebook cell, or upload as a
   Kaggle Utility Script). It expects the standard BraTS 2021 folder layout after unzipping
   `archive.zip` (one folder per patient, each with `_t1.nii.gz`, `_t1ce.nii.gz`, `_t2.nii.gz`,
   `_flair.nii.gz`, `_seg.nii.gz`).
2. Training saves `model.pt` (state_dict) and `metrics.json` (loss curves + per-class Dice) at
   the end of the notebook — download both from Kaggle's output panel.
3. Copy `model.pt` → `backend/models_store/model.pt` and `metrics.json` →
   `backend/models_store/metrics.json` on the laptop.
4. Restart the backend. It auto-detects the checkpoint, exits demo mode, and the frontend's
   demo-mode banner disappears automatically (driven by `/api/health`).

## Conventions

- Frontend: TypeScript everywhere, App Router, Server Components by default — `'use client'`
  only on the leaf components that need interactivity (viewer, dropzone, charts). Tailwind
  utility classes; shared design tokens as CSS variables in `globals.css`, never raw hex in
  components.
- Backend: typed Python (type hints throughout), Pydantic models for all request/response
  shapes, one router file per resource under `app/api/routes/`.
- Keep `backend/app/models/unet3d.py` and `training/train_brats.py`'s model definition
  byte-for-byte identical in the class body. This is the single biggest source of "checkpoint
  won't load" bugs in projects like this — don't let it drift.
- Never commit `archive.zip`, extracted NIfTI files, `node_modules/`, `.venv/`, or
  `backend/models_store/*.pt` to git (see `.gitignore`). This is a local-only app; there is no
  need to push large binaries anywhere.

## Current status

See the checklist in `PLAN.md` for exactly what's built vs. pending. As of this writing: the
full frontend and backend scaffolds exist and run end-to-end in demo mode; the Kaggle training
script is written but has not yet been run by Hamza; no real checkpoint exists yet.
