(function () {
  const KEY = "cpa20_toc_pinned";

  function qs(sel, root = document) { return root.querySelector(sel); }
  function qsa(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }

  function slugify(str) {
    return (str || "")
      .toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
  }

  function uniqueId(base, used) {
    let id = base || "secao";
    let i = 2;
    while (used.has(id) || document.getElementById(id)) id = `${base}-${i++}`;
    used.add(id);
    return id;
  }

  function cleanupIfNoTOC() {
    document.body.classList.remove("toc-open", "toc-pinned");
  }

  function buildTOC(tocEl) {
    const scopeSel = tocEl.dataset.tocScope || "main";
    const levels = (tocEl.dataset.tocLevels || "2,3")
      .split(",").map(s => parseInt(s.trim(), 10))
      .filter(n => n >= 1 && n <= 6);

    const scope = qs(scopeSel);
    if (!scope) return;

    const selector = levels.map(l => `h${l}`).join(",");
    const headings = qsa(selector, scope).filter(h => h.textContent.trim().length);

    const list = qs(".toc__list", tocEl);
    if (!list) return;
    list.innerHTML = "";

    const used = new Set();

    headings.forEach(h => {
      if (!h.id) h.id = uniqueId(slugify(h.textContent.trim()) || "secao", used);

      const level = parseInt(h.tagName.slice(1), 10);

      const li = document.createElement("li");
      li.className = "toc__item";
      li.dataset.level = String(level);

      const a = document.createElement("a");
      a.className = "toc__link";
      a.href = `#${h.id}`;
      a.textContent = h.textContent.trim();

      a.addEventListener("click", () => {
        if (!tocEl.classList.contains("is-pinned")) {
          tocEl.classList.remove("is-open");
          document.body.classList.remove("toc-open");
        }
      });

      li.appendChild(a);
      list.appendChild(li);
    });

    // highlight ativo no scroll
    const links = qsa(".toc__link", tocEl);
    const map = new Map();
    links.forEach(a => {
      const id = a.getAttribute("href").slice(1);
      const el = document.getElementById(id);
      if (el) map.set(el, a);
    });

    if ("IntersectionObserver" in window && map.size) {
      let last = null;
      const io = new IntersectionObserver((entries) => {
        const visible = entries
          .filter(e => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

        if (!visible.length) return;

        const a = map.get(visible[0].target);
        if (!a) return;

        if (last) last.classList.remove("is-active");
        a.classList.add("is-active");
        last = a;
      }, { rootMargin: "-20% 0px -70% 0px", threshold: [0.1, 0.25, 0.5] });

      map.forEach((_, el) => io.observe(el));
    }
  }

  function setupTOC() {
    const toc = qs("#toc");
    if (!toc) { cleanupIfNoTOC(); return; }

    const pinBtn = qs("#toc-pin", toc);

    // cria zona de hover (se não existir)
    if (!qs(".toc-hover-zone")) {
      const hz = document.createElement("div");
      hz.className = "toc-hover-zone";
      document.body.appendChild(hz);
    }

    function openTOC() {
      if (toc.classList.contains("is-pinned")) return;
      toc.classList.add("is-open");
      document.body.classList.add("toc-open");
    }

    function closeTOC() {
      if (toc.classList.contains("is-pinned")) return;
      toc.classList.remove("is-open");
      document.body.classList.remove("toc-open");
    }

    function applyPinned(isPinned) {
      toc.classList.toggle("is-pinned", isPinned);
      if (pinBtn) pinBtn.classList.toggle("is-active", isPinned);

      document.body.classList.toggle("toc-pinned", isPinned);

      if (isPinned) {
        toc.classList.add("is-open");
        document.body.classList.add("toc-open");
      } else {
        // se despinou, fecha (ele pode reabrir com mouse na borda)
        toc.classList.remove("is-open");
        document.body.classList.remove("toc-open");
      }

      localStorage.setItem(KEY, String(isPinned));
    }

    // estado inicial
    const pinned = localStorage.getItem(KEY) === "true";
    applyPinned(pinned);

    if (pinBtn) {
      pinBtn.addEventListener("click", () => {
        applyPinned(!toc.classList.contains("is-pinned"));
      });
    }

    // ✅ abre quando encostar na borda esquerda em QUALQUER altura
    const edgePx = 22; // combina com --toc-edge do CSS

    document.addEventListener("mousemove", (e) => {
      if (toc.classList.contains("is-pinned")) return;

      if (e.clientX <= edgePx) openTOC();

      // fecha quando mouse vai bem pra direita do painel
      const tocWidth = toc.getBoundingClientRect().width;
      if (e.clientX > tocWidth + 30) closeTOC();
    });

    // se o mouse sair do TOC e não estiver na borda, fecha
    toc.addEventListener("mouseleave", () => {
      closeTOC();
    });

    buildTOC(toc);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setupTOC);
  } else {
    setupTOC();
  }
})();
