import { useRef, useState } from "react";

const clone = (x) => JSON.parse(JSON.stringify(x));

/* Undo/redo history for the whiteboard document.
   - `docRef` is a ref whose `.current` is the live { nodes, edges, zones }.
   - `restore(doc)` applies a snapshot back to component state.
   Returns snapshot helpers and the current undo/redo availability. */
export function useHistory(docRef, restore) {
  const histRef = useRef({ undo: [], redo: [] });
  const snapKeyRef = useRef({ k: null, t: 0 });
  const [, bump] = useState(0);

  const snapshot = () => {
    const h = histRef.current;
    h.undo.push(clone(docRef.current));
    if (h.undo.length > 60) h.undo.shift();
    h.redo = [];
    bump((t) => t + 1);
  };

  /* one snapshot per continuous edit target (e.g. typing in a field) */
  const snapGuard = (key) => {
    const now = Date.now();
    if (snapKeyRef.current.k !== key || now - snapKeyRef.current.t > 1200) snapshot();
    snapKeyRef.current = { k: key, t: now };
  };

  const undo = () => {
    const h = histRef.current;
    if (!h.undo.length) return;
    h.redo.push(clone(docRef.current));
    restore(h.undo.pop());
    bump((t) => t + 1);
  };

  const redo = () => {
    const h = histRef.current;
    if (!h.redo.length) return;
    h.undo.push(clone(docRef.current));
    restore(h.redo.pop());
    bump((t) => t + 1);
  };

  return {
    snapshot,
    snapGuard,
    undo,
    redo,
    canUndo: histRef.current.undo.length > 0,
    canRedo: histRef.current.redo.length > 0,
  };
}
