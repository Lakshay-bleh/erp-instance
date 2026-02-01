"use client";

import Link from "next/link";
import useSWR from "swr";
import { listIncidents, type IncidentResponse } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, AlertTriangle, FileText, PlusCircle } from "lucide-react";
import { motion } from "framer-motion";

const fetcher = () => listIncidents();

function useKPIs(incidents: IncidentResponse[] | undefined) {
  if (!incidents) return { total: 0, p1: 0, open: 0 };
  const p1 = incidents.filter((i) => i.severity === "P1").length;
  const open = incidents.filter((i) => i.status === "Open").length;
  return { total: incidents.length, p1, open };
}

export default function DashboardPage() {
  const { data: incidents, error, isLoading } = useSWR<IncidentResponse[]>("incidents", fetcher);
  const kpis = useKPIs(incidents);

  const cards = [
    {
      title: "Total Incidents",
      value: kpis.total,
      icon: FileText,
      href: "/incidents",
    },
    {
      title: "P1 Incidents",
      value: kpis.p1,
      icon: AlertCircle,
      href: "/incidents?severity=P1",
    },
    {
      title: "Open Incidents",
      value: kpis.open,
      icon: AlertTriangle,
      href: "/incidents?status=Open",
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#111827]">Dashboard</h1>
          <p className="mt-1 text-sm text-muted">
            Overview of ERP incident triage and key metrics
          </p>
        </div>
        <Button asChild>
          <Link href="/incidents/submit" className="inline-flex items-center gap-2">
            <PlusCircle className="h-4 w-4" />
            Submit Incident
          </Link>
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          Failed to load data. Is the API running?
        </div>
      )}

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card, i) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: i * 0.05 }}
            >
              <Link href={card.href}>
                <Card hover className="h-full transition-shadow">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted">
                      {card.title}
                    </CardTitle>
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-4 w-4" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-semibold text-[#111827]">
                      {isLoading ? "—" : card.title === "Total Incidents" ? kpis.total : card.title === "P1 Incidents" ? kpis.p1 : kpis.open}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
