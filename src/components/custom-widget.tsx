"use client";
import { useEffect, useRef, useState } from 'react';
import { api, getSessionId, type WidgetSpec } from '../lib/types';

export function CustomWidget({ widget }: { widget: WidgetSpec }) {
  const [view, setView] = useState<any>(), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const state = useRef<unknown>(null), data = useRef<Record<string, unknown>>({}), worker = useRef<Worker | null>(null), timeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const run = (event: unknown = null) => {
    worker.current?.terminate(); clearTimeout(timeout.current);
    setBusy(true); setError('');
    const w = new Worker(`/${getSessionId()}/custom/worker.mjs`, { type: 'module' });
    worker.current = w;
    const stop = (message?: string) => { clearTimeout(timeout.current); w.terminate(); if (worker.current === w) worker.current = null; setBusy(false); if (message) setError(message); };
    timeout.current = setTimeout(() => stop('Custom widget exceeded its time limit. Last working view retained.'), 3000);
    w.onerror = () => stop('The isolated widget runtime could not start.');
    w.onmessage = ({ data: response }) => {
      if (worker.current !== w) return;
      if (response.error) return stop(response.error);
      state.current = response.result.state ?? null; setView(response.result.view); stop();
    };
    w.postMessage({ source: widget.custom!.source, input: { data: data.current, state: state.current, event } });
  };
  useEffect(() => {
    let alive = true, fetching = false;
    async function refresh() {
      if (fetching) return; fetching = true;
      try {
        const result = await api(`/api/sessions/${getSessionId()}/custom/${widget.id}/data`, {});
        if (alive) { data.current = result; run(); }
      } catch (e) { if (alive) setError((e as Error).message); }
      finally { fetching = false; }
    }
    const updated = () => { void refresh(); };
    window.addEventListener('dashboard-updated', updated);
    void refresh(); const interval = setInterval(() => { if (!document.hidden && !worker.current) void refresh(); }, 60000);
    return () => { alive = false; window.removeEventListener('dashboard-updated', updated); clearInterval(interval); clearTimeout(timeout.current); worker.current?.terminate(); worker.current = null; };
  }, [widget]);
  return <section className={`widget custom-widget ${widget.width === 'full' ? 'wide' : ''}`}>
    <span className="widget-kicker">ISOLATED CUSTOM WIDGET</span><h3>{widget.title}</h3>
    {widget.description && <p>{widget.description}</p>}
    {error && <p role="alert" className="inline-error">{error}</p>}
    {!view && !error && <p>Loading isolated visualization…</p>}
    {view && <>
      {view.title && <h4>{view.title}</h4>}{view.text && <p className="note-content">{view.text}</p>}
      {view.cards && <div className="custom-cards">{view.cards.map((c: any, i: number) => <div key={i} style={{ borderColor: c.color }}><small>{c.label}</small><strong>{c.value}</strong></div>)}</div>}
      {view.bars && <div>{view.bars.map((b: any, i: number) => <div key={i} className="custom-bar"><span>{b.label}: {b.value.toLocaleString()}</span><div style={{ width: `${100 * b.value / Math.max(1, ...view.bars.map((v: any) => v.value))}%`, background: b.color || '#178c76' }} /></div>)}</div>}
      {view.table && <div className="custom-table"><table><thead><tr>{view.table.columns.map((c: string, i: number) => <th key={i}>{c}</th>)}</tr></thead><tbody>{view.table.rows.map((row: string[], i: number) => <tr key={i}>{row.map((c, j) => <td key={j}>{c}</td>)}</tr>)}</tbody></table></div>}
      {view.scene && <Scene boxes={view.scene.boxes} />}
      <div className="custom-controls">{view.controls?.map((c: any) => <button className="secondary" key={c.id} disabled={busy} onClick={() => run({ type: 'control', id: c.id })}>{c.label}</button>)}</div>
    </>}
  </section>;
}

