export type Query =
  | { operation: "instances" | "log_groups" }
  | { operation: "cpu"; instanceId: string; hours: number }
  | {
      operation: "logs";
      logGroup: string;
      hours: number;
      filter: string;
      limit: number;
    }
  | { operation: "table"; table: string; limit: number; status?: string };
export interface WidgetSpec {
  id: string;
  type: "chart" | "metric" | "logs" | "table" | "text";
  title: string;
  description: string;
  width: "half" | "full";
  connectorId: "aws";
  query?: Query;
  threshold?: number;
  content?: string;
}
export interface DashboardSpec {
  title: string;
  widgets: WidgetSpec[];
}
export interface Session {
  id: string;
  title: string;
  status: string;
  error: string | null;
  revision: string | null;
  syncStatus: string;
  canEdit: boolean;
  mode: string;
  provider: string;
  dashboard: DashboardSpec;
}
export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  createdAt?: string;
}
export const getSessionId = () =>
  window.location.pathname.split("/").filter(Boolean)[0] || "";
export async function api<T = any>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(
    path,
    body === undefined
      ? {}
      : {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
  );
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "The request failed.");
  return result;
}
