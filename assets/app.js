/* 首页逻辑 v3：画廊（HUD 收纳 + 全屏 + 懒加载）+ 成本×耗时散点 + 数据表 + 已知Bug 列表 */
(function () {
  "use strict";
  var P = window.BENCH.projects;
  function $(s, el) { return (el || document).querySelector(s); }

  /* ---------- 格式化 ---------- */
  function fmtInt(n) { return n.toLocaleString("zh-Hans-CN"); }
  function fmtM(n) { return (n / 1e6).toFixed(2) + " M"; }
  function fmtDur(s) { var m = Math.floor(s / 60), r = Math.round(s % 60); return m + " 分 " + String(r).padStart(2, "0") + " 秒"; }
  function fmtClock(s) { var m = Math.floor(s / 60), r = Math.round(s % 60); return m + ":" + String(r).padStart(2, "0"); }
  function fmtCost(c) { return "¥" + parseFloat(c.toFixed(4)); }

  /* ---------- Hero 汇总 ---------- */
  (function () {
    var steps = 0, tokens = 0, cost = 0, time = 0;
    P.forEach(function (p) { steps += p.steps; tokens += p.tokens.total; cost += p.cost.total; time += p.modelTime; });
    $("#statSteps").textContent = fmtInt(steps);
    $("#statTokens").textContent = (tokens / 1e6).toFixed(1) + "M";
    $("#statCost").textContent = "¥" + cost.toFixed(2);
    $("#statTime").textContent = (time / 3600).toFixed(1) + "h";
  })();

  /* ---------- 画廊 ---------- */
  /* 卡片视图下收纳各 demo 自带操作面板（同源注入 CSS）；进全屏后还原，保证完整交互 */
  var CARD_HIDE = {
    "dsh-standard-glm5f": "#panel,#stats,.btns",
    "dsh-ptc-glm5f": "#bar",
    "zcode-standard-glm5": "#bar",
    "zcode-standard-glm5f": "#panel",
    "zcode-plan-glm5": "#panel-ctl,#panel-help",
    "zcode-plan-glm5f": "#panel",
    "dsh-standard-mimo26f": "#topbar,.bar,#stats",
    "dsh-ptc-mimo26f": ".panel",
    "zcode-standard-mimo26f": "#hud,.ctl",
    "dsh-ptc-s5": "#hud,#panel",
    "zcode-standard-mimo26p": "#hud,#panel",
    "dsh-standard-mimo26p": "#ctrl,.panel,#stats",
    "dsh-standard-s5": "#hud"
  };

  var states = {};
  var isDesktop = window.matchMedia("(pointer:fine)").matches && window.innerWidth >= 900;
  var autoLoad = { on: isDesktop };
  var chkAuto = $("#chkAuto");
  chkAuto.checked = autoLoad.on;
  chkAuto.addEventListener("change", function () {
    autoLoad.on = chkAuto.checked;
    if (autoLoad.on) Object.keys(states).forEach(function (id) {
      var st = states[id];
      if (st.status === "idle" && nearViewport(st.stage)) loadDemo(id);
    });
  });
  function nearViewport(el) {
    var r = el.getBoundingClientRect();
    return r.top < innerHeight * 1.5 && r.bottom > -innerHeight * 0.5;
  }

  function setStatus(st, text, on) {
    var el = $(".status", st.stage);
    el.className = "status" + (on ? " on" : "");
    el.innerHTML = '<span class="led"></span>' + text;
  }

  function applyCardMode(st) {
    var doc;
    try { doc = st.iframe.contentDocument; } catch (e) { return; }
    if (!doc || !doc.head) return;
    var old = doc.getElementById("cardmode");
    if (old) old.remove();
    var hide = CARD_HIDE[st.p.id];
    if (!hide || document.fullscreenElement === st.iframe) return;
    var s = doc.createElement("style");
    s.id = "cardmode";
    s.textContent = hide + "{display:none!important}";
    doc.head.appendChild(s);
  }

  function loadDemo(id) {
    var st = states[id]; if (!st || st.status === "running" || st.status === "loading") return;
    st.overlay.classList.add("hidden");
    var f = document.createElement("iframe");
    f.title = st.p.name + " · 3D 场景";
    f.setAttribute("allow", "fullscreen");
    f.addEventListener("load", function () {
      if (st.iframe !== f) return;
      applyCardMode(st);
      setStatus(st, "运行中", true);
    });
    st.iframe = f; st.stage.appendChild(f);
    f.src = st.p.demo;
    st.status = "loading";
    setStatus(st, "加载中…", false);
    setTimeout(function () { if (st.iframe === f && st.status === "loading") st.status = "running"; }, 2500);
  }

  function pauseDemo(id) {
    var st = states[id]; if (!st || !st.iframe) return;
    st.iframe.remove(); st.iframe = null; st.status = "paused";
    st.overlay.classList.remove("hidden");
    $(".ov-hint", st.overlay).textContent = "已暂停并释放 GPU · 场景将复位，点击恢复";
    setStatus(st, "已暂停", false);
  }

  function buildCard(p) {
    var card = document.createElement("article");
    card.className = "card";
    card.innerHTML =
      '<div class="card-head">' +
        '<div class="card-title"><span class="dot" style="background:' + p.color + '"></span><h3>' + p.name + "</h3></div>" +
        '<div class="badges"><span class="tag dim-harness">' + p.harness + " · " + p.mode + '</span><span class="tag dim-model">' + p.modelLabel + "</span></div>" +
      "</div>" +
      '<div class="stage">' +
        '<div class="stage-overlay">' +
          '<button class="playbtn" aria-label="加载 3D 场景">▶</button>' +
          '<div class="ov-title">点击加载 3D 场景</div>' +
          '<div class="ov-tech">交互：' + p.interact + "</div>" +
          '<div class="ov-hint">Three.js WebGL · 原始产物，仅本地化依赖</div>' +
        "</div>" +
        '<span class="status"><span class="led"></span>未加载</span>' +
        '<span class="stagebtns"><button class="sbtn full">⛶ 全屏</button><button class="sbtn danger pause">⏸ 暂停</button></span>' +
      "</div>" +
      '<div class="card-meta">' +
        "<span>用时 <b>" + fmtClock(p.modelTime) + "</b></span>" +
        "<span><b>" + p.steps + "</b> 步</span>" +
        "<span>" + fmtM(p.tokens.total) + " tok</span>" +
        '<span class="sp"></span>' +
        "<span><b>" + fmtCost(p.cost.total) + "</b></span>" +
      "</div>";
    var stage = $(".stage", card), overlay = $(".stage-overlay", card);
    var st = { p: p, stage: stage, overlay: overlay, iframe: null, status: "idle" };
    states[p.id] = st;
    overlay.addEventListener("click", function () { loadDemo(p.id); });
    $(".full", stage).addEventListener("click", function () {
      if (st.status === "idle") loadDemo(p.id);
      var goFull = function () {
        var r = st.iframe.requestFullscreen ? st.iframe.requestFullscreen() : Promise.resolve();
        if (r && r.catch) r.catch(function () {});
      };
      if (st.status === "loading") setTimeout(goFull, 600); else goFull();
    });
    $(".pause", stage).addEventListener("click", function (e) { e.stopPropagation(); pauseDemo(p.id); });
    return card;
  }

  (function initGallery() {
    var grid = $("#galleryGrid");
    P.forEach(function (p) { grid.appendChild(buildCard(p)); });
    $("#btnLoadAll").addEventListener("click", function () { Object.keys(states).forEach(loadDemo); });
    $("#btnPauseAll").addEventListener("click", function () { Object.keys(states).forEach(pauseDemo); });
    $("#autoHint").textContent = isDesktop
      ? "桌面端默认自动加载：卡片滚入视口即开播"
      : "移动端默认手动：点击卡片加载";

    document.addEventListener("fullscreenchange", function () {
      Object.keys(states).forEach(function (id) { if (states[id].iframe) applyCardMode(states[id]); });
    });

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting && autoLoad.on) {
          var id = en.target.dataset.id;
          if (states[id] && states[id].status === "idle" && nearViewport(states[id].stage)) loadDemo(id);
        }
      });
    }, { rootMargin: "150px" });
    var ioFar = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) {
          var id = en.target.dataset.id, st = states[id];
          /* 几何复核：百分比 rootMargin 在部分环境（iframe）会被按 0 处理，
             IO 只作触发器，远近以真实 rect 为准，避免刚加载就被误暂停 */
          if (st && (st.status === "running" || st.status === "loading")) {
            var r = st.stage.getBoundingClientRect();
            if (r.top > innerHeight * 2.5 || r.bottom < -innerHeight * 2.5) pauseDemo(id);
          }
        }
      });
    }, { rootMargin: Math.round(innerHeight * 2.5) + "px 0px" });

    Object.keys(states).forEach(function (id) {
      states[id].stage.dataset.id = id;
      io.observe(states[id].stage);
      ioFar.observe(states[id].stage);
    });

    /* 滚动/尺寸变化兜底：IO 在个别环境（嵌套 iframe、虚拟时钟）下可能不触发，
       直接按几何位置检查一次，保证"滚到即加载"的行为稳定 */
    var ticking = false;
    function sweepLoad() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        ticking = false;
        if (!autoLoad.on) return;
        Object.keys(states).forEach(function (id) {
          var st = states[id];
          if (st.status === "idle" && nearViewport(st.stage)) { loadDemo(id); return; }
          if (st.iframe) {
            var r = st.stage.getBoundingClientRect();
            if (r.top > innerHeight * 2.5 || r.bottom < -innerHeight * 2.5) pauseDemo(id);
          }
        });
      });
    }
    window.addEventListener("scroll", sweepLoad, { passive: true });
    window.addEventListener("resize", sweepLoad);
    sweepLoad();
    /* 轮询兜底：个别环境（虚拟时钟 / 嵌套 iframe）不产出渲染帧时 rAF 与滚动事件均不触发，
       用低频定时器保证"滚到即加载、滚远即释放"的行为在任何环境稳定 */
    setInterval(sweepLoad, 800);
  })();

  /* ---------- 成本 × 耗时 散点 ---------- */
  (function scatter() {
    var W = 1100, H = 540, L = 78, R = 30, T = 24, B = 62;
    var pw = W - L - R, ph = H - T - B, xmax = 3.0, ymax = 130;
    function sx(c) { return L + c / xmax * pw; }
    function sy(t) { return T + (1 - t / ymax) * ph; }
    function esc(s) { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;"); }

    var g = [];
    g.push('<svg viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="成本与耗时散点图">');
    /* 网格 + 刻度：x 费用 */
    for (var c = 0; c <= 6; c++) {
      var v = c * 0.5, x = sx(v);
      g.push('<line x1="' + x + '" y1="' + T + '" x2="' + x + '" y2="' + (T + ph) + '" stroke="rgba(148,163,184,.07)"/>');
      g.push('<text x="' + x + '" y="' + (T + ph + 22) + '" text-anchor="middle" font-size="11.5" fill="#667081">' + v.toFixed(1) + "</text>");
    }
    /* 网格 + 刻度：y 用时（分钟） */
    for (var m = 0; m <= 120; m += 20) {
      var y = sy(m);
      g.push('<line x1="' + L + '" y1="' + y + '" x2="' + (L + pw) + '" y2="' + y + '" stroke="rgba(148,163,184,.07)"/>');
      g.push('<text x="' + (L - 12) + '" y="' + (y + 4) + '" text-anchor="end" font-size="11.5" fill="#667081">' + m + "</text>");
    }
    /* 坐标轴 */
    g.push('<line x1="' + L + '" y1="' + (T + ph) + '" x2="' + (L + pw) + '" y2="' + (T + ph) + '" stroke="#2a3140"/>');
    g.push('<line x1="' + L + '" y1="' + T + '" x2="' + L + '" y2="' + (T + ph) + '" stroke="#2a3140"/>');
    /* 轴标题 + 提示 */
    g.push('<text x="' + (L + pw / 2) + '" y="' + (H - 14) + '" text-anchor="middle" font-size="12.5" fill="#9aa3af">实际费用（元）→ 越左越省</text>');
    g.push('<text x="20" y="' + (T + ph / 2) + '" text-anchor="middle" font-size="12.5" fill="#9aa3af" transform="rotate(-90 20 ' + (T + ph / 2) + ')">模型用时（分钟）→ 越下越快</text>');
    g.push('<text x="' + (L + pw) + '" y="' + (T + 6) + '" text-anchor="end" font-size="12" fill="#667081">越靠左下 = 成本越低 · 耗时越短</text>');
    g.push('<text x="' + (L + 14) + '" y="' + (T + 20) + '" font-size="12.5" fill="#e3c88a">⤹ 斩杀线（帕累托前沿）：线外不存在又更省又更快的组合</text>');

    /* 斩杀线（帕累托前沿）：连接"未被任何更省且更快的组合碾压"的点，按费用升序 */
    var front = P.filter(function (p) {
      return !P.some(function (q) {
        return q !== p && q.cost.total <= p.cost.total && q.modelTime <= p.modelTime && (q.cost.total < p.cost.total || q.modelTime < p.modelTime);
      });
    }).sort(function (a, b) { return a.cost.total - b.cost.total; });
    g.push('<polyline points="' + front.map(function (p) { return sx(p.cost.total) + "," + sy(p.modelTime / 60); }).join(" ") +
      '" fill="none" stroke="#e3c88a" stroke-width="1.5" stroke-dasharray="6 5"/>');

    /* 点位：编号点（编号对应下方图例） */
    P.forEach(function (p, i) {
      var x = sx(p.cost.total), y = sy(p.modelTime / 60), n = i + 1;
      g.push('<g class="sc-pt" data-id="' + p.id + '">');
      g.push('<circle cx="' + x + '" cy="' + y + '" r="13" fill="transparent"/>');
      g.push('<circle cx="' + x + '" cy="' + y + '" r="8.5" fill="' + p.color + '" stroke="#0b0d12" stroke-width="1.5"/>');
      g.push('<text x="' + x + '" y="' + (y + 3.5) + '" text-anchor="middle" font-size="9.5" font-weight="700" fill="#0b0d12" pointer-events="none">' + n + "</text>");
      g.push("</g>");
    });
    g.push("</svg>");
    $("#scatterPlot").innerHTML = g.join("");

    /* 图例（编号 → 工具·模式·模型 + 关键数） */
    var lg = '<div class="lg-grid">' + P.map(function (p, i) {
      return '<div class="lg-item"><span class="lg-n" style="--c:' + p.color + '">' + (i + 1) + "</span>" +
        "<div><b>" + esc(p.name) + "</b><span> · " + esc(p.modelLabel) + "</span>" +
        "<i>" + fmtClock(p.modelTime) + " · " + fmtCost(p.cost.total) + " · " + p.steps + " 步" + (p.incomplete ? " · " + esc(p.incomplete) : "") + "</i></div></div>";
    }).join("") + "</div>";
    document.querySelector(".sc-card").insertAdjacentHTML("beforeend", lg);

    /* 悬停详情 */
    var tip = $("#scTip"), card = tip.parentElement;
    function show(e, p) {
      tip.innerHTML =
        '<b>' + p.name + " · " + p.modelLabel + "</b><br>" +
        "用时 <b>" + fmtClock(p.modelTime) + "</b>（" + fmtDur(p.modelTime) + "） · " + p.steps + " 步<br>" +
        "费用 <b>" + fmtCost(p.cost.total) + "</b> · " + fmtM(p.tokens.total) + " tok · 命中 " + p.tokens.hit.toFixed(1) + "%";
      tip.style.opacity = 1;
      var r = card.getBoundingClientRect();
      var tx = e.clientX - r.left + 16, ty = e.clientY - r.top + 14;
      if (tx > r.width - 280) tx = e.clientX - r.left - 290;
      if (ty > r.height - 90) ty = e.clientY - r.top - 96;
      tip.style.left = tx + "px"; tip.style.top = ty + "px";
    }
    Array.prototype.forEach.call(document.querySelectorAll(".sc-pt"), function (el) {
      var p = P.filter(function (q) { return q.id === el.dataset.id; })[0];
      el.addEventListener("mousemove", function (e) { show(e, p); });
      el.addEventListener("mouseleave", function () { tip.style.opacity = 0; });
    });
  })();

  /* ---------- 数据总表 ---------- */
  (function table() {
    var rows = [
      { label: "模式", get: function (p) { return p.harness + " · " + p.mode; } },
      { label: "模型 / 思考强度", get: function (p) { return p.model + '<span class="sub">' + p.variant + "</span>"; } },
      { label: "轮次 / 步骤", get: function (p) { return p.rounds + " 轮 / " + p.steps + " 步"; }, val: function (p) { return p.steps; }, dir: "min" },
      { label: "模型用时", get: function (p) { return fmtDur(p.modelTime); }, val: function (p) { return p.modelTime; }, dir: "min" },
      { label: "工具调用用时", get: function (p) { return p.toolTime >= 90 ? Math.floor(p.toolTime / 60) + " 分 " + Math.round(p.toolTime % 60) + " 秒" : p.toolTime + " 秒"; } },
      { label: "首 token 平均延迟（TTFT）", get: function (p) { return p.ttft.toFixed(1) + " 秒"; }, val: function (p) { return p.ttft; }, dir: "min" },
      { label: "输出速度（TPS）", get: function (p) { return p.tps + " tok/s"; }, val: function (p) { return p.tps; }, dir: "max" },
      { label: "总 Token 消耗", get: function (p) { return fmtInt(p.tokens.total) + "（" + fmtM(p.tokens.total) + "）"; }, val: function (p) { return p.tokens.total; }, dir: "min" },
      { label: "├ 缓存读取", get: function (p) { return fmtInt(p.tokens.cache); } },
      { label: "├ 未缓存输入", get: function (p) { return fmtInt(p.tokens.input); } },
      { label: "└ 输出", get: function (p) { return fmtInt(p.tokens.output); } },
      { label: "缓存命中率", get: function (p) { return p.tokens.hit.toFixed(1) + "%"; }, val: function (p) { return p.tokens.hit; }, dir: "max" },
      { label: "单价 ¥/M tok（缓存 / 输入 / 输出）", get: function (p) { return p.price.cache + " / " + p.price.input + " / " + p.price.output + '<span class="sub">' + p.price.note + "</span>"; } },
      { label: "实际费用", get: function (p) { return fmtCost(p.cost.total) + '<span class="sub">缓存 ' + p.cost.cache.toFixed(4) + " · 输入 " + p.cost.input.toFixed(4) + " · 输出 " + p.cost.output.toFixed(4) + "</span>"; }, val: function (p) { return p.cost.total; }, dir: "min" },
      { label: "截图 QA 修复", get: function (p) { return p.bugs.length ? p.bugCountLabel + '<span class="sub">源报告记载</span>' : '<span style="color:var(--faint)">未记载</span>'; } },
      { label: "已知 Bug（实测）", get: function (p) { return p.knownBugs && p.knownBugs.length ? p.knownBugs.map(function (b) { return "· " + b; }).join("<br>") : "—"; } },
      { label: "备注", get: function (p) { return p.incomplete ? '<span style="color:#e3c88a">' + p.incomplete + "</span>" : "—"; } },
      { label: "实现方式 / 原始产物", get: function (p) { return p.tech + '<span class="sub">原始产物：' + p.origName + "</span>"; } },
      { label: "在线预览", get: function (p) { return '<a href="' + p.demo + '" target="_blank" rel="noopener">新窗口打开 ↗</a>'; } }
    ];
    var thead = "<thead><tr><th>指标</th>" + P.map(function (p) {
      return '<th><span class="thdot" style="background:' + p.color + '"></span>' + p.name + '<span class="sub">' + p.modelLabel + "</span></th>";
    }).join("") + "</tr></thead>";
    var tbody = "<tbody>" + rows.map(function (r) {
      var bestIdx = -1;
      if (r.val) {
        var vals = P.map(r.val);
        for (var i = 0; i < vals.length; i++) {
          if (bestIdx < 0 || (r.dir === "min" ? vals[i] < vals[bestIdx] : vals[i] > vals[bestIdx])) bestIdx = i;
        }
      }
      return "<tr><th>" + r.label + "</th>" + P.map(function (p, i) {
        return "<td" + (i === bestIdx ? ' class="best"' : "") + ">" + r.get(p) + "</td>";
      }).join("") + "</tr>";
    }).join("") + "</tbody>";
    $("#benchTable").innerHTML = thead + tbody;
  })();
})();
