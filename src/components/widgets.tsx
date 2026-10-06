"use client";
import { useEffect, useId, useState } from "react";
import { DataTable } from "./data-table";
import {
  Activity,
  ArrowDownToLine,
  RefreshCw,
  AlertCircle,
  Database,
  Clock,
  BarChart3,
} from "lucide-react";
import {
  api,
  getSessionId,
  type DashboardSpec,
  type WidgetSpec,
  type Query,
} from "../lib/types";

export function DashboardGrid({ spec }: { spec: DashboardSpec }) {
  if (!spec.widgets.length)
    return (
      <div className="empty-canvas">
        <div className="canvas-orbit">
          <BarChart3 size={30} />
          <span />
          <span />
        </div>
        <span className="eyebrow">A BLANK CANVAS, ENDLESS POSSIBILITIES</span>
        <h2>What would you like to see?</h2>
        <p>
          Ask a question about your data, or describe a dashboard.
          <br />
          We’ll build it together, one conversation at a time.
        </p>
        <div className="suggestions">
          {[
            "Show EC2 CPU usage over the last 24 hours",
            "Add a log download button with a time selector",
            "How many users are in signup status?",
          ].map((text, i) => (
            <button
              key={text}
              onClick={() =>
                window.dispatchEvent(
                  new CustomEvent("suggest-prompt", { detail: text }),
                )
              }
            >
              <span>{["↗", "↓", "?"][i]}</span>
              {text}
              <span>↗</span>
            </button>
          ))}
        </div>
      </div>
    );
  return (
    <div className="widget-grid">
      {spec.widgets.map((widget) => (
        <Widget key={widget.id + JSON.stringify(widget)} widget={widget} />
      ))}
    </div>
  );
}
function Widget({ widget: w }: { widget: WidgetSpec }) {
  const [data, setData] = useState<any>(),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(false),
    [query, setQuery] = useState<Query | undefined>(w.query);
  const [resources, setResources] = useState<any[]>([]);
  async function refresh() {
    if (!query) return;
    setLoading(true);
    setError("");
    try {
      setData(
        await api(`/api/sessions/${getSessionId()}/query`, {
          connectorId: w.connectorId,
          query,
        }),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    let alive = true;
    if (w.type === "logs")
      api(`/api/sessions/${getSessionId()}/query`, {
        connectorId: w.connectorId,
        query: { operation: "log_groups", region: w.query?.region },
      })
        .then((r) => {
          if (alive) setResources(r.items);
        })
        .catch(() => {});
    return () => {
      alive = false;
    };
  }, [w.type, w.connectorId]);
  useEffect(() => {
    if (w.type !== "logs") void refresh();
    const timer =
      w.type !== "logs"
        ? setInterval(() => {
            if (!document.hidden) void refresh();
          }, 60000)
        : undefined;
    return () => clearInterval(timer);
  }, [JSON.stringify(query)]);
  async function download() {
    if (!query) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch(
        `/api/sessions/${getSessionId()}/logs/download`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ connectorId: w.connectorId, query }),
        },
      );
      if (!response.ok) throw new Error((await response.json()).error);
      const blob = await response.blob(),
        url = URL.createObjectURL(blob),
        a = document.createElement("a");
      a.href = url;
      a.download = `logs-${new Date().toISOString().slice(0, 10)}.jsonl`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      if (response.headers.get("X-Results-Truncated") === "true")
        setError(
          "Download contains a bounded sample. Narrow the time window for more complete results.",
        );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  return (
    <section className={`widget ${w.width === "full" ? "wide" : ""}`}>
      <div className="widget-heading">
        <div>
          <span className="widget-kicker">
            {w.type === "text"
              ? "NOTE"
              : "AWS · " +
                (w.query?.operation === "table"
                  ? "DYNAMODB"
                  : ["cpu", "logs"].includes(w.query?.operation || "")
                    ? "CLOUDWATCH"
                    : w.query?.operation.replaceAll("_", " ").toUpperCase())}
          </span>
          <h3>{w.title}</h3>
        </div>
        {w.type !== "text" && w.type !== "logs" && (
          <button
            className="icon-button"
            aria-label={`Refresh ${w.title}`}
            onClick={refresh}
            disabled={loading}
          >
            <RefreshCw size={15} className={loading ? "spin" : ""} />
          </button>
        )}
      </div>
      {w.description && <p className="widget-description">{w.description}</p>}
      {error && (
        <p role="alert" className="inline-error">
          <AlertCircle size={15} />
          {error}
        </p>
      )}
      {w.type === "text" && <p className="note-content">{w.content}</p>}
      {(w.type === "chart" || w.type === "metric") &&
        (data ? (
          <>
            <div className="metric-value">
              {data.points
                ? (data.points
                    .at(-1)
                    ?.value?.toLocaleString(undefined, {
                      maximumFractionDigits: 1,
                    }) ?? "—")
                : (data.count ?? data.items?.length ?? "—")}
              <span>{data.points ? data.unit || "%" : ""}</span>
              <small>
                <span className="dot" />
                {data.points
                  ? `Latest ${data.statistic?.toLowerCase() || "average"}`
                  : data.truncated
                    ? "Records returned (partial)"
                    : "Records returned"}
              </small>
            </div>
            {w.type === "chart" && (
              <Chart
                points={data.points || []}
                threshold={w.threshold}
                unit={data.unit || "%"}
                label={
                  w.query?.operation === "cpu" ? "CPU utilization" : w.title
                }
              />
            )}
            <div className="widget-footer">
              <span>
                <Activity size={12} />
                {w.query?.operation === "cpu"
                  ? w.query.instanceId
                  : w.query?.operation === "aws_metric"
                    ? w.query.resourceId
                    : ""}
              </span>
              <span>
                {data.partial ? "Partial results · " : ""}
                {data.mode === "demo" ? "Demo data" : "Live data"} ·{" "}
                {new Date(data.fetchedAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          </>
        ) : (
          !error && (
            <div className="skeleton-chart">
              <span />
              <span />
              <span />
            </div>
          )
        ))}
      {w.type === "logs" && query?.operation === "logs" && (
        <div className="log-controls">
          <label>
            Log group
            <select
              value={query.logGroup}
              onChange={(e) => setQuery({ ...query, logGroup: e.target.value })}
            >
              {[
                ...new Set([query.logGroup, ...resources.map((r) => r.name)]),
              ].map((name) => (
                <option key={name}>{name}</option>
              ))}
            </select>
          </label>
          <label>
            Time window
            <select
              value={query.hours}
              onChange={(e) =>
                setQuery({ ...query, hours: Number(e.target.value) })
              }
            >
              {[...new Set([1, 4, 12, 24, query.hours])]
                .sort((a, b) => a - b)
                .map((h) => (
                  <option key={h} value={h}>
                    Last {h} {h === 1 ? "hour" : "hours"}
                  </option>
                ))}
            </select>
          </label>
          <label>
            Filter pattern
            <input
              value={query.filter}
              placeholder="All log events"
              onChange={(e) => setQuery({ ...query, filter: e.target.value })}
            />
          </label>
          <button
            className="primary download"
            onClick={download}
            disabled={loading}
          >
            <ArrowDownToLine size={16} />
            {loading ? "Preparing download…" : "Download logs"}
            <small>JSONL</small>
          </button>
          <p className="muted">
            <Clock size={12} />
            Up to {query.limit.toLocaleString()} events per download
          </p>
        </div>
      )}
      {w.type === "table" && data && (
        <DataTable
          data={data}
          groupBy={
            w.groupBy ||
            (w.query?.operation === "cloudformation_resources"
              ? "stack"
              : undefined)
          }
        />
      )}
    </section>
  );
}
function Chart({
  points,
  threshold,
  unit = "%",
  label = "CPU utilization",
}: {
  points: { time: string; value: number | null }[];
  threshold?: number;
  unit?: string;
  label?: string;
}) {
  const id = useId().replace(/:/g, ""),
    width = 650,
    height = 175,
    pad = 24;
  const segments: { time: string; value: number }[][] = [];
  let current: { time: string; value: number }[] = [];
  for (const p of points) {
    if (p.value == null) {
      if (current.length) segments.push(current);
      current = [];
    } else current.push(p as { time: string; value: number });
  }
  if (current.length) segments.push(current);
  const x = (time: string) =>
    pad +
    ((new Date(time).getTime() - new Date(points[0]?.time).getTime()) /
      Math.max(
        1,
        new Date(points.at(-1)?.time || "").getTime() -
          new Date(points[0]?.time).getTime(),
      )) *
      (width - 2 * pad);
  const max =
    unit === "%"
      ? 100
      : Math.max(1, threshold || 0, ...points.map((p) => p.value || 0)) * 1.1;
  const y = (value: number) =>
    height - pad - (value / max) * (height - 2 * pad);
  if (!points.length)
    return <p className="muted">No metric samples for this time window.</p>;
  return (
    <div className="chart">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`${label} over time${threshold !== undefined ? `, threshold ${threshold}${unit}` : ""}`}
      >
        <defs>
          <linearGradient id={`fill-${id}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#16947c" stopOpacity=".22" />
            <stop offset="100%" stopColor="#16947c" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, max * 0.25, max * 0.5, max * 0.75, max].map((v) => (
          <g key={v}>
            <line
              x1={pad}
              x2={width - pad}
              y1={y(v)}
              y2={y(v)}
              stroke="#e8edeb"
              strokeDasharray="3 5"
            />
            <text x="0" y={y(v) + 3} fontSize="8" fill="#8a9690">
              {v.toLocaleString(undefined, {
                notation: "compact",
                maximumFractionDigits: 1,
              })}
            </text>
          </g>
        ))}
        {segments.map((segment, i) => {
          const line = segment
            .map((p, j) => `${j ? "L" : "M"}${x(p.time)},${y(p.value)}`)
            .join(" ");
          return (
            <g key={i}>
              <path
                d={`${line} L${x(segment.at(-1)!.time)},${height - pad} L${x(segment[0].time)},${height - pad} Z`}
                fill={`url(#fill-${id})`}
              />
              <path
                d={line}
                fill="none"
                stroke="#178c76"
                strokeWidth="2"
                strokeLinejoin="round"
              />
              {segment
                .filter((p) => threshold !== undefined && p.value > threshold)
                .map((p) => (
                  <circle
                    key={p.time}
                    cx={x(p.time)}
                    cy={y(p.value)}
                    r="2.5"
                    fill="#dc9051"
                  >
                    <title>
                      {new Date(p.time).toLocaleString()}: {p.value}
                      {unit}
                    </title>
                  </circle>
                ))}
            </g>
          );
        })}
        {threshold !== undefined && (
          <g>
            <line
              x1={pad}
              x2={width - pad}
              y1={y(threshold)}
              y2={y(threshold)}
              stroke="#cb8d53"
              strokeDasharray="5 4"
            />
            <text
              x={width - pad}
              y={y(threshold) - 5}
              textAnchor="end"
              fontSize="9"
              fill="#af7645"
            >
              {threshold}
              {unit} threshold
            </text>
          </g>
        )}
      </svg>
      <div className="chart-labels">
        {[points[0], points[Math.floor(points.length / 2)], points.at(-1)].map(
          (p, i) => (
            <span key={i}>
              {new Date(p!.time).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          ),
        )}
      </div>
    </div>
  );
}
