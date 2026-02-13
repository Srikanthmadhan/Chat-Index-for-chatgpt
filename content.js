(() => {

  // ==============================
  // DOMAIN + ROUTE GUARD
  // ==============================
  const validHost =
    location.hostname.includes("chat.openai.com") ||
    location.hostname.includes("chatgpt.com");

  if (!validHost) return;

  function inConversation() {
    return /^\/c\//.test(location.pathname);
  }

  // ==============================
  // TOGGLE
  // ==============================
  if (window.__goatedSidebar) {
    window.__goatedSidebar.remove();
    return;
  }

  const HOST_ID = "goatedSidebarHost";
  let mainObserver = null;
  let intersectionObserver = null;
  let rootObserver = null;

  // ==============================
  // UTILITIES
  // ==============================
  const debounce = (fn, t = 200) => {
    let id;
    return (...a) => {
      clearTimeout(id);
      id = setTimeout(() => fn(...a), t);
    };
  };

  const hash = (s) => {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0).toString(36);
  };

  function isUserTurn(el) {
    const t = (el.innerText || "").trim();
    return /^[\s\r\n]*you\b/i.test(t) || /\byou(?:\s+said)?\s*:/i.test(t);
  }

  function extractTitle(el) {
    let t = (el.innerText || "").replace(/\r/g, "\n");
    t = t.replace(/(^|\n)\s*(you(?:\s+said)?\s*:?)\s*/ig, "$1");
    t = t.replace(/\n+/g, "\n").trim();
    return t.split("\n")[0].replace(/\s+/g, " ").trim();
  }

  // ==============================
  // BUILD SIDEBAR
  // ==============================
  function buildSidebar() {

    if (!inConversation()) return;

    document.getElementById(HOST_ID)?.remove();

    const host = document.createElement("div");
    host.id = HOST_ID;
    document.documentElement.appendChild(host);

    const shadow = host.attachShadow({ mode: "open" });

    shadow.innerHTML = `
      <style>
        .wrap{
          --bg:#0f0f0f;--bg-sec:#080808;--border:#222;
          --text:#ddd;--text-sub:#666;
          --item-bg:#121212;--item-border:#1b1b1b;--item-hover:#2a2a2a;
          --sig-grad:linear-gradient(90deg,#ff8a00,#e52e71);
          position:fixed;right:0;top:0;width:320px;height:100vh;
          background:var(--bg);color:var(--text);
          font-family:system-ui;display:flex;flex-direction:column;
          border-left:1px solid var(--border);z-index:2147483647;
          transition:transform .3s ease;
        }
        .wrap.light{
          --bg:#fff;--bg-sec:#f4f4f5;--border:#e5e5e5;
          --text:#333;--text-sub:#888;
          --item-bg:#fff;--item-border:#e0e0e0;--item-hover:#f0f0f0;
          --sig-grad:linear-gradient(90deg,#0052D4,#4364F7,#6FB1FC);
        }
        .wrap.collapsed{transform:translateX(320px);}
        .slide-btn{
          position:absolute;left:-28px;top:20px;width:28px;height:32px;
          background:var(--bg-sec);border:1px solid var(--border);
          border-right:none;border-radius:6px 0 0 6px;
          cursor:pointer;display:flex;align-items:center;
          justify-content:center;font-weight:bold;color:var(--text-sub);
        }
        .branding{
          padding:16px;text-align:center;
          background:var(--bg-sec);border-bottom:1px solid var(--border);
        }
        .app-name{font-weight:800;font-size:16px;}
        .signature{
          font-family:"Segoe Script","Brush Script MT",cursive;
          font-size:14px;font-weight:bold;
          background:var(--sig-grad);
          -webkit-background-clip:text;
          -webkit-text-fill-color:transparent;
        }
        .theme-btn{
          position:absolute;right:10px;top:10px;
          background:none;border:none;cursor:pointer;font-size:16px;
        }
        .hdr{
          padding:8px 12px;font-size:11px;
          text-transform:uppercase;letter-spacing:1px;
          color:var(--text-sub);
        }
        .list{flex:1;overflow:auto;padding:8px;}
        .entry{
          padding:8px 10px;margin-bottom:6px;
          border-radius:6px;background:var(--item-bg);
          border:1px solid var(--item-border);
          cursor:pointer;white-space:nowrap;
          overflow:hidden;text-overflow:ellipsis;
          transition:background .2s,border .2s;
        }
        .entry:hover{background:var(--item-hover);}
        .entry.active{
          background:#1f3a34;border-color:#10a37f;
        }
      </style>

      <div class="wrap" id="wrap">
        <div class="slide-btn" id="slideBtn">»</div>
        <div class="branding">
          <button class="theme-btn" id="themeBtn">🌙</button>
          <div class="app-name">Goated Chat Index</div>
          <div class="signature">by cheemslawg</div>
        </div>
        <div class="hdr">User Requests</div>
        <div class="list" id="list"></div>
      </div>
    `;

    const wrap = shadow.getElementById("wrap");
    const slideBtn = shadow.getElementById("slideBtn");
    const themeBtn = shadow.getElementById("themeBtn");

    // Restore persisted state
    if (localStorage.getItem("goated_theme") === "light") {
      wrap.classList.add("light");
      themeBtn.innerHTML = "☀️";
    }

    if (localStorage.getItem("goated_collapsed") === "true") {
      wrap.classList.add("collapsed");
      slideBtn.innerHTML = "«";
    }

    slideBtn.onclick = () => {
      const collapsed = wrap.classList.toggle("collapsed");
      slideBtn.innerHTML = collapsed ? "«" : "»";
      localStorage.setItem("goated_collapsed", collapsed);
    };

    themeBtn.onclick = () => {
      const light = wrap.classList.toggle("light");
      themeBtn.innerHTML = light ? "☀️" : "🌙";
      localStorage.setItem("goated_theme", light ? "light" : "dark");
    };
  }

  function render() {
    if (!inConversation()) return;

    const host = document.getElementById(HOST_ID);
    if (!host) return;

    const shadow = host.shadowRoot;
    const list = shadow.getElementById("list");
    list.innerHTML = "";

    const turns = Array.from(
      document.querySelectorAll('main [data-testid*="conversation-turn"], main article, main [role="listitem"]')
    );

    const users = turns.filter(isUserTurn);

    users.forEach(turn => {
      const id = hash(turn.innerText || "");
      turn.dataset.goatedId = id;

      const div = document.createElement("div");
      div.className = "entry";
      div.dataset.target = id;

      const title = extractTitle(turn);
      div.textContent = title.length > 60 ? title.slice(0, 60) + "…" : title;

      div.onclick = () => {
        turn.scrollIntoView({ behavior: "smooth", block: "center" });
      };

      list.appendChild(div);
    });

    setupIntersection();
  }

  function setupIntersection() {
    intersectionObserver?.disconnect();

    intersectionObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;

        const id = entry.target.dataset.goatedId;
        const host = document.getElementById(HOST_ID);
        if (!host) return;

        const shadow = host.shadowRoot;
        shadow.querySelectorAll(".entry").forEach(e => e.classList.remove("active"));

        const active = shadow.querySelector('.entry[data-target="' + id + '"]');
        if (active) {
          active.classList.add("active");
          active.scrollIntoView({ block: "nearest" });
        }
      });
    }, { rootMargin: "-40% 0px -40% 0px" });

    document.querySelectorAll('[data-goated-id]').forEach(el => {
      intersectionObserver.observe(el);
    });
  }

  function attachObserver() {
    const main = document.querySelector("main");
    if (!main) return;

    mainObserver?.disconnect();
    mainObserver = new MutationObserver(debounce(render, 300));
    mainObserver.observe(main, { childList: true, subtree: true });
  }

  // ==============================
  // SPA NAVIGATION SAFE
  // ==============================
  if (!window.__goatedNavWrapped) {
    window.__goatedNavWrapped = true;

    const origPush = history.pushState;
    history.pushState = function () {
      origPush.apply(this, arguments);
      setTimeout(initIfNeeded, 300);
    };

    window.addEventListener("popstate", () => {
      setTimeout(initIfNeeded, 300);
    });
  }

  function initIfNeeded() {
    if (!inConversation()) return;
    if (!document.getElementById(HOST_ID)) buildSidebar();
    attachObserver();
    render();
  }

  // ==============================
  // ROOT PERSISTENCE GUARD
  // ==============================
  rootObserver = new MutationObserver(() => {
    if (inConversation() && !document.getElementById(HOST_ID)) {
      buildSidebar();
      attachObserver();
      render();
    }
  });

  rootObserver.observe(document.documentElement, { childList: true });

  // ==============================
  // INIT
  // ==============================
  initIfNeeded();

  window.__goatedSidebar = {
    remove() {
      mainObserver?.disconnect();
      intersectionObserver?.disconnect();
      rootObserver?.disconnect();
      document.getElementById(HOST_ID)?.remove();
      delete window.__goatedSidebar;
      console.log("Sidebar removed.");
    }
  };

  console.log("🔥 Goated Chat Index Fully Loaded — by cheemslawg");

})();
