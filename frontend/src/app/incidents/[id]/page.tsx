"use client";

import { useState, useMemo } from "react";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { getIncident, updateIncidentStatus, updateIncidentTags, enrichIncident, type IncidentResponse } from "@/lib/api";
import { useToast } from "@/components/ui/toaster";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusPill } from "@/components/ui/status-pill";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Lightbulb, Tag, Plus, FileText, Sparkles } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

const STATUS_OPTIONS = [
  { value: "Open", label: "Open" },
  { value: "In Progress", label: "In Progress" },
  { value: "Resolved", label: "Resolved" },
];

function severityVariant(s: string) {
  if (s === "P1") return "severity_p1";
  if (s === "P2") return "severity_p2";
  return "severity_p3";
}

function getCachedIncident(id: string | null): IncidentResponse | null {
  if (typeof window === "undefined" || !id) return null;
  try {
    const raw = sessionStorage.getItem(`incident-${id}`);
    return raw ? (JSON.parse(raw) as IncidentResponse) : null;
  } catch {
    return null;
  }
}

export default function IncidentDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { toast } = useToast();
  const [tagInput, setTagInput] = useState("");
  const [tagSubmitting, setTagSubmitting] = useState(false);
  const [enriching, setEnriching] = useState(false);

  const cached = useMemo(() => getCachedIncident(id), [id]);
  const { data, error, isLoading, mutate } = useSWR<IncidentResponse>(
    id ? `incident-${id}` : null,
    async () => {
      const result = await getIncident(id);
      if (typeof window !== "undefined") {
        try {
          sessionStorage.removeItem(`incident-${id}`);
        } catch (_) {}
      }
      return result;
    },
    { fallbackData: cached ?? undefined }
  );
  const displayIncident = data ?? cached;
  const showingCachedOnly = Boolean(error && cached && !data);

  const handleStatusChange = async (newStatus: string) => {
    if (!displayIncident) return;
    try {
      await updateIncidentStatus(displayIncident.id, {
        status: newStatus as "Open" | "In Progress" | "Resolved",
      });
      toast({ title: "Status updated", variant: "success" });
      mutate();
    } catch {
      toast({ title: "Failed to update status", variant: "error" });
    }
  };

  const handleEnrich = async () => {
    if (!displayIncident) return;
    setEnriching(true);
    try {
      await enrichIncident(displayIncident.id);
      toast({ title: "Summary and action generated", variant: "success" });
      mutate();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to generate";
      toast({ title: "Could not generate summary", description: msg, variant: "error" });
    } finally {
      setEnriching(false);
    }
  };

  const handleAddTag = async () => {
    const tag = tagInput.trim().toLowerCase();
    if (!displayIncident || !tag) return;
    const current = displayIncident.tags ?? [];
    if (current.includes(tag)) {
      setTagInput("");
      return;
    }
    setTagSubmitting(true);
    try {
      await updateIncidentTags(displayIncident.id, { tags: [...current, tag] });
      toast({ title: "Tag added", variant: "success" });
      setTagInput("");
      mutate();
    } catch {
      toast({ title: "Failed to add tag", variant: "error" });
    } finally {
      setTagSubmitting(false);
    }
  };

  if (!isLoading && !displayIncident) {
    return (
      <div className="space-y-4">
        <Button variant="outline" asChild>
          <Link href="/incidents">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to list
          </Link>
        </Button>
        <Card>
          <CardContent className="py-12 text-center text-muted">
            Incident not found or failed to load.
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading && !displayIncident) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-32 animate-pulse rounded bg-muted/30" />
        <div className="h-64 animate-pulse rounded-xl bg-muted/20" />
      </div>
    );
  }

  const incident = displayIncident!;

  return (
    <div className="space-y-6">
      {showingCachedOnly && (
        <Card className="border-amber-200 bg-amber-50/80">
          <CardContent className="py-3 text-sm text-amber-800">
            Showing the incident you just created. The backend may not have persisted it yet (use DynamoDB on the backend for persistence).
          </CardContent>
        </Card>
      )}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/incidents">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold text-[#111827] truncate">{incident.title}</h1>
          <p className="mt-1 text-sm text-muted">
            {incident.erp_module} · {incident.environment} · {incident.business_unit}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <motion.div
          className="lg:col-span-2 space-y-6"
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-[#374151] whitespace-pre-wrap">{incident.description}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Metadata</CardTitle>
              <p className="text-xs text-muted">Created {new Date(incident.created_at).toLocaleString()} · Updated {new Date(incident.updated_at).toLocaleString()}</p>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Badge variant="module">{incident.erp_module}</Badge>
              <Badge variant="category">{incident.category}</Badge>
              <span className="text-sm text-muted">{incident.environment}</span>
              <span className="text-sm text-muted">{incident.business_unit}</span>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          className="space-y-6"
          initial={{ opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.2, delay: 0.05 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Severity</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant={severityVariant(incident.severity)} className="text-sm px-3 py-1">
                {incident.severity}
              </Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Category</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant="category">{incident.category}</Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Status</CardTitle>
              <CardDescription className="sr-only">Update incident status</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <StatusPill status={incident.status} className="text-sm" />
              <Select
                options={STATUS_OPTIONS}
                value={incident.status}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="w-full"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Tag className="h-4 w-4 text-muted" />
                Tags
              </CardTitle>
              <CardDescription>Add tags to categorize. Auto-generated tags appear below.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-1.5">
                {(incident.tags ?? []).map((t) => (
                  <Badge key={t} variant="tag">{t}</Badge>
                ))}
                {(incident.tags ?? []).length === 0 && (
                  <span className="text-xs text-muted">No tags yet</span>
                )}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Add tag..."
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddTag())}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleAddTag}
                  disabled={!tagInput.trim() || tagSubmitting}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                Auto-generated summary
              </CardTitle>
              {!incident.auto_summary && (
                <Button
                  type="button"
                  size="sm"
                  variant="primary"
                  onClick={handleEnrich}
                  disabled={enriching}
                  className="shrink-0"
                >
                  {enriching ? "Generating…" : (
                    <>
                      <Sparkles className="h-3.5 w-3.5 mr-1" />
                      Generate with AI
                    </>
                  )}
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {incident.auto_summary ? (
                <p className="text-sm text-[#374151] leading-relaxed">{incident.auto_summary}</p>
              ) : (
                <p className="text-sm text-muted">
                  No summary yet. Click &quot;Generate with AI&quot; to create one using Groq (uses the API key in backend .env).
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="border-accent/30 bg-accent/5">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-accent" />
                Suggested next step / action
              </CardTitle>
              {!incident.suggested_action && incident.auto_summary && (
                <Button type="button" size="sm" variant="outline" onClick={handleEnrich} disabled={enriching} className="shrink-0">
                  {enriching ? "…" : "Generate"}
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {incident.suggested_action ? (
                <p className="text-sm text-[#374151] leading-relaxed font-medium">{incident.suggested_action}</p>
              ) : (
                <p className="text-sm text-muted">
                  No suggested action yet. Use &quot;Generate with AI&quot; above to get a recommended next step.
                </p>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
