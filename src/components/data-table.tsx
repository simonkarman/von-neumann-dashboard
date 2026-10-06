"use client";
import { useMemo, useState } from "react";
export function DataTable({ data, groupBy }: { data: any; groupBy?: string }) {
  const [search, setSearch] = useState(""),
    [page, setPage] = useState(0),
    [sort, setSort] = useState(""),
    [reverse, setReverse] = useState(false),
    [group, setGroup] = useState("");
  const rows: Record<string, any>[] = data.items || [];
  const groups = useMemo(() => {
    const map = new Map<string, number>();
    if (groupBy)
      for (const row of rows) {
        const key = `${row.region || ""} / ${String(row[groupBy] ?? "Unassigned")}`;
        map.set(key, (map.get(key) || 0) + 1);
      }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [rows, groupBy]);
  const filtered = useMemo(
    () =>
      rows
        .filter(
          (r) =>
            (!group ||
              `${r.region || ""} / ${String(r[groupBy!] ?? "Unassigned")}` ===
                group) &&
            (!search ||
              JSON.stringify(r).toLowerCase().includes(search.toLowerCase())),
        )
        .sort((a, b) =>
          sort
            ? String(a[sort] ?? "").localeCompare(
                String(b[sort] ?? ""),
                undefined,
                { numeric: true },
              ) * (reverse ? -1 : 1)
            : 0,
        ),
    [rows, search, group, groupBy, sort, reverse],
  );
  const columns = [...new Set(rows.slice(0, 100).flatMap(Object.keys))];
  const pages = Math.max(1, Math.ceil(filtered.length / 25)),
    current = Math.min(page, pages - 1);
  const cell = (v: any) =>
    v == null ? "—" : typeof v === "object" ? JSON.stringify(v) : String(v);
  return (
    <div className="inventory-table">
      <div className="inventory-toolbar">
        <input
          aria-label="Search table"
          placeholder="Search resources…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
        />
        {groupBy && (
          <select
            aria-label="Filter group"
            value={group}
            onChange={(e) => {
              setGroup(e.target.value);
              setPage(0);
            }}
          >
            <option value="">All {groups.length} groups</option>
            {groups.map(([name, count]) => (
              <option key={name} value={name}>
                {name} ({count})
              </option>
            ))}
          </select>
        )}
      </div>
      {groupBy && (
        <details className="inventory-summary" open>
          <summary>
            {groups.length} groups · {rows.length.toLocaleString()} resource
            records{data.truncated ? " (partial)" : ""}
          </summary>
          <div className="inventory-groups">
            {groups.map(([name, count]) => (
              <button
                key={name}
                onClick={() => {
                  setGroup(group === name ? "" : name);
                  setPage(0);
                }}
                title={name}
              >
                {name}
                <strong>{count}</strong>
              </button>
            ))}
          </div>
        </details>
      )}
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              {columns.map((k) => (
                <th key={k}>
                  <button
                    className="table-sort"
                    onClick={() => {
                      if (sort === k) setReverse(!reverse);
                      else {
                        setSort(k);
                        setReverse(false);
                      }
                    }}
                  >
                    {k}
                    {sort === k ? (reverse ? " ↓" : " ↑") : ""}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.slice(current * 25, (current + 1) * 25).map((row, i) => (
              <tr key={i}>
                {columns.map((k) => (
                  <td key={k} title={cell(row[k])}>
                    {cell(row[k]).slice(0, 240)}
                    {cell(row[k]).length > 240 ? "…" : ""}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!filtered.length && (
        <p className="muted">No matching records in this scope.</p>
      )}
      <div className="inventory-pagination">
        <span>
          {filtered.length.toLocaleString()} matching records · page{" "}
          {current + 1} of {pages}
        </span>
        <button disabled={current === 0} onClick={() => setPage(current - 1)}>
          Previous
        </button>
        <button
          disabled={current >= pages - 1}
          onClick={() => setPage(current + 1)}
        >
          Next
        </button>
      </div>
      {data.truncated && (
        <p role="status" className="inline-error">
          Partial inventory: counts cover only returned records. Narrow the
          region or resource scope, or increase the query limit.
        </p>
      )}
      {!!data.errors?.length && (
        <p role="status" className="inline-error">
          {data.errors.map((e: any) => `${e.scope}: ${e.error}`).join("; ")}
        </p>
      )}
      {data.countNote && <p className="muted">{data.countNote}</p>}
      <div className="widget-footer">
        <span>
          {data.mode === "demo" ? "Demo data" : "AWS data"} · cached up to 5
          minutes
        </span>
        <span>Fetched {new Date(data.fetchedAt).toLocaleString()}</span>
      </div>
    </div>
  );
}
