import { TYPES } from "../../data/whiteboardTypes";
import { snap } from "../../utils/whiteboardGeometry";

/* Pointer-gesture controller for the whiteboard canvas: pan, marquee select,
   node move/resize, zone move/resize, connect, and palette drag-and-drop.

   All mutable state is owned by the component and threaded in via `deps`, so
   the returned handlers close over fresh values on every render (matching the
   previous inline behaviour). Refs and state setters are stable. */
export function useDragController(deps) {
  const {
    dragRef, viewportRef, lastClickRef,
    view, sel, nodes, edges, zones, nodeById,
    setView, setMarquee, setSel, setNodes, setZones, setEdges, setConnect, setGhost, setEditing, setRouteTick,
    toWorld, snapshot, uid, rectOf,
  } = deps;

  const startPan = (e) => {
    if (e.button !== 0) return;
    if (e.shiftKey) {                                  /* marquee select */
      const w = toWorld(e.clientX, e.clientY);
      dragRef.current = { mode: "marquee", x0: w.x, y0: w.y };
      setMarquee({ x0: w.x, y0: w.y, x1: w.x, y1: w.y });
    } else {
      dragRef.current = { mode: "pan", sx: e.clientX, sy: e.clientY, v0: view };
      setSel(null);
    }
    viewportRef.current.setPointerCapture(e.pointerId);
  };

  const startMove = (e, id) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    if (e.shiftKey) {                                  /* toggle multi-selection */
      setSel((prev) => {
        const ids = prev && prev.kind === "nodes" ? [...prev.ids] : [];
        const i = ids.indexOf(id);
        if (i >= 0) ids.splice(i, 1); else ids.push(id);
        return ids.length ? { kind: "nodes", ids } : null;
      });
      return;
    }
    /* manual double-click detection (pointer capture retargets clicks) */
    const now = Date.now();
    if (lastClickRef.current.id === id && now - lastClickRef.current.t < 350) {
      e.preventDefault();                              /* keep focus on the rename input */
      lastClickRef.current = { id: null, t: 0 };
      setEditing(id);
      return;
    }
    lastClickRef.current = { id, t: now };

    const w = toWorld(e.clientX, e.clientY);
    const already = sel && sel.kind === "nodes" && sel.ids.includes(id);
    const ids = already ? sel.ids : [id];
    if (!already) setSel({ kind: "nodes", ids: [id] });
    const starts = {};
    for (const i2 of ids) { const n = nodeById[i2]; if (n) starts[i2] = { x: n.x, y: n.y }; }
    dragRef.current = { mode: "move", ids, starts, px: w.x, py: w.y, snapped: false };
    viewportRef.current.setPointerCapture(e.pointerId);
  };

  const startResize = (e, id) => {
    e.stopPropagation();
    const r = rectOf(nodeById[id]);
    const w0 = toWorld(e.clientX, e.clientY);
    dragRef.current = { mode: "resize", id, w: r.w, h: r.h, px: w0.x, py: w0.y, snapped: false };
    viewportRef.current.setPointerCapture(e.pointerId);
  };

  const startConnect = (e, id) => {
    e.stopPropagation();
    const w = toWorld(e.clientX, e.clientY);
    dragRef.current = { mode: "connect", from: id };
    viewportRef.current.setPointerCapture(e.pointerId);
    setConnect({ from: id, cx: w.x, cy: w.y });
  };

  /* Start dragging a connector waypoint. When `insertAt` is given a new
     waypoint is inserted at `index` first (used by the "add bend" handles). */
  const startEdgePoint = (e, edgeId, index, insertAt) => {
    e.stopPropagation();
    snapshot();
    if (insertAt) {
      const p = { x: snap(insertAt.x), y: snap(insertAt.y) };
      setEdges((es) => es.map((x) => {
        if (x.id !== edgeId) return x;
        const pts = (x.pts || []).slice();
        pts.splice(index, 0, p);
        return { ...x, pts };
      }));
    }
    dragRef.current = { mode: "edgept", edgeId, index };
    viewportRef.current.setPointerCapture(e.pointerId);
  };

  const startZoneMove = (e, id) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    if (e.shiftKey) {                                  /* toggle multi-zone selection */
      setSel((prev) => {
        const ids = prev && prev.kind === "zones" ? [...prev.ids]
                  : prev && prev.kind === "zone" ? [prev.id] : [];
        const i = ids.indexOf(id);
        if (i >= 0) ids.splice(i, 1); else ids.push(id);
        return ids.length > 1 ? { kind: "zones", ids }
             : ids.length === 1 ? { kind: "zone", id: ids[0] } : null;
      });
      return;
    }
    setSel({ kind: "zone", id });
    const z = zones.find((x) => x.id === id);
    const w = toWorld(e.clientX, e.clientY);
    /* zone drags its contents: capture nodes whose centers are inside */
    const nstarts = {};
    for (const n of nodes) {
      const r = rectOf(n);
      const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
      if (cx >= z.x && cx <= z.x + z.w && cy >= z.y && cy <= z.y + z.h)
        nstarts[n.id] = { x: n.x, y: n.y };
    }
    dragRef.current = { mode: "zmove", id, zx: z.x, zy: z.y, nstarts, px: w.x, py: w.y, snapped: false };
    viewportRef.current.setPointerCapture(e.pointerId);
  };

  const startZoneResize = (e, id) => {
    e.stopPropagation();
    const z = zones.find((x) => x.id === id);
    const w = toWorld(e.clientX, e.clientY);
    dragRef.current = { mode: "zresize", id, w: z.w, h: z.h, px: w.x, py: w.y, snapped: false };
    viewportRef.current.setPointerCapture(e.pointerId);
  };

  const paletteMove = (e) => setGhost((g) => (g ? { ...g, cx: e.clientX, cy: e.clientY } : g));
  const paletteUp = (e) => {
    window.removeEventListener("pointermove", paletteMove);
    const d = dragRef.current;
    dragRef.current = null;
    setGhost(null);
    if (!d || d.mode !== "palette") return;
    const r = viewportRef.current.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) return;
    const w = toWorld(e.clientX, e.clientY);
    const t = TYPES[d.type];
    const id = uid("n");
    snapshot();
    setNodes((ns) => [...ns, { id, type: d.type, x: snap(w.x - t.w / 2), y: snap(w.y - t.h / 2) }]);
    setSel({ kind: "nodes", ids: [id] });
  };
  const startPalette = (e, type) => {
    if (e.button !== 0) return;
    e.preventDefault();
    dragRef.current = { mode: "palette", type };
    setGhost({ type, cx: e.clientX, cy: e.clientY });
    window.addEventListener("pointermove", paletteMove);
    window.addEventListener("pointerup", paletteUp, { once: true });
  };

  const onMove = (e) => {
    const d = dragRef.current;
    if (!d) return;
    const lazySnap = () => { if (!d.snapped) { snapshot(); d.snapped = true; } };
    if (d.mode === "pan") {
      setView({ ...d.v0, x: d.v0.x + (e.clientX - d.sx), y: d.v0.y + (e.clientY - d.sy) });
    } else if (d.mode === "marquee") {
      const w = toWorld(e.clientX, e.clientY);
      setMarquee({ x0: d.x0, y0: d.y0, x1: w.x, y1: w.y });
    } else if (d.mode === "move") {
      lazySnap();
      const w = toWorld(e.clientX, e.clientY);
      const dx = w.x - d.px, dy = w.y - d.py;
      setNodes((ns) => ns.map((n) => d.starts[n.id]
        ? { ...n, x: snap(d.starts[n.id].x + dx), y: snap(d.starts[n.id].y + dy) } : n));
    } else if (d.mode === "resize") {
      lazySnap();
      const w = toWorld(e.clientX, e.clientY);
      const nw = Math.max(96, Math.min(640, snap(d.w + (w.x - d.px))));
      const nh = Math.max(48, Math.min(420, snap(d.h + (w.y - d.py))));
      setNodes((ns) => ns.map((n) => (n.id === d.id ? { ...n, w: nw, h: nh } : n)));
    } else if (d.mode === "zmove") {
      lazySnap();
      const w = toWorld(e.clientX, e.clientY);
      const dx = w.x - d.px, dy = w.y - d.py;
      setZones((zs) => zs.map((z) => (z.id === d.id ? { ...z, x: snap(d.zx + dx), y: snap(d.zy + dy) } : z)));
      setNodes((ns) => ns.map((n) => d.nstarts[n.id]
        ? { ...n, x: snap(d.nstarts[n.id].x + dx), y: snap(d.nstarts[n.id].y + dy) } : n));
    } else if (d.mode === "zresize") {
      lazySnap();
      const w = toWorld(e.clientX, e.clientY);
      const nw = Math.max(160, Math.min(2400, snap(d.w + (w.x - d.px))));
      const nh = Math.max(120, Math.min(1600, snap(d.h + (w.y - d.py))));
      setZones((zs) => zs.map((z) => (z.id === d.id ? { ...z, w: nw, h: nh } : z)));
    } else if (d.mode === "connect") {
      const w = toWorld(e.clientX, e.clientY);
      setConnect((c) => (c ? { ...c, cx: w.x, cy: w.y } : c));
    } else if (d.mode === "edgept") {
      const w = toWorld(e.clientX, e.clientY);
      const p = { x: snap(w.x), y: snap(w.y) };
      setEdges((es) => es.map((x) => (x.id === d.edgeId
        ? { ...x, pts: (x.pts || []).map((q, i) => (i === d.index ? p : q)) } : x)));
    }
  };

  const onUp = (e) => {
    const d = dragRef.current;
    if (!d) return;
    if (d.mode === "palette") return;                  /* finalized by window paletteUp */
    dragRef.current = null;
    // a completed move/resize/reshape needs a clean full re-route (final coords)
    if (d.mode === "move" || d.mode === "resize" || d.mode === "zmove" || d.mode === "zresize" || d.mode === "edgept") {
      setRouteTick((t) => t + 1);
    }
    if (d.mode === "connect") {
      const w = toWorld(e.clientX, e.clientY);
      const hitNode = nodes.find((n) => {
        const r = rectOf(n);
        return w.x >= r.x && w.x <= r.x + r.w && w.y >= r.y && w.y <= r.y + r.h;
      });
      // fall back to the topmost zone under the pointer (connect to a zone)
      const hitZone = !hitNode && [...zones].reverse().find((z) => w.x >= z.x && w.x <= z.x + z.w && w.y >= z.y && w.y <= z.y + z.h);
      const target = hitNode ? hitNode.id : hitZone ? hitZone.id : null;
      if (target && target !== d.from &&
          !edges.some((ed) => ed.s === d.from && ed.e === target)) {
        snapshot();
        setEdges((es) => [...es, { id: uid("e"), s: d.from, e: target }]);
      }
      setConnect(null);
    } else if (d.mode === "marquee") {
      const w = toWorld(e.clientX, e.clientY);
      const x0 = Math.min(d.x0, w.x), x1 = Math.max(d.x0, w.x);
      const y0 = Math.min(d.y0, w.y), y1 = Math.max(d.y0, w.y);
      const ids = nodes.filter((n) => {
        const r = rectOf(n);
        return r.x < x1 && r.x + r.w > x0 && r.y < y1 && r.y + r.h > y0;
      }).map((n) => n.id);
      setSel(ids.length ? { kind: "nodes", ids } : null);
      setMarquee(null);
    }
  };

  return {
    startPan, startMove, startResize, startConnect, startZoneMove, startZoneResize,
    startPalette, startEdgePoint, onMove, onUp,
  };
}
