export interface MosaicSnapshot {
  dom: {
    parent: HTMLElement;
    order: number;
    id: string;
  }[];
}

export function createSnapshot(root: HTMLElement): MosaicSnapshot {
  const nodes = Array.from(root.querySelectorAll("[data-mosaic-id]"));

  return {
    dom: nodes.map((el) => ({
      id: el.getAttribute("data-mosaic-id")!,
      parent: el.parentElement!,
      order: Array.from(el.parentElement!.children).indexOf(el),
    })),
  };
}

export function restoreSnapshot(s: MosaicSnapshot | null | undefined) {
  if (!s || !Array.isArray(s.dom)) return;

  for (const { id, parent, order } of s.dom) {
    const el = document.querySelector(`[data-mosaic-id="${id}"]`);
    if (!el) continue;

    const ref = parent.children[order] || null;
    parent.insertBefore(el, ref);
  }
}
