import type {
  CaseDetail,
  CaseSummary,
  HealthStatus,
  MetricsPayload,
  PredictionResult,
} from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export class ApiRequestError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = "ApiRequestError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: {
        Accept: "application/json",
        ...(init?.headers ?? {}),
      },
    });
  } catch {
    throw new ApiRequestError(
      "Can't reach the NeuroScan backend. Is it running on localhost:8000?",
      0
    );
  }

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail ?? detail;
    } catch {
      // ignore, use statusText
    }
    throw new ApiRequestError(detail, res.status);
  }

  return res.json() as Promise<T>;
}

async function requestBlob(path: string): Promise<Blob> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`);
  } catch {
    throw new ApiRequestError(
      "Can't reach the NeuroScan backend. Is it running on localhost:8000?",
      0
    );
  }

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail ?? detail;
    } catch {
      // ignore, use statusText
    }
    throw new ApiRequestError(detail, res.status);
  }

  return res.blob();
}

export const api = {
  base: API_BASE,

  health: () => request<HealthStatus>("/api/health"),

  metrics: () => request<MetricsPayload>("/api/metrics"),

  listCases: () => request<CaseSummary[]>("/api/cases"),

  getCase: (caseId: string) => request<CaseDetail>(`/api/cases/${caseId}`),

  async uploadCase(name: string, files: File[]): Promise<CaseDetail> {
    const form = new FormData();
    form.append("name", name);
    for (const file of files) {
      form.append("files", file, file.name);
    }
    return request<CaseDetail>("/api/cases", {
      method: "POST",
      body: form,
    });
  },

  predict: (caseId: string) =>
    request<PredictionResult>(`/api/cases/${caseId}/predict`, { method: "POST" }),

  // NiiVue uses a regex on the URL to detect the file extension
  // (it does NOT read Content-Disposition). URLs must end in .nii.gz.
  volumeUrl: (caseId: string, modality: string) =>
    `${API_BASE}/api/cases/${caseId}/volume/${modality}.nii.gz`,

  segmentationUrl: (caseId: string) => `${API_BASE}/api/cases/${caseId}/segmentation.nii.gz`,

  reportUrl: (caseId: string) => `${API_BASE}/api/cases/${caseId}/report.pdf`,

  downloadReport: (caseId: string) => requestBlob(`/api/cases/${caseId}/report.pdf`),

  deleteCase: (caseId: string) =>
    request<{ ok: boolean }>(`/api/cases/${caseId}`, { method: "DELETE" }),
};
