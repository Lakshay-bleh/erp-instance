"use client";

import { useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import {
  getIncident,
  updateIncidentStatus,
  updateIncidentTags,
  enrichIncident,
  deleteIncident,
  type IncidentResponse,
} from "@/lib/api";
import { useToast } from "@/components/ui/toaster";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusPill } from "@/components/ui/status-pill";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  ArrowLeft,
  Lightbulb,
  Tag,
  Plus,
  FileText,
  Sparkles,
  CheckCircle2,
  Trash2,
  Calendar,
  Building2,
  Layers,
} from "lucide-react";
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
  const router = useRouter();
  const id = params.id as string;
  const { toast } = useToast();
  const [tagInput, setTagInput] = useState("");
  const [tagSubmitting, setTagSubmitting] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

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
    {
      fallbackData: cached ?? undefined,
      revalidateOnFocus: false,
      revalidateIfStale: false,
    }
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
    } catch (e) {
      const is404 = e instanceof Error && (e.message.includes("not found") || e.message.includes("404"));
      toast({
        title: "Failed to update status",
        description: is404
          ? "Incident not found. If using a hosted backend without a database, incidents are not persisted."
          : (e instanceof Error ? e.message : undefined),
        variant: "error",
      });
    }
  };

  const handleMarkResolved = () => {
    handleStatusChange("Resolved");
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

  const handleDelete = async () => {
    if (!displayIncident) return;
    setDeleting(true);
    try {
      await deleteIncident(displayIncident.id);
      toast({ title: "Incident deleted", variant: "success" });
      router.push("/incidents");
    } catch (e) {
      const is404 = e instanceof Error && (e.message.includes("not found") || e.message.includes("404"));
      toast({
        title: "Failed to delete incident",
        description: is404
          ? "Incident not found. If using a hosted backend without a database, incidents are not persisted."
          : (e instanceof Error ? e.message : undefined),
        variant: "error",
      });
    } finally {
      setDeleting(false);
    }
  };

  if (!isLoading && !displayIncident) {
    return (
      <div className="mx-auto max-w-[1200px] px-6 py-8">
        <Button variant="outline" asChild>
          <Link href="/incidents">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to list
          </Link>
        </Button>
        <Card className="mt-6">
          <CardContent className="py-16 px-6 text-center">
            <p className="text-muted font-medium">Incident not found or failed to load.</p>
            <p className="mt-2 text-sm text-muted max-w-lg mx-auto">
              If you are using a hosted backend (e.g. Vercel) without a database, incidents are not persisted across deployments or server restarts. Only recently created incidents in the current session may be available. Configure DynamoDB for the backend to persist incidents.
            </p>
            <Button variant="outline" asChild className="mt-6">
              <Link href="/incidents">View all incidents</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading && !displayIncident) {
    return (
      <div className="mx-auto max-w-[1200px] px-6 py-8 space-y-6">
        <div className="h-8 w-32 animate-pulse rounded-lg bg-[#E5E7EB]/50" />
        <div className="h-48 animate-pulse rounded-xl bg-[#E5E7EB]/30" />
        <div className="h-32 animate-pulse rounded-xl bg-[#E5E7EB]/30" />
      </div>
    );
  }

  const incident = displayIncident!;
  const isResolved = incident.status === "Resolved";

  return (
    <div className="min-h-screen bg-[#F8F9FB]">
      <div className="mx-auto max-w-[1200px] px-6 py-8 lg:py-10">
        {showingCachedOnly && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 rounded-xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm text-amber-800"
          >
            Showing the incident you just created. The backend may not have persisted it yet (use DynamoDB for persistence).
          </motion.div>
        )}

        {/* Hero */}
        <motion.header
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="mb-8"
        >
          <Link
            href="/incidents"
            className="inline-flex items-center gap-2 text-sm font-medium text-muted hover:text-[#111827] transition-colors mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to incidents
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight text-[#111827] lg:text-3xl max-w-3xl">
            {incident.title}
          </h1>
          <p className="mt-2 text-sm text-muted flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1">
              <Layers className="h-3.5 w-3.5" />
              {incident.erp_module}
            </span>
            <span className="text-[#E5E7EB]">·</span>
            <span>{incident.environment}</span>
            <span className="text-[#E5E7EB]">·</span>
            <span className="inline-flex items-center gap-1">
              <Building2 className="h-3.5 w-3.5" />
              {incident.business_unit}
            </span>
          </p>
        </motion.header>

        {/* Single column: Description, then Details (with Severity/Category/Status), then Tags, Summary, Next step, Delete — full width */}
        <motion.div
          className="space-y-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
        >
          {/* Description */}
          <Card className="border-[#E5E7EB] bg-surface shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-semibold text-[#111827]">
                Description
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-[15px] leading-relaxed text-[#374151] whitespace-pre-wrap">
                {incident.description}
              </p>
            </CardContent>
          </Card>

          {/* Details: created/updated, badges, Severity, Category, Status */}
          <Card className="border-[#E5E7EB] bg-surface shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-semibold text-[#111827]">
                Details
              </CardTitle>
              <CardDescription className="text-xs uppercase tracking-wide text-muted">
                Created & updated · Severity · Category · Status
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0 space-y-4">
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <span className="inline-flex items-center gap-1.5 text-muted">
                  <Calendar className="h-4 w-4" />
                  {new Date(incident.created_at).toLocaleString()}
                </span>
                <span className="text-[#E5E7EB]">·</span>
                <span className="text-muted">
                  Updated {new Date(incident.updated_at).toLocaleString()}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant="module">{incident.erp_module}</Badge>
                <Badge variant="category">{incident.category}</Badge>
                <span className="text-xs text-muted py-1 px-2 rounded-md bg-muted/10">
                  {incident.environment}
                </span>
                <span className="text-[#E5E7EB]">|</span>
                <Badge variant={severityVariant(incident.severity)} className="text-sm px-3 py-1">
                  {incident.severity}
                </Badge>
                <StatusPill status={incident.status} className="text-sm" />
                <div className="flex items-center gap-2 ml-2">
                  <span className="label text-muted">Status</span>
                  <Select
                    options={STATUS_OPTIONS}
                    value={incident.status}
                    onChange={(e) => handleStatusChange(e.target.value)}
                    className="w-[140px]"
                  />
                  {!isResolved && (
                    <Button variant="primary" size="sm" onClick={handleMarkResolved}>
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                      Mark Resolved
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tags — full width */}
          <Card className="border-[#E5E7EB] bg-surface shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-semibold text-[#111827] flex items-center gap-2">
                <Tag className="h-4 w-4 text-muted" />
                Tags
              </CardTitle>
              <CardDescription className="text-xs">
                Add tags to categorize this incident
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              <div className="flex flex-wrap gap-2">
                {(incident.tags ?? []).length > 0 ? (
                  (incident.tags ?? []).map((t) => (
                    <Badge key={t} variant="tag">
                      {t}
                    </Badge>
                  ))
                ) : (
                  <span className="text-xs text-muted">No tags yet</span>
                )}
              </div>
              <div className="flex gap-2 max-w-md">
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

          {/* Auto-generated summary — full width */}
          <Card className="border-[#E5E7EB] bg-surface shadow-sm">
            <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
              <div>
                <CardTitle className="text-base font-semibold text-[#111827] flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  Auto-generated summary
                </CardTitle>
                <CardDescription className="text-xs mt-1">
                  AI-generated short summary of the incident
                </CardDescription>
              </div>
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
            <CardContent className="pt-0">
              {incident.auto_summary ? (
                <p className="text-[15px] text-[#374151] leading-relaxed">
                  {incident.auto_summary}
                </p>
              ) : (
                <p className="text-sm text-muted">
                  No summary yet. Click &quot;Generate with AI&quot; to create one using Groq.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Suggested next step — full width */}
          <Card className="border-[#0A84FF]/25 bg-[#0A84FF]/5 shadow-sm">
            <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
              <div>
                <CardTitle className="text-base font-semibold text-[#111827] flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-[#0A84FF]" />
                  Suggested next step
                </CardTitle>
                <CardDescription className="text-xs mt-1">
                  AI-recommended action
                </CardDescription>
              </div>
              {!incident.suggested_action && incident.auto_summary && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleEnrich}
                  disabled={enriching}
                  className="shrink-0"
                >
                  {enriching ? "…" : "Generate"}
                </Button>
              )}
            </CardHeader>
            <CardContent className="pt-0">
              {incident.suggested_action ? (
                <p className="text-[15px] font-medium text-[#374151] leading-relaxed">
                  {incident.suggested_action}
                </p>
              ) : (
                <p className="text-sm text-muted">
                  No suggested action yet. Use &quot;Generate with AI&quot; above to get a recommended next step.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Delete — full width */}
          <Card className="border-[#FEE2E2] bg-[#FEF2F2]/50 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-semibold text-[#111827]">
                Danger zone
              </CardTitle>
              <CardDescription className="text-xs">
                Permanently delete this incident. This cannot be undone.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <Button
                variant="outline"
                className="border-danger/30 text-danger hover:bg-danger/10 hover:text-danger"
                onClick={() => setDeleteDialogOpen(true)}
                disabled={deleting}
              >
                <Trash2 className="h-4 w-4" />
                Delete incident
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete incident"
        description="Are you sure you want to delete this incident? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  );
}
