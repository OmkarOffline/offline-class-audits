/* =========================================================
   Shared by every page: helpers, Google sign-in, roles, data access.
   Needs config.js loaded first.
   ========================================================= */
const $ = id => document.getElementById(id);
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const store = {
  get(k, area = localStorage) { try { return JSON.parse(area.getItem(k)); } catch { return null; } },
  set(k, v, area = localStorage) { try { area.setItem(k, JSON.stringify(v)); } catch {} },
  del(k, area = localStorage) { try { area.removeItem(k); } catch {} }
};
function todayISO() {
  const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}
function fmtDate(iso) {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  return isNaN(d) ? iso : d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}
const centreOf = name => CENTRES.find(c => c.name === name);

/** Score + automatic-referral check for a list of { rating } (same rules as Code.gs). */
function scoreItems(items) {
  let total = 0, max = 0, rated = 0, zeros = 0;
  items.forEach(it => {
    const r = it.rating;
    if (r === "" || r == null) return;
    rated++;
    if (r === "NA" || r === "N/A") return;
    total += Number(r); max += 2;
    if (String(r) === "0") zeros++;
  });
  const pct = max ? Math.round((total / max) * 1000) / 10 : null;
  const reasons = [];
  if (pct !== null && pct < REFERRAL_RULES.minScorePct) reasons.push(`score ${pct}% is below ${REFERRAL_RULES.minScorePct}%`);
  if (zeros >= REFERRAL_RULES.zeroRatingsLimit) reasons.push(`${zeros} items rated 0`);
  return { total, max, pct, rated, zeros, autoRefer: reasons.length > 0, autoReasons: reasons };
}

