(() => {
  // === TOGGLE LOGIC (Extension On/Off) ===
  if (window._monoSidebarDynamic) {
    if (typeof window._removeMonoSidebar === "function") {
      window._removeMonoSidebar();
    }
    return;
  }

  window._monoSidebarDynamic = true;
  const HOST_ID = "monoChatSidebarDynamic";

  // ---------- Utilities ----------
  const debounce = (fn, t=150) => { let id; return (...a)=>{ clearTimeout(id); id=setTimeout(()=>fn(...a), t); }; };
  
  const hash = (s) => {
    let h = 2166136261 >>> 0;
    for (let i=0;i<s.length;i++){ h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    return (h>>>0).toString(36);
  };

  function isUserTurn(el){
    const t = (el.innerText||"").trim();
    return /^[\s\r\n]*you\b/i.test(t) || /\byou(?:\s+said)?\s*:/i.test(t);
  }

  function extractTitle(el){
    let t = (el.innerText||"").replace(/\r/g,"\n");
    t = t.replace(/(^|\n)\s*(you(?:\s+said)?\s*:?)\s*/ig,"$1");
    t = t.replace(/\n+/g,"\n").trim();
    const first = t.split("\n").map(x=>x.trim()).filter(Boolean)[0] || "";
    return first.replace(/\s+/g," ").trim();
  }

  // ---------- Sidebar & UI ----------
  function buildSidebar(){
    document.getElementById(HOST_ID)?.remove();
    const host = document.createElement("div");
    host.id = HOST_ID;
    document.documentElement.appendChild(host);
    
    const shadow = host.attachShadow({mode:"open"});
    shadow.innerHTML = `
      <style>
        /* CSS Variables for Theming */
        .wrap {
          /* Dark Mode (Default) */
          --bg: #0f0f0f;
          --bg-sec: #080808;
          --border: #222;
          --text: #ddd;
          --text-sub: #666;
          --item-bg: #121212;
          --item-border: #1b1b1b;
          --item-hover: #2a2a2a;
          --scroll-track: #0f0f0f;
          --scroll-thumb: #333;
          --toggle-bg: #222;
          --toggle-hover: #333;
          
          /* Signature Gradient (Dark Mode: Sunset) */
          --sig-grad: linear-gradient(90deg, #ff8a00, #e52e71); 
          
          position: fixed; 
          right: 0; 
          top: 0;
          width: 320px; 
          height: 100vh;
          background: var(--bg);
          color: var(--text);
          font-family: system-ui, -apple-system, sans-serif;
          display: flex; 
          flex-direction: column;
          border-left: 1px solid var(--border);
          z-index: 2147483647;
          box-shadow: -5px 0 15px rgba(0,0,0,0.5);
          font-size: 14px;
          transition: transform 0.3s cubic-bezier(0.25, 1, 0.5, 1), background 0.3s;
          transform: translateX(0);
        }

        /* Light Mode Overrides */
        .wrap.light {
          --bg: #ffffff;
          --bg-sec: #f4f4f5;
          --border: #e5e5e5;
          --text: #333;
          --text-sub: #888;
          --item-bg: #ffffff;
          --item-border: #e0e0e0;
          --item-hover: #f0f0f0;
          --scroll-track: #fff;
          --scroll-thumb: #ccc;
          --toggle-bg: #f0f0f0;
          --toggle-hover: #e0e0e0;

          /* Signature Gradient (Light Mode: Ocean) */
          --sig-grad: linear-gradient(90deg, #0052D4, #4364F7, #6FB1FC);
        }

        .wrap.collapsed {
          transform: translateX(320px);
        }

        /* Slide Toggle Button (Sidebar handle) */
        .slide-btn {
          position: absolute;
          left: -28px;
          top: 20px;
          width: 28px;
          height: 32px;
          background: var(--toggle-bg);
          border: 1px solid var(--border);
          border-right: none;
          border-radius: 6px 0 0 6px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-sub);
          font-weight: bold;
          font-size: 16px;
          transition: background 0.2s, color 0.2s;
        }
        .slide-btn:hover { background: var(--toggle-hover); color: var(--text); }

        /* Branding Section */
        .branding {
          padding: 16px 12px 10px 12px;
          background: var(--bg-sec);
          border-bottom: 1px solid var(--border);
          text-align: center;
          position: relative;
        }
        
        /* Theme Toggle (Sun/Moon) */
        .theme-toggle {
          position: absolute;
          right: 12px;
          top: 12px;
          background: transparent;
          border: none;
          cursor: pointer;
          font-size: 16px;
          opacity: 0.6;
          transition: opacity 0.2s;
        }
        .theme-toggle:hover { opacity: 1; }

        .app-name {
          font-size: 16px;
          font-weight: 800;
          color: var(--text);
          letter-spacing: 0.5px;
          margin-bottom: 2px;
        }
        
        .signature {
          font-family: "Segoe Script", "Brush Script MT", cursive;
          font-size: 14px;
          font-weight: bold;
          background: var(--sig-grad);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          display: inline-block;
          margin-top: 2px;
        }

        /* Sub Header */
        .hdr {
          padding: 8px 12px;
          font-size: 11px;
          font-weight: bold;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: var(--text-sub);
          background: var(--bg-sec);
          border-bottom: 1px solid var(--border);
        }

        /* List Area */
        .list { flex: 1; overflow-y: auto; padding: 8px; scrollbar-width: thin; }

        /* List Items */
        .entry {
          padding: 8px 10px;
          margin-bottom: 6px;
          border-radius: 6px;
          background: var(--item-bg);
          border: 1px solid var(--item-border);
          cursor: pointer;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          transition: background 0.2s, border 0.2s;
          color: var(--text);
        }
        .entry:hover { background: var(--item-hover); border-color: var(--border); }
        
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: var(--scroll-track); }
        ::-webkit-scrollbar-thumb { background: var(--scroll-thumb); border-radius: 3px; }
      </style>

      <div class="wrap" id="sidebarWrap">
        <div class="slide-btn" id="slideBtn" title="Toggle Sidebar">»</div>
        
        <div class="branding">
            <button class="theme-toggle" id="themeBtn" title="Switch Theme">🌙</button>
            <div class="app-name">Chat Sidebar</div>
            <div class="signature">by cheemslawg</div>
        </div>

        <div class="hdr">User Requests</div>
        <div class="list" id="list"></div>
      </div>
    `;

    const wrap = shadow.getElementById("sidebarWrap");
    const slideBtn = shadow.getElementById("slideBtn");
    const themeBtn = shadow.getElementById("themeBtn");
    
    // Collapse/Expand Logic
    slideBtn.onclick = () => {
      const isCollapsed = wrap.classList.toggle("collapsed");
      slideBtn.innerHTML = isCollapsed ? "«" : "»";
    };

    // Theme Logic
    themeBtn.onclick = () => {
      const isLight = wrap.classList.toggle("light");
      themeBtn.innerHTML = isLight ? "☀️" : "🌙";
    };

    return host;
  }

  function render(){
    const host = document.getElementById(HOST_ID);
    if (!host) return;
    const shadow = host.shadowRoot;
    const list = shadow.getElementById("list");
    list.innerHTML = "";

    const turns = Array.from(document.querySelectorAll('main [data-testid*="conversation-turn"], main article, main [role="listitem"], .group')); 
    const users = turns.filter(isUserTurn);

    if (users.length === 0) {
        const empty = document.createElement("div");
        empty.style.padding = "20px";
        empty.style.opacity = "0.5";
        empty.style.textAlign = "center";
        empty.innerText = "No user messages found yet...";
        list.appendChild(empty);
        return;
    }

    users.forEach(turn => {
      const title = extractTitle(turn);
      const id = hash(turn.innerText||"");
      turn.dataset.monoId = id;
      
      const div = document.createElement("div");
      div.className = "entry";
      div.title = title;
      div.textContent = title.length > 50 ? title.slice(0,50)+"…" : title;
      
      div.onclick = () => {
        turn.scrollIntoView({behavior:"smooth", block:"center"});
        const prev = turn.style.outline;
        turn.style.outline = "2px solid #10a37f";
        turn.style.transition = "outline 0.3s";
        setTimeout(()=> turn.style.outline = prev||"", 1500);
      };
      list.appendChild(div);
    });
  }

  let mainObserver;
  function attachMainObserver(){
    const main = document.querySelector("main") || document.body;
    if (!main) return;
    mainObserver?.disconnect();
    mainObserver = new MutationObserver(debounce(() => { render(); }, 500));
    mainObserver.observe(main, {childList:true, subtree:true});
  }

  let lastUrl = location.href;
  const urlWatcher = setInterval(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      setTimeout(() => { attachMainObserver(); render(); }, 500);
    }
  }, 500);

  function remove(){
    clearInterval(urlWatcher);
    mainObserver?.disconnect();
    document.getElementById(HOST_ID)?.remove();
    delete window._monoSidebarDynamic;
    window._removeMonoSidebar = null;
    console.log("Dynamic sidebar removed.");
  }
  
  window._removeMonoSidebar = remove;

  buildSidebar();
  attachMainObserver();
  render();
  console.log("✅ Dynamic sidebar active.");
})();
