"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import useSWR from "swr";
import { listIncidents, type IncidentResponse } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusPill } from "@/components/ui/status-pill";
import { Select } from "@/components/ui/select";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { FileQuestion, PlusCircle } from "lucide-react";

const SEVERITIES = [
  { value: "", label: "All severities" },
  { value: "P1", label: "P1" },
  { value: "P2", label: "P2" },
  { value: "P3", label: "P3" },
];

const MODULES = [
  { value: "", label: "All modules" },
  { value: "AP", label: "AP" },
  { value: "AR", label: "AR" },
  { value: "GL", label: "GL" },
  { value: "Inventory", label: "Inventory" },
  { value: "HR", label: "HR" },
  { value: "Payroll", label: "Payroll" },
];

function severityVariant(s: string) {
  if (s === "P1") return "severity_p1";
  if (s === "P2") return "severity_p2";
  return "severity_p3";
}

function IncidentsListContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const severity = searchParams.get("severity") ?? "";
  const erp_module = searchParams.get("erp_module") ?? "";

  const query = new URLSearchParams();
  if (severity) query.set("severity", severity);
  if (erp_module) query.set("erp_module", erp_module);
  const key = `/incidents?${query.toString()}`;
  const { data: incidents, error, isLoading } = useSWR<IncidentResponse[]>(
    key,
    () => listIncidents({ severity: severity || undefined, erp_module: erp_module || undefined })
  );

  const updateFilter = (name: string, value: string) => {
    const p = new URLSearchParams(searchParams.toString());
    if (value) p.set(name, value);
    else p.delete(name);
    router.push(`/incidents?${p.toString()}`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[#111827]">Incidents</h1>
        <p className="mt-1 text-sm text-muted">
          View and filter ERP incidents. Click a row to open details.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center gap-4">
          <CardTitle className="text-base">Filters</CardTitle>
          <div className="flex flex-wrap gap-3">
            <Select
              options={SEVERITIES}
              value={severity}
              onChange={(e) => updateFilter("severity", e.target.value)}
              className="w-[140px]"
            />
            <Select
              options={MODULES}
              value={erp_module}
              onChange={(e) => updateFilter("erp_module", e.target.value)}
              className="w-[160px]"
            />
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardContent className="p-0">
          {error && (
            <div className="p-6 text-sm text-danger">
              Failed to load incidents. Is the API running?
            </div>
          )}
          {isLoading && (
            <div className="p-12 text-center text-sm text-muted">Loading…</div>
          )}
          {!error && !isLoading && (!incidents || incidents.length === 0) && (
            <EmptyState
              icon={FileQuestion}
              title="No incidents yet"
              description="Submit an incident to get started."
              action={
                <Button asChild>
                  <Link href="/incidents/submit">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Submit incident
                  </Link>
                </Button>
              }
            />
          )}
          {!error && !isLoading && incidents && incidents.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[#E5E7EB] bg-muted/10">
                    <th className="px-6 py-4 font-semibold text-muted label">Title</th>
                    <th className="px-6 py-4 font-semibold text-muted label">Module</th>
                    <th className="px-6 py-4 font-semibold text-muted label">Severity</th>
                    <th className="px-6 py-4 font-semibold text-muted label">Status</th>
                    <th className="px-6 py-4 font-semibold text-muted label">Tags</th>
                    <th className="px-6 py-4 font-semibold text-muted label">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {incidents.map((inc) => (
                    <tr
                      key={inc.id}
                      className="table-row-hover border-b border-[#E5E7EB] transition-colors"
                    >
                      <td className="px-6 py-4">
                        <Link
                          href={`/incidents/${inc.id}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {inc.title}
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="module">{inc.erp_module}</Badge>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={severityVariant(inc.severity)}>{inc.severity}</Badge>
                      </td>
                      <td className="px-6 py-4">
                        <StatusPill status={inc.status} />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {(inc.tags ?? []).slice(0, 3).map((t) => (
                            <Badge key={t} variant="tag">{t}</Badge>
                          ))}
                          {(inc.tags ?? []).length > 3 && (
                            <span className="text-xs text-muted">+{(inc.tags ?? []).length - 3}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-muted">
                        {new Date(inc.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function IncidentsListPage() {
  return (
    <Suspense fallback={<div className="space-y-6 p-6 text-muted">Loading incidents…</div>}>
      <IncidentsListContent />
    </Suspense>
  );
}
