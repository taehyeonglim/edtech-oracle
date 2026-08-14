import { pageUrl, assetUrl } from "./urls.mjs";
import { esc, layout } from "./layout.mjs";

/**
 * 대립축 네트워크.
 *
 * 레이아웃을 **빌드 타임에 확정한다.** 런타임 시각화 라이브러리를 쓰지 않으므로 의존성 0
 * 원칙이 유지되고, 모든 방문자가 같은 그림을 보며("왼쪽 위 클러스터" 같은 대화가 성립),
 * 새로고침해도 흔들리지 않고, JS가 꺼져 있어도 SVG는 완전히 읽히고 클릭된다.
 *
 * 실측 그래프는 노드 36 · 엣지 34 · 평균 차수 1.89 · 고립 6이다. 거의 나무에 가까워서
 * 근사 알고리즘(Barnes–Hut)이 전혀 필요 없다 — n=30에서 O(n²)×400회가 20ms 미만이다.
 */

export const GRAPH_W = 1000;
export const GRAPH_H = 660;
const STRIP_H = 120;

export function buildGraph(model) {
  const nodes = (model.byType.get("pioneer") ?? [])
    .map((p) => ({ id: p.id, label: p.fm.title ?? p.id, degree: 0 }))
    .sort((a, b) => a.id.localeCompare(b.id));
  const byId = new Map(nodes.map((n) => [n.id, n]));

  const edges = [];
  for (const e of model.edges) {
    const a = byId.get(e.a);
    const b = byId.get(e.b);
    if (!a || !b) continue; // 어서션이 이미 막지만 방어적으로 둔다
    a.degree += 1;
    b.degree += 1;
    edges.push({ id: e.id, title: e.title, source: e.a, target: e.b });
  }
  edges.sort((x, y) => x.id.localeCompare(y.id));
  return { nodes, edges };
}

/** union-find로 연결 요소를 나눈다. */
function components(graph) {
  const parent = new Map(graph.nodes.map((n) => [n.id, n.id]));
  const find = (x) => {
    while (parent.get(x) !== x) {
      parent.set(x, parent.get(parent.get(x)));
      x = parent.get(x);
    }
    return x;
  };
  for (const e of graph.edges) {
    const ra = find(e.source);
    const rb = find(e.target);
    if (ra !== rb) parent.set(ra, rb);
  }
  const groups = new Map();
  for (const n of graph.nodes) {
    const r = find(n.id);
    if (!groups.has(r)) groups.set(r, []);
    groups.get(r).push(n.id);
  }
  // 큰 것부터. 동률은 id 사전순으로 깨서 결정적으로 만든다.
  return [...groups.values()]
    .map((ids) => ids.slice().sort())
    .sort((a, b) => b.length - a.length || a[0].localeCompare(b[0]));
}

/**
 * Fruchterman–Reingold. **난수를 쓰지 않는다** — id 사전순 원형 초기화라
 * 같은 입력이면 언제나 바이트 동일한 좌표가 나온다.
 */
