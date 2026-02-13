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
        /* Main Sidebar Wrapper */
        .wrap {
          position: fixed; 
          right: 0; 
          top: 0;
          width: 320px; 
          height: 100vh;
          background: #0f0f0f; 
          color: #ddd;
          font-family: system-ui, -apple-system, sans-serif;
          display: flex; 
          flex-direction: column;
          border-left: 1px solid #333;
          z-index: 2147483647;
          box-shadow: -5px 0 15px rgba(0,0,0,0.5);
          font-size: 14px;
          
          /* Animation for collapsing */
          transition: transform 0.3s cubic-bezier(0.25, 1, 0.5, 1);
          transform: translateX(0);
        }

        /* Collapsed State: Move right by width (320px) */
        .wrap.collapsed {
          transform: translateX(320px);
        }

        /* Toggle Button (Tab) */
        .toggle-btn {
          position: absolute;
          left: -28px; /* Hangs off the left edge */
          top: 15px; /* Distance from top */
          width: 28px;
          height: 32px;
          background: #222;
          border: 1px solid #333;
          border-right: none;
          border-radius: 6px 0 0 6px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #888;
          font-weight: bold;
          font-size: 16px;
          transition: background 0.2s, color 0.2s;
        }
        .toggle-btn:hover {
          background: #333;
          color: #fff;
        }

        /* Header */
        .hdr {
          padding: 12px;
          font-weight: bold;
          background: #0b0b0b;
          border-bottom: 1px solid #222;
          display: flex; 
          justify-content: space-between; 
          align-items: center;
        }

        /* List Area */
        .list { flex: 1; overflow-y: auto; padding: 8px; }

        /* List Items */
        .entry {
          padding: 8px 10px;
          margin-bottom: 6px;
          border-radius: 6px;
          background: #121212;
          border: 1px solid #1b1b1b;
          cursor: pointer;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          transition: background 0.2s;
        }
        .entry:hover { background: #2a2a2a; border-color: #333; }

        /* Scrollbar */
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #0f0f0f; }
        ::-webkit-scrollbar-thumb { background: #333; border-radius: 3px; }
      </style>

      <div class="wrap" id="sidebarWrap">
        <div class="toggle-btn" id="toggleBtn" title="Toggle Sidebar">»</div>

        <div class="hdr">
            <span>USER REQUESTS</span>
        </div>
        <div class="list" id="list"></div>
      </div>
    `;

    // Add Toggle Logic
    const wrap = shadow.getElementById("sidebarWrap");
    const btn = shadow.getElementById("toggleBtn");
    
    btn.onclick = () => {
      const isCollapsed = wrap.classList.toggle("collapsed");
      btn.innerHTML = isCollapsed ? "«" : "»"; // Switch arrow direction
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

  // ---------- Observers ----------
  let mainObserver;
  function attachMainObserver(){
    const main = document.querySelector("main") || document.body;
    if (!main) return;
    
    mainObserver?.disconnect();
    mainObserver = new MutationObserver(debounce(() => {
      render();
    }, 500)); 
    
    mainObserver.observe(main, {childList:true, subtree:true});
  }

  // Detect URL change (SPA navigation)
  let lastUrl = location.href;
  const urlWatcher = setInterval(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      setTimeout(() => {
        attachMainObserver();
        render();
      }, 500);
    }
  }, 500);

  // ---------- Remove ----------
  function remove(){
    clearInterval(urlWatcher);
    mainObserver?.disconnect();
    document.getElementById(HOST_ID)?.remove();
    delete window._monoSidebarDynamic;
    window._removeMonoSidebar = null;
    console.log("Dynamic sidebar removed.");
  }
  
  window._removeMonoSidebar = remove;

  // ---------- Init ----------
  buildSidebar();
  attachMainObserver();
  render();
  console.log("✅ Dynamic sidebar active.");
})();
