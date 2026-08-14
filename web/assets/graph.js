/* 그래프 위 hover 강조.
   레이아웃은 빌드 시점에 확정돼 있다 — 여기서는 좌표를 계산하지 않는다.
   JS가 없어도 SVG는 완전히 읽히고 노드·엣지 모두 클릭된다. */

(() => {
  const svg = document.querySelector(".graph");
  if (!svg) return;

  const nodes = [...svg.querySelectorAll(".g-node")];
  const edges = [...svg.querySelectorAll(".g-edge")];

  const clear = () => {
    svg.classList.remove("is-focused");
    for (const el of [...nodes, ...edges]) el.classList.remove("is-hit");
  };

  const focus = (id) => {
    const near = new Set([id]);
    for (const e of edges) {
      const a = e.dataset.a;
      const b = e.dataset.b;
      if (a === id || b === id) {
        e.classList.add("is-hit");
        near.add(a);
        near.add(b);
      } else {
        e.classList.remove("is-hit");
      }
    }
    for (const n of nodes) n.classList.toggle("is-hit", near.has(n.dataset.node));
    svg.classList.add("is-focused");
  };

  for (const n of nodes) {
    const id = n.dataset.node;
    n.addEventListener("mouseenter", () => focus(id));
    n.addEventListener("focus", () => focus(id));
    n.addEventListener("mouseleave", clear);
    n.addEventListener("blur", clear);
  }
  svg.addEventListener("mouseleave", clear);
})();