export function layoutGraph(graph, { width = GRAPH_W, height = GRAPH_H, iterations = 400 } = {}) {
  const pos = new Map();
  const comps = components(graph);
  const connected = comps.filter((c) => c.length > 1);
  const isolated = comps.filter((c) => c.length === 1).flat();

  const edgesOf = (ids) => {
    const set = new Set(ids);
    return graph.edges.filter((e) => set.has(e.source) && set.has(e.target));
  };

  const boxes = [];
  for (const ids of connected) {
    const n = ids.length;
    const area = 320 * 320 * Math.max(1, n / 8);
    const side = Math.sqrt(area);
    const k = Math.sqrt(area / n);
    const p = new Map();

    // 결정적 초기 배치: 사전순으로 원 위에 등간격.
    const r0 = side / 2.6;
    ids.forEach((id, i) => {
      const a = (2 * Math.PI * i) / n;
      p.set(id, { x: side / 2 + r0 * Math.cos(a), y: side / 2 + r0 * Math.sin(a) });
    });

    const local = edgesOf(ids);
    let temp = side / 8;
    const cool = temp / (iterations + 1);

    for (let it = 0; it < iterations; it++) {
      const disp = new Map(ids.map((id) => [id, { x: 0, y: 0 }]));

      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          const a = p.get(ids[i]);
          const b = p.get(ids[j]);
          let dx = a.x - b.x;
          let dy = a.y - b.y;
          let d = Math.hypot(dx, dy);
          if (d < 0.01) {
            // 완전 중첩은 난수가 아니라 인덱스 기반 고정 오프셋으로 뗀다(결정성 유지).
            dx = ((i % 7) - 3) * 0.5 || 0.5;
            dy = ((j % 5) - 2) * 0.5 || 0.5;
            d = Math.hypot(dx, dy);
          }
          const f = (k * k) / d;
          const ux = (dx / d) * f;
          const uy = (dy / d) * f;
          disp.get(ids[i]).x += ux;
          disp.get(ids[i]).y += uy;
          disp.get(ids[j]).x -= ux;
          disp.get(ids[j]).y -= uy;
        }
      }

      for (const e of local) {
        const a = p.get(e.source);
        const b = p.get(e.target);
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const d = Math.max(0.01, Math.hypot(dx, dy));
        const f = (d * d) / k;
        const ux = (dx / d) * f;
        const uy = (dy / d) * f;
        disp.get(e.source).x -= ux;
        disp.get(e.source).y -= uy;
        disp.get(e.target).x += ux;
        disp.get(e.target).y += uy;
      }

      for (const id of ids) {
        const d = disp.get(id);
        const len = Math.max(0.01, Math.hypot(d.x, d.y));
        const step = Math.min(len, temp);
        const q = p.get(id);
        q.x += (d.x / len) * step;
        q.y += (d.y / len) * step;
      }
      temp -= cool;
    }

    const xs = ids.map((id) => p.get(id).x);
    const ys = ids.map((id) => p.get(id).y);
    boxes.push({
      ids,
      p,
      minX: Math.min(...xs),
      maxX: Math.max(...xs),
      minY: Math.min(...ys),
      maxY: Math.max(...ys),
    });
  }

  // 컴포넌트 패킹 — 큰 것부터 좌→우.
  // 배율은 **전체가 캔버스에 들어가도록 한 번에** 정한다. 컴포넌트마다 따로 맞추면
  // 앞의 큰 덩어리가 폭을 다 먹고 뒤의 작은 섬이 캔버스 밖으로 밀려난다.
  const pad = 60;
  const gap = 54;
  const usableH = height - STRIP_H;
  const innerW = width - pad * 2 - gap * Math.max(0, boxes.length - 1);
  const innerH = usableH - pad * 2;

  const sumW = boxes.reduce((s, b) => s + Math.max(1, b.maxX - b.minX), 0) || 1;
  const maxH = Math.max(1, ...boxes.map((b) => b.maxY - b.minY));
  const scale = Math.max(0.05, Math.min(innerW / sumW, innerH / maxH, 1.6));

  let cursorX = pad;
  for (const box of boxes) {
    const w = Math.max(1, box.maxX - box.minX) * scale;
    const h = Math.max(1, box.maxY - box.minY) * scale;
    const offsetY = pad + (innerH - h) / 2;
    for (const id of box.ids) {
      const q = box.p.get(id);
      pos.set(id, {
        x: cursorX + (q.x - box.minX) * scale,
        y: offsetY + (q.y - box.minY) * scale,
      });
    }
    cursorX += w + gap;
  }

  // 고립 노드는 하단 스트립에 격자로. 그래프에서 지우지 않는다 —
  // 데이터가 관계를 담지 않았다는 사실 자체가 보여야 한다.
  const perRow = Math.max(1, Math.min(isolated.length, 6));
  isolated.forEach((id, i) => {
    const col = i % perRow;
    const row = Math.floor(i / perRow);
    pos.set(id, {
      x: pad + ((width - pad * 2) * (col + 0.5)) / perRow,
      y: usableH + 42 + row * 44,
    });
  });

  return pos;
}

const radius = (degree) => 5 + Math.min(degree, 6) * 2.2;