// Trusted perspective renderer: custom code supplies only validated bounded boxes.
// No custom WebGL shaders, textures, HTML, URLs or event handlers enter the host.
function Scene({ boxes }: { boxes: any[] }) {
  const canvas = useRef<HTMLCanvasElement>(null), camera = useRef({ x: 0, y: 4, z: -22, yaw: 0 });
  const [moving, setMoving] = useState(false);
  useEffect(() => {
    const el = canvas.current!, ctx = el.getContext('2d'); if (!ctx) return;
    const keys = new Set<string>(); let frame = 0, last = 0;
    const clear = () => { keys.clear(); setMoving(false); };
    const down = (e: KeyboardEvent) => { if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd', 'q', 'e'].includes(e.key)) { e.preventDefault(); keys.add(e.key); setMoving(true); } };
    const up = (e: KeyboardEvent) => { keys.delete(e.key); if (!keys.size) setMoving(false); };
    el.addEventListener('keydown', down); el.addEventListener('keyup', up); el.addEventListener('blur', clear);
    function draw(time: number) {
      const dt = Math.min(.04, (time - last) / 1000 || .016); last = time;
      const c = camera.current, speed = dt * 12;
      if (keys.has('ArrowLeft')) c.yaw -= dt; if (keys.has('ArrowRight')) c.yaw += dt;
      const forward = Number(keys.has('ArrowUp') || keys.has('w')) - Number(keys.has('ArrowDown') || keys.has('s'));
      const side = Number(keys.has('d')) - Number(keys.has('a'));
      c.x += (Math.sin(c.yaw) * forward + Math.cos(c.yaw) * side) * speed;
      c.z += (Math.cos(c.yaw) * forward - Math.sin(c.yaw) * side) * speed;
      c.y += (Number(keys.has('e')) - Number(keys.has('q'))) * speed;
      const width = el.width, height = el.height;
      ctx!.fillStyle = '#101e2a'; ctx!.fillRect(0, 0, width, height);
      const project = (x: number, y: number, z: number) => { const dx = x - c.x, dz = z - c.z; const depth = dx * Math.sin(c.yaw) + dz * Math.cos(c.yaw); return { x: width / 2 + (dx * Math.cos(c.yaw) - dz * Math.sin(c.yaw)) * 430 / depth, y: height / 2 - (y - c.y) * 430 / depth, depth }; };
      const faces: { points: ReturnType<typeof project>[]; color: string; depth: number }[] = [];
      for (const b of boxes) {
        const vertices = [[0,0,0],[1,0,0],[1,1,0],[0,1,0],[0,0,1],[1,0,1],[1,1,1],[0,1,1]].map(([x,y,z]) => project(b.x + x * b.width, b.y + y * b.height, b.z + z * b.depth));
        for (const face of [[0,1,2,3],[4,5,6,7],[0,4,7,3],[1,5,6,2],[3,2,6,7],[0,1,5,4]]) {
          const points = face.map(i => vertices[i]); if (points.some(p => p.depth < .3)) continue;
          faces.push({ points, color: b.color || '#28a78e', depth: points.reduce((n,p) => n+p.depth,0)/4 });
        }
      }
      for (const f of faces.sort((a,b) => b.depth - a.depth)) { ctx!.beginPath(); f.points.forEach((p,i) => i ? ctx!.lineTo(p.x,p.y) : ctx!.moveTo(p.x,p.y)); ctx!.closePath(); ctx!.fillStyle = f.color; ctx!.fill(); ctx!.strokeStyle = '#0d1925'; ctx!.stroke(); }
      ctx!.font = '12px system-ui'; ctx!.fillStyle = '#ffffff';
      for (const b of boxes) { const p = project(b.x+b.width/2,b.y+b.height+.4,b.z+b.depth/2); if (p.depth > .3) ctx!.fillText(b.label,p.x,p.y); }
      ctx!.fillText(`x ${c.x.toFixed(1)} · y ${c.y.toFixed(1)} · z ${c.z.toFixed(1)}`,12,height-14);
      frame = requestAnimationFrame(draw);
    }
    frame = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(frame); el.removeEventListener('keydown', down); el.removeEventListener('keyup', up); el.removeEventListener('blur', clear); };
  }, [boxes]);
  return <div className="custom-scene"><canvas ref={canvas} tabIndex={0} width={900} height={420} aria-label="Interactive 3D scene. Focus here; arrow keys fly and turn, A/D strafe, Q/E move vertically." data-moving={moving} /><p>Click the scene to fly: ↑/↓ forward/back · ←/→ turn · A/D strafe · Q/E vertical. <button onClick={() => { camera.current = { x: 0, y: 4, z: -22, yaw: 0 }; canvas.current?.focus(); }}>Reset camera</button></p><details><summary>Accessible scene data ({boxes.length} objects)</summary>{boxes.map((b, i) => <p key={i}>{b.label}: {b.width} × {b.height} × {b.depth}</p>)}</details></div>;
}
