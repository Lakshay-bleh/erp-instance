// Same-origin /api when deployed on Vercel; local dev uses backend on :8000
function getApiBase(): string {
  if (
    process.env.NEXT_PUBLIC_API_URL !== undefined &&
    process.env.NEXT_PUBLIC_API_URL !== ""
  ) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  if (typeof window !== "undefined") return "/api";
  // SSR on Vercel: use deployment URL
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}/api`;
  return "http://localhost:8000";
}
const API_BASE = getApiBase();

export type IncidentResponse = {
  id: string;
  title: string;
  description: string;
  erp_module: string;
  environment: string;
  business_unit: string;
  severity: string;
  category: string;
  status: string;
  tags?: string[];
  auto_summary: string | null;
  suggested_action: string | null;
  created_at: string;
  updated_at: string;
};

export type IncidentCreate = {
  title: string;
  description: string;
  erp_module: string;
  environment: string;
  business_unit: string;
};

export type IncidentUpdateStatus = {
  status: "Open" | "In Progress" | "Resolved";
};

export type IncidentUpdateTags = {
  tags: string[];
};

export async function createIncident(body: IncidentCreate): Promise<IncidentResponse> {
  const res = await fetch(`${API_BASE}/incidents`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? res.statusText ?? "Failed to create incident");
  }
  return res.json();
}

export async function listIncidents(params?: {
  severity?: string;
  erp_module?: string;
}): Promise<IncidentResponse[]> {
  const q = new URLSearchParams();
  if (params?.severity) q.set("severity", params.severity);
  if (params?.erp_module) q.set("erp_module", params.erp_module);
  const url = `${API_BASE}/incidents${q.toString() ? `?${q}` : ""}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch incidents");
  return res.json();
}

export async function getIncident(id: string): Promise<IncidentResponse> {
  const res = await fetch(`${API_BASE}/incidents/${id}`);
  if (!res.ok) {
    if (res.status === 404) throw new Error("Incident not found");
    throw new Error("Failed to fetch incident");
  }
  return res.json();
}

export async function updateIncidentStatus(
  id: string,
  body: IncidentUpdateStatus
): Promise<IncidentResponse> {
  const res = await fetch(`${API_BASE}/incidents/${id}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("Failed to update status");
  return res.json();
}

export async function updateIncidentTags(
  id: string,
  body: IncidentUpdateTags
): Promise<IncidentResponse> {
  const res = await fetch(`${API_BASE}/incidents/${id}/tags`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("Failed to update tags");
  return res.json();
}

/** Delete an incident permanently. */
export async function deleteIncident(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/incidents/${id}`, { method: "DELETE" });
  if (!res.ok) {
    if (res.status === 404) throw new Error("Incident not found");
    throw new Error("Failed to delete incident");
  }
}

/** Run Groq AI to generate summary and suggested action for this incident. */
export async function enrichIncident(id: string): Promise<IncidentResponse> {
  const res = await fetch(`${API_BASE}/incidents/${id}/enrich`, {
    method: "POST",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? "Failed to generate summary");
  }
  return res.json();
}
