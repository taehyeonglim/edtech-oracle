import test from "node:test";
import assert from "node:assert/strict";
import { buildGraph, layoutGraph, toSvg, GRAPH_W, GRAPH_H } from "../scripts/site/graph.mjs";
import { collect } from "../scripts/site/collect.mjs";

const model = collect({ wikiDir: "wiki", sourcesPath: "sources.json" });
const graph = buildGraph(model);

test("노드는 위인 전원, 엣지는 대립축 전부다", () => {
  assert.equal(graph.nodes.length, (model.byType.get("pioneer") ?? []).length);
  assert.equal(graph.edges.length, model.edges.length);
});

test("고립 노드도 그래프에 남는다 — 데이터가 얇다는 사실을 지우지 않는다", () => {
  const iso = graph.nodes.filter((n) => n.degree === 0);
  assert.ok(iso.length > 0, "실제 위키에 대립축 없는 위인이 있다");
  const pos = layoutGraph(graph);
  for (const n of iso) assert.ok(pos.has(n.id), `${n.id} 좌표 없음`);
});

test("레이아웃은 결정적이다 — 두 번 계산해도 좌표가 완전히 같다", () => {
  // 난수를 쓰지 않으므로 재빌드마다 그림이 흔들리지 않고 git diff가 깨끗하다.
  const a = layoutGraph(graph);
  const b = layoutGraph(graph);
  assert.equal(a.size, b.size);
  for (const [id, p] of a) {
    assert.equal(p.x, b.get(id).x, `${id}.x`);
    assert.equal(p.y, b.get(id).y, `${id}.y`);
  }
});

test("모든 좌표가 유한하고 캔버스 안에 있다", () => {
  const pos = layoutGraph(graph);
  for (const [id, p] of pos) {
    assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y), `${id} 비유한 좌표`);
    assert.ok(p.x >= -1 && p.x <= GRAPH_W + 1, `${id}.x 범위 밖: ${p.x}`);
    assert.ok(p.y >= -1 && p.y <= GRAPH_H + 1, `${id}.y 범위 밖: ${p.y}`);
  }
});

test("두 노드가 완전히 겹치지 않는다", () => {
  const pos = [...layoutGraph(graph).values()];
  for (let i = 0; i < pos.length; i++) {
    for (let j = i + 1; j < pos.length; j++) {
      const d = Math.hypot(pos[i].x - pos[j].x, pos[i].y - pos[j].y);
      assert.ok(d > 0.5, `노드 ${i}·${j}가 겹친다`);
    }
  }
});

test("SVG에 위인과 대립축 링크가 전부 들어간다", () => {
  const svg = toSvg(model, graph, layoutGraph(graph));
  for (const n of graph.nodes) {
    assert.ok(svg.includes(`href="${n.id}.html"`), `${n.id} 링크 없음`);
  }
  for (const e of graph.edges) {
    assert.ok(svg.includes(`href="${e.id}.html"`), `${e.id} 링크 없음`);
  }
});
