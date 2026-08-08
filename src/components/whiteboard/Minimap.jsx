import { useRef } from "react";

/* A corner overview of the whole board: zones as tinted frames, nodes as
   solid blips in their accent colour, and the current camera as an outlined
   rectangle. Click or drag anywhere on it to centre the camera there.

   Pure by construction — geometry, colours, and the camera all arrive as
   props — and scaled from the content's bounding box (not the camera), so
   the map stays still while the viewport rectangle glides over it. */

const MAP_W = 280;      // px, map width budget
const MAP_H = 200;      // px, map height budget
const PAD = 60;         // world px of breathing room around the content

export default function Minimap({ nodes, zones, rectOf, fillOf, view, viewportSize, setView }) {
  const svgRef = useRef(null);
  const boxes = [...zones, ...nodes.map(rectOf)];
  if (!boxes.length || !viewportSize.w) return null;

  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const b of boxes) {
    x0 = Math.min(x0, b.x); y0 = Math.min(y0, b.y);
    x1 = Math.max(x1, b.x + b.w); y1 = Math.max(y1, b.y + b.h);
  }
  x0 -= PAD; y0 -= PAD; x1 += PAD; y1 += PAD;
  const s = Math.min(MAP_W / (x1 - x0), MAP_H / (y1 - y0));
  const w = (x1 - x0) * s, h = (y1 - y0) * s;

  // what the camera can see, in world coordinates
  const vp = { x: -view.x / view.k, y: -view.y / view.k,
               w: viewportSize.w / view.k, h: viewportSize.h / view.k };

  const centreOn = (e) => {
    const r = svgRef.current.getBoundingClientRect();
    const wx = x0 + (e.clientX - r.left) / s;
    const wy = y0 + (e.clientY - r.top) / s;
    setView({ k: view.k, x: viewportSize.w / 2 - wx * view.k, y: viewportSize.h / 2 - wy * view.k });
  };
  const onPointerDown = (e) => {
    e.stopPropagation();                       // the canvas underneath would start a pan
    e.preventDefault();
    svgRef.current.setPointerCapture?.(e.pointerId);
    centreOn(e);
  };
  const onPointerMove = (e) => {
    if (svgRef.current.hasPointerCapture?.(e.pointerId)) centreOn(e);
  };

  return (
    <svg ref={svgRef} className="ew-minimap" width={w} height={h}
         viewBox={`${x0} ${y0} ${x1 - x0} ${y1 - y0}`}
         onPointerDown={onPointerDown} onPointerMove={onPointerMove}>
      <title>Board overview — click or drag to move the camera</title>
      {zones.map((z) => (
        <rect key={z.id} x={z.x} y={z.y} width={z.w} height={z.h} rx={14 / s}
              fill={z.color || "currentColor"} fillOpacity="0.08"
              stroke={z.color || "currentColor"} strokeOpacity="0.5" strokeWidth={1 / s} />
      ))}
      {nodes.map((n) => {
        const r = rectOf(n);
        return <rect key={n.id} x={r.x} y={r.y} width={r.w} height={r.h} rx={8 / s}
                     fill={fillOf(n)} fillOpacity="0.85" className="ew-minimap-node" />;
      })}
      <rect className="ew-minimap-vp" x={vp.x} y={vp.y} width={vp.w} height={vp.h}
            vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