const App = (() => {
  const SESSION_KEY = "artium-audit-session-v1";
  const PREVIEW_AS_KEY = "artium-audit-preview-as-v1";
  const PREVIEW_DB_KEY = "artium-audit-preview-db-v1";
  const previewSignIn = !CONFIG.GOOGLE_CLIENT_ID;
  const previewData = !CONFIG.GOOGLE_CLIENT_ID || !CONFIG.APPS_SCRIPT_URL;

  let session = null, ctx = null, pending = null, onReady = null;

  /* ---------- theme: light by default, toggle remembered per browser ---------- */
  const THEME_KEY = "artium-audit-theme";
  const SUN = '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><circle cx="12" cy="12" r="4.2" fill="currentColor"/><g stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6"/></g></svg>';
  const MOON = '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M20.5 14.6A8.5 8.5 0 0 1 9.4 3.5a8.5 8.5 0 1 0 11.1 11.1z"/></svg>';
  function applyTheme(t) {
    document.documentElement.dataset.theme = t;
    const b = document.getElementById("themeBtn");
    if (b) {
      b.innerHTML = t === "dark" ? SUN : MOON;
      b.title = b.ariaLabel = t === "dark" ? "Switch to light mode" : "Switch to dark mode";
    }
  }
  applyTheme(store.get(THEME_KEY) || "light");

  /* ---------- shell: top bar, sign-in and no-access views ---------- */
  function mountShell(page) {
    document.body.insertAdjacentHTML("afterbegin", `
      <header class="topbar">
        <div class="brand">Artium Academy <span>· Class Audits</span></div>
        <nav class="nav" id="nav" hidden>
          <a href="index.html" class="${page === "home" ? "active" : ""}">Home</a>
          <a href="scores.html" class="${page === "scores" ? "active" : ""}">Scores</a>
        </nav>
        <div class="right">
          <div class="user" id="userBox" hidden>
            <img id="userPic" alt="" referrerpolicy="no-referrer" hidden>
            <span class="email" id="userEmail"></span>
            <button class="linkbtn" id="signOutBtn" type="button">Sign out</button>
          </div>
          <button class="iconbtn" id="themeBtn" type="button"></button>
        </div>
      </header>
      <div class="shell">
        <div class="banner warn" id="previewNote" hidden></div>
        <section id="signinView" class="signin" hidden>
          <div class="signin-card">
            <div class="staff" aria-hidden="true">
              <span class="note n1"></span><span class="note n2"></span><span class="note n3"></span>
            </div>
            <div class="signin-body">
              <div class="eyebrow">Artium Academy · Offline centres</div>
              <h1 class="signin-title">Class Audits</h1>
              <p class="muted" id="signinText">Observe a class, rate it against the checklist, and follow how every teacher is growing, month by month.</p>
              <div id="gsiBtn"></div>
              <div id="previewPick" hidden>
                <label class="f" for="previewAs">Preview as</label>
                <select id="previewAs"></select>
                <button class="btn" id="previewGo" type="button">Continue</button>
              </div>
              <p class="errors" id="signinError" hidden></p>
              <ul class="signin-roles">
                <li><b>Auditors</b> start audits and see their centre's scores.</li>
                <li><b>Teachers</b> see their own audits and feedback.</li>
              </ul>
              <p class="signin-foot">Use your @artiumacademy.com Google account.</p>
            </div>
          </div>
        </section>
        <section id="noAccessView" class="card center" hidden>
          <h1>No access yet</h1>
          <p class="muted" id="noAccessText"></p>
        </section>
      </div>`);
    $("signOutBtn").addEventListener("click", signOut);
    applyTheme(document.documentElement.dataset.theme);
    $("themeBtn").addEventListener("click", () => {
      const t = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
      store.set(THEME_KEY, t); applyTheme(t);
    });
    if (previewSignIn || previewData) {
      $("previewNote").hidden = false;
      $("previewNote").textContent = previewSignIn
        ? "Preview mode: Google sign-in isn't set up yet, so you can preview as any team member. Audits are kept only in this browser."
        : "Preview mode: saving isn't set up yet. Audits are kept only in this browser.";
    }
  }

  function showOnly(which) {
    $("signinView").hidden = which !== "signin";
    $("noAccessView").hidden = which !== "noaccess";
    $("page").hidden = which !== "page";
  }

  function renderUser() {
    $("userBox").hidden = !session;
    if (!session) return;
    $("userEmail").textContent = session.preview ? session.name + " (preview)" : session.email;
    $("userPic").hidden = !session.picture;
    if (session.picture) $("userPic").src = session.picture;
  }

  /* ---------- sign-in ---------- */
  function decodeJwt(token) {
    const part = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(atob(part).split("").map(c => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2)).join(""));
    return JSON.parse(json);
  }

  function onCredential(resp) {
    const p = decodeJwt(resp.credential);
    const okDomain = p.hd === CONFIG.ALLOWED_DOMAIN || (p.email || "").toLowerCase().endsWith("@" + CONFIG.ALLOWED_DOMAIN);
    if (!okDomain) {
      $("signinError").textContent = `Please sign in with your @${CONFIG.ALLOWED_DOMAIN} account (${p.email} isn't allowed).`;
      $("signinError").hidden = false;
      try { google.accounts.id.disableAutoSelect(); } catch {}
      return;
    }
    session = { email: p.email, name: p.name, picture: p.picture, token: resp.credential, exp: p.exp };
    store.set(SESSION_KEY, session, sessionStorage);
    $("signinError").hidden = true;
    afterSignIn();
  }

  function loadGsi() {
    return new Promise((resolve, reject) => {
      if (window.google?.accounts?.id) return resolve();
      const s = document.createElement("script");
      s.src = "https://accounts.google.com/gsi/client"; s.async = true;
      s.onload = resolve; s.onerror = () => reject(new Error("Couldn't load Google sign-in. Check your connection and reload."));
      document.head.appendChild(s);
    });
  }

  async function showSignIn(message) {
    showOnly("signin"); $("nav").hidden = true; $("userBox").hidden = true;
    $("signinError").hidden = !message;
    if (message) $("signinError").textContent = message;

    if (previewSignIn) {
      $("signinText").textContent = "Pick a team member to see the site as they would.";
      $("previewPick").hidden = false;
      $("gsiBtn").hidden = true;
      const opt = p => `<option value="${esc(p.name)}">${esc(p.name)} · ${esc(p.role)}${p.centre === ALL ? "" : ", " + esc(p.centre)}</option>`;
      $("previewAs").innerHTML =
        `<optgroup label="Auditors">${AUDITORS.map(opt).join("")}</optgroup>` +
        `<optgroup label="Teachers">${TEACHERS.map(opt).join("")}</optgroup>`;
      $("previewGo").onclick = () => {
        const p = TEAM.find(x => x.name === $("previewAs").value);
        session = { preview: true, name: p.name, email: p.email || "(no email)", exp: Infinity };
        store.set(PREVIEW_AS_KEY, p.name, sessionStorage);
        afterSignIn();
      };
      return;
    }
    try {
      await loadGsi();
      google.accounts.id.initialize({
        client_id: CONFIG.GOOGLE_CLIENT_ID, callback: onCredential,
        hd: CONFIG.ALLOWED_DOMAIN, auto_select: true, cancel_on_tap_outside: false
      });
      $("gsiBtn").innerHTML = "";
      google.accounts.id.renderButton($("gsiBtn"), {
        theme: document.documentElement.dataset.theme === "dark" ? "filled_black" : "outline",
        size: "large", text: "continue_with", shape: "pill", logo_alignment: "left", width: 280
      });
      google.accounts.id.prompt();
    } catch (e) {
      $("signinError").textContent = e.message; $("signinError").hidden = false;
    }
  }

  function signOut() {
    session = null; ctx = null;
    store.del(SESSION_KEY, sessionStorage); store.del(PREVIEW_AS_KEY, sessionStorage);
    try { google.accounts.id.disableAutoSelect(); } catch {}
    showSignIn();
  }

  function afterSignIn() {
    renderUser();
    const people = session.preview
      ? TEAM.filter(p => p.name === session.name)
      : TEAM.filter(p => p.email && p.email.toLowerCase() === session.email.toLowerCase());
    if (!people.length) {
      showOnly("noaccess");
      $("noAccessText").textContent = `${session.email} isn't on the Artium offline team list yet. Please ask Omkar Shirsat to add you.`;
      return;
    }
    ctx = {
      session, people,
      auditors: people.filter(p => p.audit === "Auditor"),
      teacher: people.find(p => p.audit === "Auditee") || null
    };
    ctx.isAuditor = ctx.auditors.length > 0;
    $("nav").hidden = !ctx.isAuditor;
    if (pending) { const fn = pending; pending = null; showOnly("page"); fn(); return; }
    showOnly("page");
    onReady(ctx);
  }

  /* ---------- data access ---------- */
  function previewApi(action, body) {
    const db = store.get(PREVIEW_DB_KEY) || [];
    if (action === "submit") {
      const sc = scoreItems(body.items);
      const rec = { ...body, id: "p" + Date.now(), submittedAt: new Date().toISOString(),
        totalScore: sc.total, maxPossible: sc.max, scorePct: sc.pct,
        autoReferral: sc.autoRefer ? "Yes" : "No", autoReferralReason: sc.autoReasons.join("; "),
        referredToAcademic: (sc.autoRefer || body.auditorReferral === "Yes") ? "Yes" : "No" };
      delete rec.idToken;
      db.push(rec); store.set(PREVIEW_DB_KEY, db);
      return { ok: true, audit: rec };
    }
    if (action === "audits") {
      let rows;
      if (ctx.isAuditor) {
        const all = ctx.auditors.some(a => a.centre === ALL);
        const centres = ctx.auditors.map(a => a.centre);
        rows = db.filter(r => all || centres.includes(r.centre));
      } else if (ctx.teacher) {
        rows = db.filter(r => r.teacher === ctx.teacher.name && r.centre === ctx.teacher.centre).map(forTeacher);
      } else rows = [];
      rows.sort((a, b) => (b.date + b.batchTime).localeCompare(a.date + a.batchTime));
      return { ok: true, audits: rows };
    }
    throw new Error("Unknown action " + action);
  }
  // What a teacher sees about their own audit (referral details stay with auditors/academics).
  function forTeacher(r) {
    const { autoReferral, autoReferralReason, auditorReferral, auditorReferralReason, referredToAcademic, auditorEmail, submittedBy, ...rest } = r;
    return rest;
  }

  async function api(action, body = {}) {
    if (previewData) return previewApi(action, body);
    const res = await fetch(CONFIG.APPS_SCRIPT_URL, {
      method: "POST",                                   // text/plain body: no CORS preflight
      body: JSON.stringify({ ...body, action, idToken: session ? session.token : "" })
    });
    const out = await res.json();
    if (!out.ok) throw new Error(out.error || "The server couldn't complete that.");
    return out;
  }

  /** Runs fn now if the sign-in is still fresh, otherwise asks to sign in again first. */
  function ensureFresh(fn) {
    if (session && (session.preview || session.exp * 1000 > Date.now() + 60 * 1000)) return fn();
    pending = fn;
    showSignIn("Your sign-in has expired. Sign in again to continue — nothing you entered is lost.");
  }

  /* ---------- start ---------- */
  function start(page, ready) {
    onReady = ready;
    mountShell(page);
    if (previewSignIn) {
      const name = store.get(PREVIEW_AS_KEY, sessionStorage);
      const p = name && TEAM.find(x => x.name === name);
      if (p) { session = { preview: true, name: p.name, email: p.email || "(no email)", exp: Infinity }; return afterSignIn(); }
      return showSignIn();
    }
    const saved = store.get(SESSION_KEY, sessionStorage);
    if (saved && saved.exp * 1000 > Date.now()) { session = saved; return afterSignIn(); }
    showSignIn();
  }

  /** Preview only: fills this browser with clearly marked sample audits so the scores page has something to show. */
  function seedPreview() {
    let seed = 7;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const pick = a => a[Math.floor(rnd() * a.length)];
    const db = store.get(PREVIEW_DB_KEY) || [];
    TEACHERS.forEach((t, ti) => {
      const n = ti % 6 === 0 ? 1 : Math.floor(rnd() * 5) + 1;      // a few teachers get just one audit
      const skill = 0.45 + rnd() * 0.5;
      const auditor = AUDITORS.find(a => a.centre === t.centre) || AUDITORS[0];
      for (let k = 0; k < n; k++) {
        const d = new Date(); d.setDate(d.getDate() - Math.floor(rnd() * 60) - 1);
        if (d.getDay() === 1) d.setDate(d.getDate() - 1);
        const [open, close] = HOURS[d.getDay()];
        const h = open + Math.floor(rnd() * (close - open));
        const lvl = n === 1 && ti % 12 === 0 ? 0.97 : skill;      // a single standout audit to show the weighting
        const items = ITEMS.map(it => {
          const x = rnd();
          const rating = x < 0.05 ? "NA" : x < 0.05 + lvl * 0.9 ? "2" : x < 0.97 ? "1" : "0";
          return { id: it.id, section: it.section, parameter: it.p, rating, evidence: "Sample note" };
        });
        const sc = scoreItems(items);
        const fmt = n2 => String(n2).padStart(2, "0");
        db.push({ id: "s" + ti + "-" + k, sample: true, submittedAt: d.toISOString(),
          auditor: auditor.name + " (sample)", auditorRole: auditor.role, centre: t.centre, city: centreOf(t.centre).city,
          teacher: t.name, teacherEmail: t.email, course: t.course, classType: rnd() < 0.85 ? "Paid" : "Trial",
          batchType: pick(BATCH_TYPES), date: d.getFullYear() + "-" + fmt(d.getMonth() + 1) + "-" + fmt(d.getDate()),
          batchTime: `${(h + 11) % 12 + 1}:00 ${h < 12 ? "AM" : "PM"} – ${(h + 12) % 12 + 1}:00 ${h + 1 < 12 ? "AM" : "PM"}`,
          learnersPresent: 2 + Math.floor(rnd() * 5), items,
          totalScore: sc.total, maxPossible: sc.max, scorePct: sc.pct,
          topStrength: "Sample: clear demonstrations", topImprove: "Sample: recap at the end of class",
          autoReferral: sc.autoRefer ? "Yes" : "No", autoReferralReason: sc.autoReasons.join("; "),
          auditorReferral: "No", auditorReferralReason: "", referredToAcademic: sc.autoRefer ? "Yes" : "No" });
      }
    });
    store.set(PREVIEW_DB_KEY, db);
  }
  function clearPreview() { store.set(PREVIEW_DB_KEY, (store.get(PREVIEW_DB_KEY) || []).filter(r => !r.sample)); }

  return { start, api, ensureFresh, get ctx() { return ctx; }, previewData, seedPreview, clearPreview };
})();
