/* 브라우즈 페이지의 목록 필터.
   서버도 프레임워크도 없다 — 항목이 최대 217개라 매 입력마다 전체를 훑어도 즉시 끝난다.
   JS가 없으면 전체 목록이 그대로 보인다(점진적 향상). */

(() => {
  const norm = (s) => (s || "").normalize("NFC").toLowerCase();

  document.querySelectorAll("[data-filterable]").forEach((list) => {
    const items = [...list.children];
    const box = document.querySelector(`input[type="search"]`);
    const counter = document.querySelector(`[data-count-for="${list.id}"]`);
    const facetBar = document.querySelector(".facets");
    let facet = "";
    let query = "";

    const apply = () => {
      let shown = 0;
      for (const li of items) {
        const text = norm(li.dataset.text || li.textContent);
        const roles = (li.dataset.roles || li.dataset.facet || "").split("|");
        const okFacet = !facet || roles.includes(facet);
        const okQuery = !query || text.includes(query);
        const ok = okFacet && okQuery;
        li.hidden = !ok;
        if (ok) shown += 1;
      }
      if (counter) {
        counter.textContent =
          shown === items.length ? `${items.length}개 전체` : `${shown} / ${items.length}개`;
      }
    };

    if (box) {
      box.addEventListener("input", () => {
        query = norm(box.value);
        apply();
      });
    }

    if (facetBar) {
      facetBar.addEventListener("click", (e) => {
        const btn = e.target.closest(".fchip");
        if (!btn) return;
        facet = btn.dataset.facet || "";
        facetBar.querySelectorAll(".fchip").forEach((b) => b.classList.toggle("is-on", b === btn));
        apply();
      });
    }

    apply();
  });
})();