export function toSvg(model, graph, pos) {
  const byId = new Map(graph.nodes.map((n) => [n.id, n]));

  const lines = graph.edges
    .map((e) => {
      const a = pos.get(e.source);
      const b = pos.get(e.target);
      if (!a || !b) return "";
      return `<a href="${esc(pageUrl(e.id))}" class="g-edge" data-a="${esc(e.source)}" data-b="${esc(e.target)}">
<title>${esc(e.title)}</title>
<line x1="${a.x.toFixed(1)}" y1="${a.y.toFixed(1)}" x2="${b.x.toFixed(1)}" y2="${b.y.toFixed(1)}"></line>
</a>`;
    })
    .join("\n");

  const dots = graph.nodes
    .map((n) => {
      const q = pos.get(n.id);
      if (!q) return "";
      const r = radius(n.degree);
      return `<a href="${esc(pageUrl(n.id))}" class="g-node${n.degree === 0 ? " g-node--iso" : ""}" data-node="${esc(n.id)}" data-degree="${n.degree}">
<title>${esc(n.label)} — 대립축 ${n.degree}</title>
<circle cx="${q.x.toFixed(1)}" cy="${q.y.toFixed(1)}" r="${r.toFixed(1)}"></circle>
<text x="${q.x.toFixed(1)}" y="${(q.y - r - 5).toFixed(1)}" text-anchor="middle">${esc(n.label)}</text>
</a>`;
    })
    .join("\n");

  const isoY = GRAPH_H - STRIP_H + 16;
  return `<svg class="graph" viewBox="0 0 ${GRAPH_W} ${GRAPH_H}" role="img"
  aria-label="교육공학 위인 ${graph.nodes.length}명과 대립축 ${graph.edges.length}개의 관계도">
<g class="g-edges">
${lines}
</g>
<line class="g-divider" x1="40" y1="${isoY}" x2="${GRAPH_W - 40}" y2="${isoY}"></line>
<text class="g-striplabel" x="40" y="${isoY - 8}">대립축 없음</text>
<g class="g-nodes">
${dots}
</g>
</svg>`;
}

export function renderGraphPage(model, graph, pos, nav) {
  const degreeRows = graph.nodes
    .slice()
    .sort((a, b) => b.degree - a.degree || a.label.localeCompare(b.label, "ko"))
    .map((n) => {
      const partners = graph.edges
        .filter((e) => e.source === n.id || e.target === n.id)
        .map((e) => (e.source === n.id ? e.target : e.source))
        .map((id) => byLabel(graph, id));
      return `<li class="row"><span class="row__title">${esc(n.label)}
<span class="count">${n.degree}</span></span>
<p class="row__sub">${
        partners.length
          ? partners.map((x) => esc(x)).join('<span class="sep">·</span>')
          : "<span class='empty'>—</span>"
      }</p></li>`;
    })
    .join("\n");

  const iso = graph.nodes.filter((n) => n.degree === 0).length;

  return layout({
    fromId: "graph-page",
    title: "대립축 지도",
    subtitle: "위인 36명과 대립축 34개",
    nav,
    extraHead: `<script src="${esc(assetUrl("graph-page", "graph.js"))}" defer></script>`,
    body: `<header class="page-head">
<p class="kicker">지도</p>
<h1>대립축 네트워크</h1>
<p class="lede">노드 ${graph.nodes.length} · 엣지 ${graph.edges.length} · 평균 차수
${(graph.edges.length * 2 / graph.nodes.length).toFixed(2)} · 고립 ${iso}.
데이터가 얇다는 사실을 그림으로 감추지 않는다 — 아래 표에 정확한 수치가 있다.
노드와 선 모두 클릭된다.</p>
</header>
<figure class="graph-wrap">
${toSvg(model, graph, pos)}
<figcaption>레이아웃은 빌드 시점에 확정된다. 같은 입력이면 언제나 같은 그림이다.</figcaption>
</figure>
<section>
<h2>차수 순 인접 목록</h2>
<ul class="rows">
${degreeRows}
</ul>
</section>`,
  });
}

const byLabel = (graph, id) => graph.nodes.find((n) => n.id === id)?.label ?? id;
