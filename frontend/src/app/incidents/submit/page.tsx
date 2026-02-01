"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createIncident, type IncidentCreate as ApiCreate } from "@/lib/api";
import { useToast } from "@/components/ui/toaster";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { motion } from "framer-motion";

const ERP_MODULES = [
  { value: "AP", label: "AP" },
  { value: "AR", label: "AR" },
  { value: "GL", label: "GL" },
  { value: "Inventory", label: "Inventory" },
  { value: "HR", label: "HR" },
  { value: "Payroll", label: "Payroll" },
];

const ENVIRONMENTS = [
  { value: "Prod", label: "Production" },
  { value: "Test", label: "Test" },
];

export default function SubmitIncidentPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    erp_module: "",
    environment: "",
    business_unit: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const valid =
    form.title.trim().length > 0 &&
    form.description.trim().length > 0 &&
    form.erp_module &&
    form.environment &&
    form.business_unit.trim().length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    setErrors({});
    setLoading(true);
    try {
      const body: ApiCreate = {
        title: form.title.trim(),
        description: form.description.trim(),
        erp_module: form.erp_module as ApiCreate["erp_module"],
        environment: form.environment as ApiCreate["environment"],
        business_unit: form.business_unit.trim(),
      };
      const incident = await createIncident(body);
      toast({
        title: "Incident submitted",
        description: "Your incident has been created and is being enriched.",
        variant: "success",
      });
      router.push(`/incidents/${incident.id}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast({ title: "Error", description: message, variant: "error" });
      setErrors({ submit: message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-[#111827]">Submit Incident</h1>
        <p className="mt-1 text-sm text-muted">
          Report an ERP incident from Oracle ERP. AI will suggest severity, category, and next steps.
        </p>
      </div>

      <motion.form
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        onSubmit={handleSubmit}
      >
        <Card>
          <CardHeader>
            <CardTitle>Incident details</CardTitle>
            <CardDescription>Provide a clear title and description for triage.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Input
              label="Title"
              placeholder="Brief title for the incident"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              error={errors.title}
              maxLength={500}
            />
            <Textarea
              label="Description"
              placeholder="Describe what happened, when, and any error messages."
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              error={errors.description}
              rows={5}
            />
            <div className="grid gap-6 sm:grid-cols-2">
              <Select
                label="ERP Module"
                options={ERP_MODULES}
                placeholder="Select module"
                value={form.erp_module}
                onChange={(e) => setForm((f) => ({ ...f, erp_module: e.target.value }))}
                error={errors.erp_module}
              />
              <Select
                label="Environment"
                options={ENVIRONMENTS}
                placeholder="Select environment"
                value={form.environment}
                onChange={(e) => setForm((f) => ({ ...f, environment: e.target.value }))}
                error={errors.environment}
              />
            </div>
            <Input
              label="Business unit"
              placeholder="e.g. Finance, Operations"
              value={form.business_unit}
              onChange={(e) => setForm((f) => ({ ...f, business_unit: e.target.value }))}
              error={errors.business_unit}
            />
            {errors.submit && (
              <p className="text-sm text-danger">{errors.submit}</p>
            )}
            <Button type="submit" loading={loading} disabled={!valid}>
              Submit incident
            </Button>
          </CardContent>
        </Card>
      </motion.form>
    </div>
  );
}
