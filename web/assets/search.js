/* 전문 검색.
   색인 자료구조가 없다 — 문서 217개를 매 입력마다 선형 스캔한다. 밀리초 단위로 끝나고,
   한국어 교착어에서는 부분 문자열이 토큰 역색인보다 오히려 정확하다("구성주의"가
   "구성주의적"을 잡는다).

   점수 로직은 scripts/site/search.mjs의 scoreDoc과 같은 규칙이다. 단위 테스트는
   .mjs 쪽에서 돈다. 규칙을 바꾸면 양쪽을 같이 바꿔야 한다. */

(() => {
  const input = document.getElementById("q");
  const status = document.getElementById("search-status");
  const out = document.getElementById("search-results");
  if (!input || !out) return;

  const norm = (s) => String(s ?? "").normalize("NFC").toLowerCase().replace(/\s+/g, " ").trim();
  const esc = (s) =>
    String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const LABEL = { pioneer: "위인", debate: "대립축", concept: "개념", source: "출처", meta: "운영" };

  let docs = null;

  function score(doc, terms) {
    const t = norm(doc.t);
    const s = norm(doc.s);
    const h = norm((doc.h || []).join(" "));
    const b = norm(doc.b);
    let total = 0;
    for (const term of terms) {
      let sc = 0;
      if (t === term) sc += 120;
      else if (t.includes(term)) sc += 60;
      if (h.includes(term)) sc += 25;
      if (s.includes(term)) sc += 15;
      if (b.includes(term)) {
        sc += 10;
        sc += Math.min(b.split(term).length - 1, 8);
      }
      if (sc === 0) return 0;
      total += sc;
    }
    return total;
  }

  function snippet(text, term) {
    const lower = norm(text);
    const i = lower.indexOf(term);
    if (i < 0) return esc(text.slice(0, 130)) + "…";
    const from = Math.max(0, i - 55);
    const before = text.slice(from, i);
    const hit = text.slice(i, i + term.length);
    const after = text.slice(i + term.length, i + term.length + 75);
    return (
      (from > 0 ? "…" : "") + esc(before) + "<mark>" + esc(hit) + "</mark>" + esc(after) + "…"
    );
  }

  function render(query) {
    const terms = norm(query).split(" ").filter(Boolean);
    out.innerHTML = "";
    if (!terms.length) {
      status.textContent = `${docs.length}개 문서에서 검색한다.`;
      return;
    }
    const hits = docs
      .map((d) => ({ d, s: score(d, terms) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s || a.d.t.localeCompare(b.d.t, "ko"))
      .slice(0, 60);

    status.textContent = hits.length ? `${hits.length}건` : "결과 없음";
    out.innerHTML = hits
      .map(
        ({ d }) =>
          `<li><a href="${d.u}">${esc(d.t)}</a> ` +
          `<span class="badge">${LABEL[d.y] || d.y}</span>` +
          (d.s ? `<p>${esc(d.s)}</p>` : "") +
          `<p>${snippet(d.b, terms[0])}</p></li>`
      )
      .join("");
  }

  let timer;
  const onInput = () => {
    clearTimeout(timer);
    timer = setTimeout(() => docs && render(input.value), 110);
  };

  fetch("search-index.json")
    .then((r) => r.json())
    .then((data) => {
      docs = data.docs;
      input.addEventListener("input", onInput);
      const q = new URLSearchParams(location.search).get("q");
      if (q) {
        input.value = q;
        render(q);
      } else {
        status.textContent = `${docs.length}개 문서에서 검색한다.`;
      }
    })
    .catch(() => {
      status.textContent = "색인을 불러오지 못했다. 로컬 파일로 열었다면 npm run preview 를 쓴다.";
    });
})();
