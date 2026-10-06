"use client";
import { DashboardGrid } from "../components/widgets";
import type { DashboardSpec } from "../lib/types";

export const specification = {
  "title": "Untitled dashboard",
  "widgets": []
} satisfies DashboardSpec;

export default function GeneratedDashboard() {
  return <DashboardGrid spec={specification} />;
}
