(() => {
  // =========================================
  // 1. HELPERS & UTILITIES
  // =========================================
  const $ = s => document.querySelector(s);
  const $$ = s => document.querySelectorAll(s);
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const date = s => s ? new Date(s).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "—";
  const time = s => s ? new Date(s).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "";
  const initials = n => (n || "U").split(/\s+/).map(x => x[0]).join("").slice(0, 2).toUpperCase();
  
  const avatar = (u, cls = "avatar") => {
    const inner = u.photo
      ? `<img class="${cls}" src="${u.photo}" alt="${esc(u.name)} profile picture">`
      : `<div class="${cls}">${initials(u.name)}</div>`;
    return `<span class="avatar-ring-wrap">${inner}</span>`;
  };

  let role = "resident", page = "dashboard", toastTimer, sessionTimer;

  const services = [
    { icon: "📄", name: "Barangay Clearance", desc: "Request a clearance for employment, business, or other official purposes.", requirements: "Valid identification and stated purpose." },
    { icon: "🏠", name: "Certificate of Residency", desc: "Request proof that you reside within the barangay.", requirements: "Valid identification and complete address." },
    { icon: "👨‍👩‍👧", name: "Certificate of Indigency", desc: "Request a certificate for eligible assistance and support applications.", requirements: "Valid identification and purpose of request." },
    { icon: "🛍️", name: "Business Clearance", desc: "Request barangay clearance for a business.", requirements: "Business details and valid identification." },
    { icon: "⚖️", name: "Blotter Report", desc: "Record an incident for review by authorized barangay personnel.", requirements: "Provide accurate incident details and persons involved." },
    { icon: "📬", name: "Other inquiries and assistance", desc: "Send a question or request for other community assistance.", requirements: "Provide a clear description of your concern." }
  ];

  // =========================================
  // 2. THEME & SESSION
  // =========================================
  function initTheme() {
    const saved = localStorage.getItem("digigyde_theme");
    const system = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    document.body.setAttribute("data-theme", saved || system);
  }

  function toggleTheme() {
    const t = document.body.getAttribute("data-theme") === "dark" ? "light" : "dark";
    document.body.setAttribute("data-theme", t);
    localStorage.setItem("digigyde_theme", t);
    renderApp();
  }

  initTheme();

  function resetSessionTimer() {
    clearTimeout(sessionTimer);
    if (!DigiStore.user()) return;
    sessionTimer = setTimeout(() => {
      DigiStore.session("");
      alert("Session expired due to inactivity. Please sign in again.");
      renderAuth();
    }, 30 * 60 * 1000);
  }
  document.addEventListener("mousemove", resetSessionTimer);
  document.addEventListener("keydown", resetSessionTimer);

  // =========================================
  // 3. UI COMPONENTS (Toast, Skeleton, Logo)
  // =========================================
  function logo() {
    return `<a class="brand" href="#" onclick="return false"><span class="brand-mark"><svg viewBox="0 0 40 40" role="img" aria-label="DIGIgyde house logo"><path d="M5 18 20 6l15 12v16H5z" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linejoin="round"/><path d="M16 34V22h8v12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/><rect x="3" y="2" width="5" height="5" rx="1" fill="#7fe0d2"/><rect x="17.5" y="1" width="5" height="5" rx="1" fill="#7fe0d2"/><rect x="32" y="2" width="5" height="5" rx="1" fill="#7fe0d2"/></svg></span><span class="brand-word">DIGI<span>gyde</span></span></a>`;
  }

  function showToast(msg, type = "success") {
    document.querySelector(".toast")?.remove();
    const n = document.createElement("div");
    n.className = `toast ${type}`;
    const icon = type === "error" ? "❌" : "✅";
    n.innerHTML = `<span class="toast-icon">${icon}</span> <span>${esc(msg)}</span>`;
    document.body.append(n);
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => n.remove(), 3500);
  }

  function playNotificationSound() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = "sine"; osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.5, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc.start(); osc.stop(ctx.currentTime + 0.4);
    } catch (e) { console.log("Audio not supported"); }
  }

  function renderSkeleton() {
    $("#app").innerHTML = `<div class="app-shell"><aside class="sidebar"><div class="skeleton" style="width:80%;height:40px;margin-bottom:20px"></div><div class="skeleton" style="width:100%;height:200px"></div></aside><main class="main-area"><header class="topbar"><div class="skeleton" style="width:200px;height:30px"></div></header><section class="content"><div class="skeleton" style="width:100%;height:150px;margin-bottom:20px"></div><div class="stats-grid"><div class="skeleton" style="height:100px"></div><div class="skeleton" style="height:100px"></div><div class="skeleton" style="height:100px"></div><div class="skeleton" style="height:100px"></div></div></section></main></div>`;
  }

  function notice(msg, type = "error") { return `<div class="notice notice-${type}">${esc(msg)}</div>`; }
  function statusBadge(s) { return `<span class="status ${String(s).toLowerCase()}">${esc(s)}</span>`; }

  // =========================================
  // 4. AUTH RENDERING
  // =========================================
  function renderAuth(mode = "signin", message = "", selectedRole = "resident", errorField = "", preserveEmail = "") {
    role = selectedRole;
    const savedEmail = localStorage.getItem("digigyde_remember_email") || "";
    const finalEmail = preserveEmail || savedEmail;

    $("#app").innerHTML = `<main class="auth-layout"><aside class="brand-panel"><div class="brand-content">${logo()}<div class="brand-message"><p class="eyebrow"><span class="eyebrow-dot"></span> DIGITAL COMMUNITY SERVICES</p><h1>Your community,<br><span>connected.</span></h1><p class="brand-description">Access essential resident services through one convenient digital space.</p><ul class="feature-list"><li><span class="check-icon">✓</span><span><strong>Resident services</strong><small>Request documents and track service updates.</small></span></li><li><span class="check-icon">✓</span><span><strong>Digital resident profile</strong><small>Keep your resident profile within reach.</small></span></li><li><span class="check-icon">✓</span><span><strong>Clear status updates</strong><small>Stay informed as requests progress.</small></span></li></ul></div><div class="brand-bottom"><div class="community-art" role="img" aria-label="Community of three houses with the central Barangay Hall emphasized"><span class="community-ring"></span><span class="community-tile tile-a"></span><span class="community-tile tile-b"></span><span class="community-tile tile-c"></span><span class="community-tile tile-d"></span><svg class="community-houses" viewBox="0 0 220 92" aria-hidden="true"><g stroke="#dce9f7" stroke-width="2.6" stroke-linejoin="round" fill="none"><path d="M16 41 39 23 62 41v34H16z"/><path d="M29 75V52h19v23"/><path d="M73 34 110 5l37 29v48H73z" stroke="#7fe0d2" stroke-width="3.5"/><path d="M96 82V49h28v33" stroke="#7fe0d2" stroke-width="3.5"/><path d="M158 41 181 23l23 18v34h-46z"/><path d="M171 75V52h19v23"/></g><path d="M100 34h20v10h-20z" fill="#7fe0d2"/><rect x="105" y="21" width="10" height="10" rx="2" fill="#7fe0d2"/></svg><span class="hall-label">BARANGAY HALL</span></div><p>Better access. Stronger communities.</p><small>© ${new Date().getFullYear()} DIGIgyde. All rights reserved.</small></div></div></aside><section class="form-panel"><div class="form-topline"><button class="icon-btn theme-toggle" id="theme-toggle-auth" aria-label="Toggle dark mode" title="Toggle Dark Mode" style="margin-right:auto;">🌓</button><span class="mobile-brand">${logo()}</span><span class="secure-label">▣ Secure resident access</span></div><div class="auth-card"><div class="form-heading"><p class="eyebrow light-eyebrow">${mode === "signin" ? "WELCOME BACK" : "GET STARTED"}</p><h2>${mode === "signin" ? "Sign in to your account" : "Create a resident account"}</h2><p class="form-intro">${mode === "signin" ? "Choose your portal and enter your account details to continue." : "Register to explore resident services and request tracking."}</p></div>${message ? notice(message) : ""}<form id="auth-form" novalidate>${mode === "signin" ? `<fieldset class="role-fieldset"><legend>Choose your portal</legend><div class="role-options"><button class="role-option ${role === "resident" ? "is-active" : ""}" type="button" data-role="resident"><span class="role-icon">⌂</span><span class="role-copy"><strong>Resident</strong><small>Community services</small></span><span class="role-radio"></span></button><button class="role-option ${role === "admin" ? "is-active" : ""}" type="button" data-role="admin"><span class="role-icon">▣</span><span class="role-copy"><strong>Administrator</strong><small>Manage requests</small></span><span class="role-radio"></span></button></div></fieldset>` : ""}${mode === "register" ? `<div class="field"><label for="name">Full name</label><input id="name" name="name" autocomplete="name" required placeholder="Enter your full name"></div>` : ""}<div class="field ${errorField === "email" ? "field-error" : ""}"><label for="email">Email address</label><input id="email" name="email" type="email" autocomplete="username" required placeholder="you@example.com" value="${esc(finalEmail)}"></div><div class="field ${errorField === "password" ? "field-error" : ""}"><label for="password">Password</label><div class="password-wrap"><input id="password" name="password" type="password" autocomplete="${mode === "signin" ? "current-password" : "new-password"}" required minlength="8" placeholder="${mode === "signin" ? "Enter your password" : "At least 8 characters"}"><button class="password-toggle" id="toggle-password" type="button" aria-label="Show password" aria-pressed="false"><svg class="eye-open" viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg><svg class="eye-closed" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3 21 21M10.6 5.2A10.8 10.8 0 0 1 12 5c6.4 0 10 7 10 7a16 16 0 0 1-3.1 3.9M6.2 6.3C3.4 8.1 2 12 2 12s3.6 7 10 7a10 10 0 0 0 4-.8M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg></button></div><div class="caps-warning" id="caps-warning" hidden>⚠ Caps Lock is ON</div>${mode === "register" ? `<div class="strength-meter"><div class="strength-bar" id="strength-bar"></div></div><div class="strength-text" id="strength-text">Password strength</div>` : ""}</div>${mode === "signin" ? `<div class="field checkbox-field"><input type="checkbox" id="remember-me" name="remember" ${savedEmail ? "checked" : ""}><label for="remember-me">Remember my email</label></div>` : ""}${mode === "register" ? `<div class="field"><label for="phone">Phone number (optional)</label><input id="phone" name="phone" placeholder="09xx xxx xxxx"></div><div class="field"><label for="address">Address (optional)</label><input id="address" name="address" placeholder="Street / Sitio / Purok"></div><p class="tiny">Enter your account information to register.</p>` : ""}<button class="btn btn-primary btn-block" type="submit">${mode === "signin" ? "Sign in" : "Create account"} <span>→</span></button></form>${mode === "signin" ? `<div class="form-foot">New to DIGIgyde? <button class="text-btn" id="go-register">Create an account</button><p class="tiny"><strong>Demo acc:</strong><br>Resident: resident@digigyde.local / Resident123!<br>Admin: admin@digigyde.local / Admin123!</p></div>` : `<div class="form-foot">Already have an account? <button class="text-btn" id="go-signin">Sign in</button></div>`}</div></section></main>`;

    $("#theme-toggle-auth")?.addEventListener("click", toggleTheme);
    $$("[data-role]").forEach(b => b.onclick = () => renderAuth(mode, message, b.dataset.role));

    const passwordInput = $("#password"), passwordToggle = $("#toggle-password");
    passwordToggle?.addEventListener("click", () => {
      const visible = passwordInput.type === "password";
      passwordInput.type = visible ? "text" : "password";
      passwordToggle.setAttribute("aria-label", visible ? "Hide password" : "Show password");
      passwordToggle.setAttribute("aria-pressed", String(visible));
      passwordToggle.classList.toggle("is-visible", visible);
    });

    const capsWarning = $("#caps-warning");
    passwordInput?.addEventListener("keyup", e => { if (capsWarning) capsWarning.hidden = !e.getModifierState("CapsLock"); });

    if (mode === "register" && passwordInput) {
      passwordInput.addEventListener("input", () => {
        const val = passwordInput.value;
        let score = 0;
        if (val.length >= 8) score++;
        if (/[A-Z]/.test(val)) score++;
        if (/[0-9]/.test(val)) score++;
        if (/[^A-Za-z0-9]/.test(val)) score++;
        const bar = $("#strength-bar"), text = $("#strength-text");
        if (!bar) return;
        bar.style.width = (score * 25) + "%";
        if (score <= 1) { bar.style.background = "#c23d4b"; text.textContent = "Weak"; }
        else if (score === 2 || score === 3) { bar.style.background = "#a5680a"; text.textContent = "Medium"; }
        else { bar.style.background = "#12a997"; text.textContent = "Strong"; }
      });
    }

    $("#go-register")?.addEventListener("click", () => renderAuth("register"));
    $("#go-signin")?.addEventListener("click", () => renderAuth("signin"));

    $("#auth-form").onsubmit = e => {
      e.preventDefault();
      const f = new FormData(e.currentTarget), email = f.get("email"), password = f.get("password");
      if (mode === "signin") {
        if ($("#remember-me")?.checked) localStorage.setItem("digigyde_remember_email", email);
        else localStorage.removeItem("digigyde_remember_email");
        const result = DigiStore.signIn(email, password, role);
        if (result.error) renderAuth("signin", result.error, role, result.field || "", email);
        else { page = "dashboard"; resetSessionTimer(); renderApp(); }
      } else {
        const name = f.get("name") || "", phone = f.get("phone") || "", address = f.get("address") || "";
        if (name.trim().length < 2) { renderAuth("register", "Please enter your full name."); return; }
        if (password.length < 8) { renderAuth("register", "Use a password with at least 8 characters."); return; }
        const result = DigiStore.register({ name, email, password, phone, address });
        if (result.error) renderAuth("register", result.error, "resident", "", email);
        else { page = "dashboard"; renderApp(); showToast("Your account is ready."); }
      }
    };
  }

  // =========================================
  // 5. APP SHELL & DASHBOARD RENDERING
  // =========================================
  function shell(content, title, subtitle = "Manage your digital community services", breadcrumb = "") {
    const u = DigiStore.user(), isAdmin = u.role === "admin";
    const nav = isAdmin
      ? [["dashboard", "▦", "Overview"], ["requests", "▤", "Service requests"], ["residents", "♙", "Residents"], ["announcements", "◉", "Announcements"], ["audit", "☷", "Activity log"], ["profile", "♙", "My profile"]]
      : [["dashboard", "▦", "Dashboard"], ["services", "▧", "Browse services"], ["requests", "▤", "My requests"], ["digital-id", "▣", "Digital ID"], ["announcements", "◉", "Announcements"], ["profile", "♙", "My profile"]];

    const mobileNav = isAdmin
      ? [["dashboard", "▦", "Home"], ["requests", "▤", "Requests"], ["residents", "♙", "Residents"], ["announcements", "◉", "News"], ["profile", "♙", "Profile"]]
      : [["dashboard", "▦", "Home"], ["services", "▧", "Services"], ["requests", "▤", "Requests"], ["announcements", "◉", "News"], ["profile", "♙", "Profile"]];

    const d = DigiStore.get();
    const myNotifs = d.notifications.filter(n => n.userId === u.id && !n.read);
    const notifBadge = myNotifs.length > 0 ? `<span class="notif-badge">${myNotifs.length}</span>` : "";

    const mobileTabbar = `<nav class="mobile-tabbar" aria-label="Mobile navigation">
      ${mobileNav.map(([id, ico, label]) => `
        <button class="tabbar-btn ${page === id ? "active" : ""}" data-page="${id}" aria-label="${label}">
          <span class="tab-icon">${ico}</span>
          <span>${label}</span>
          ${id === "requests" && myNotifs.length > 0 ? `<span class="tab-badge">${myNotifs.length}</span>` : ""}
        </button>
      `).join("")}
    </nav>`;

    $("#app").innerHTML = `<div class="app-shell">
      <aside class="sidebar">
        ${logo()}
        <div class="sidebar-nav">
          <div class="side-label">WORKSPACE</div>
          <nav class="nav-list">${nav.map(([id, ico, label]) => `<button class="nav-btn ${page === id ? "active" : ""}" data-page="${id}"><span class="nav-symbol">${ico}</span>${label}</button>`).join("")}</nav>
        </div>
        <div class="sidebar-bottom">
          <strong>${esc(u.name)}</strong>${isAdmin ? "Administrator portal" : "Resident portal"}
          <p>© ${new Date().getFullYear()} DIGIgyde</p>
          <button class="nav-btn" id="logout">↪ Sign out</button>
        </div>
      </aside>
      <main class="main-area">
        <header class="topbar">
          <div><h1>${esc(title)}</h1><p>${esc(subtitle)}</p></div>
          <div class="topbar-actions">
            <button class="icon-btn theme-toggle" id="theme-toggle" aria-label="Toggle dark mode" title="Toggle Dark Mode">🌓</button>
            <div class="notification-menu">
              <button class="icon-btn" id="notif-trigger" aria-label="Notifications">🔔 ${notifBadge}</button>
              <div class="notification-dropdown" id="notif-dropdown" hidden>
                <div class="notif-head"><strong>Notifications</strong><button class="text-btn" id="mark-all-read">Mark all read</button></div>
                <div class="notif-list">
                  ${d.notifications.filter(n => n.userId === u.id).slice(0, 5).map(n => `<div class="notif-item ${n.read ? "read" : ""}" data-notif-id="${esc(n.id)}" data-link="${esc(n.link || "")}"><strong>${esc(n.title)}</strong><small>${esc(n.body)} · ${date(n.date)}</small></div>`).join("") || `<div class="empty">No notifications</div>`}
                </div>
              </div>
            </div>
            <div class="account-menu">
              <button class="user-chip account-trigger" id="account-trigger" type="button" aria-haspopup="true" aria-expanded="false" aria-label="Open account menu">${avatar(u)}<span class="user-name"><strong>${esc(u.name)}</strong><small>${isAdmin ? "Administrator" : "Resident account"}</small></span><span class="account-chevron" aria-hidden="true">▾</span></button>
              <div class="account-dropdown" id="account-dropdown" hidden>
                <button type="button" data-account-page="profile">♙ <span>My Profile</span></button>
                <button type="button" id="account-logout">↪ <span>Sign Out</span></button>
              </div>
            </div>
          </div>
        </header>
        <section class="content">
          ${breadcrumb ? `<div class="breadcrumbs">${breadcrumb}</div>` : ""}
          ${content}
        </section>
      </main>
    </div>${mobileTabbar}`;

    $$("[data-page]").forEach(b => b.onclick = () => { page = b.dataset.page; renderSkeleton(); setTimeout(() => renderApp(), 200); window.scrollTo({ top: 0, behavior: "smooth" }); });
    $("#theme-toggle")?.addEventListener("click", toggleTheme);
    const trigger = $("#account-trigger"), dropdown = $("#account-dropdown");
    trigger?.addEventListener("click", () => { const opening = dropdown.hidden; dropdown.hidden = !opening; trigger.setAttribute("aria-expanded", String(opening)); });
    const notifTrigger = $("#notif-trigger"), notifDropdown = $("#notif-dropdown");
    notifTrigger?.addEventListener("click", () => { notifDropdown.hidden = !notifDropdown.hidden; });
    $$(".notif-item").forEach(item => { item.onclick = () => { DigiStore.markRead(item.dataset.notifId); if (item.dataset.link) page = item.dataset.link; renderApp(); }; });
    $("#mark-all-read")?.addEventListener("click", () => { DigiStore.markAllRead(); renderApp(); });
    $$("[data-account-page]").forEach(b => b.onclick = () => { page = b.dataset.accountPage; renderApp(); });
    const logout = () => { DigiStore.session(""); page = "dashboard"; renderAuth("signin"); };
    $("#account-logout")?.addEventListener("click", logout);
    $("#logout")?.addEventListener("click", logout);
    if (!window.__digigydeOutside) {
      window.__digigydeOutside = true;
      document.addEventListener("click", e => {
        if (!e.target.closest(".account-menu")) { const dd = $("#account-dropdown"), tr = $("#account-trigger"); if (dd && !dd.hidden) { dd.hidden = true; tr?.setAttribute("aria-expanded", "false"); } }
        if (!e.target.closest(".notification-menu")) { const nd = $("#notif-dropdown"); if (nd) nd.hidden = true; }
      });
    }
  }

  // =========================================
  // 6. PAGE-SPECIFIC RENDERERS
  // =========================================
  function stat(label, value, icon, foot) { return `<article class="stat-card"><div class="stat-head"><span>${label}</span><span class="stat-icon">${icon}</span></div><div class="stat-value">${value}</div><div class="stat-foot">${foot}</div></article>`; }

  function requestTable(rows, admin = false, searchQuery = "") {
    if (!rows.length) return `<div class="empty"><div class="empty-icon">▤</div>No requests to display yet.</div>`;
    const highlight = (text) => {
      if (!searchQuery) return esc(text);
      const regex = new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, "gi");
      return esc(text).replace(regex, `<mark class="highlight">$1</mark>`);
    };
    return `<div class="table-wrap"><table><thead><tr>${admin ? "<th>Resident</th>" : ""}<th class="sortable" data-sort="id">Request ID</th><th>Service</th><th class="sortable" data-sort="createdAt">Submitted</th><th>Status</th><th>Action</th></tr></thead><tbody>${rows.map(r => `<tr>${admin ? `<td>${highlight(r.residentName)}</td>` : ""}<td><strong>${highlight(r.id)}</strong> <button class="text-btn" data-copy="${esc(r.id)}" title="Copy ID" style="padding:0 4px; font-size:10px;">📋</button></td><td>${highlight(r.service)}</td><td>${date(r.createdAt)}</td><td>${admin ? `<select class="inline-status" data-status-select="${esc(r.id)}" aria-label="Status for request ${esc(r.id)}">${["Pending", "Processing", "Approved", "Rejected", "Completed", "Cancelled"].map(st => `<option ${r.status === st ? "selected" : ""}>${st}</option>`).join("")}</select>` : statusBadge(r.status)}</td><td>${admin ? `<button class="text-btn btn-save-inline" data-save-inline-status="${esc(r.id)}">Save</button>` : ""}<button class="text-btn" data-view-request="${esc(r.id)}">View</button></td></tr>`).join("")}</tbody></table></div>`;
  }

  function serviceCards() { return `<div class="services-grid">${services.map((s, i) => `<article class="service-card"><div class="service-emoji">${s.icon}</div><h3>${s.name}</h3><p>${s.desc}</p><button class="btn btn-secondary" data-request-service="${i}">Start request →</button></article>`).join("")}</div>`; }

  function dashboard(u, d) {
    const mine = d.requests.filter(r => r.userId === u.id), all = d.requests, rows = u.role === "admin" ? all.slice(0, 5) : mine.slice(0, 5);
    return `
    ${u.role === "admin" ? `<div class="admin-note">Administrator workspace. Data is saved in this browser and is not shared with other devices.</div>` : ""}
    <div class="welcome-banner">
      <div><div class="welcome-tag">${u.role === "admin" ? "ADMINISTRATOR WORKSPACE" : "RESIDENT PORTAL"}</div>
      <h2>${u.role === "admin" ? "Welcome to your workspace, " + esc(u.name.split(" ")[0]) + "." : "Hello, " + esc(u.name.split(" ")[0]) + "."}</h2>
      <p>${u.role === "admin" ? "Review service requests, manage resident accounts, and publish announcements." : "Access community services, submit requests, and keep track of your applications."}</p></div>
      ${u.role === "resident" ? `<button class="btn" data-page="services">Explore services →</button>` : `<button class="btn" data-page="requests">Review requests →</button>`}
    </div>
    <div class="quick-actions">
      ${u.role === "resident" ? `<button class="quick-action-btn" data-request-service="0">📄 Request Clearance</button><button class="quick-action-btn" data-page="announcements">📢 Latest Announcements</button>` : `<button class="quick-action-btn" data-page="requests">📋 Manage Requests</button><button class="quick-action-btn" data-page="residents">👥 Manage Residents</button>`}
    </div>
    <div class="stats-grid">${u.role === "admin" ? stat("Total residents", d.users.filter(x => x.role === "resident").length, "♙", "Registered accounts") + stat("Total requests", all.length, "▤", "All service requests") + stat("Pending review", all.filter(r => r.status === "Pending").length, "◷", "Awaiting action") + stat("Approved", all.filter(r => r.status === "Approved" || r.status === "Completed").length, "✓", "Approved or completed") : stat("Total requests", mine.length, "▤", "Your submissions") + stat("Pending", mine.filter(r => r.status === "Pending").length, "◷", "Awaiting review") + stat("In progress", mine.filter(r => r.status === "Processing").length, "↻", "Being processed") + stat("Completed", mine.filter(r => ["Approved", "Completed"].includes(r.status)).length, "✓", "Approved or completed")}</div>
    ${u.role === "resident" ? `<div class="section-head"><div><h2>Available services</h2><p>Choose a service to begin your request.</p></div><button class="btn btn-outline" data-page="services">View all</button></div>${serviceCards()}` : ""}
    <div class="section-head"><div><h2>${u.role === "admin" ? "Recent service requests" : "Recent requests"}</h2><p>${u.role === "admin" ? "Latest service request activity." : "Updates on your submitted applications."}</p></div><button class="btn btn-outline" data-page="requests">View all</button></div><div class="panel">${requestTable(rows, u.role === "admin")}</div>
    <div class="section-head"><div><h2>Community announcements</h2><p>Updates from your local portal.</p></div></div><div class="panel activity-list">${d.announcements.filter(a => a.active).slice(0, 3).map(a => `<div class="activity"><span class="activity-dot"></span><div><strong>${esc(a.title)}</strong><small>${esc(a.body)} · ${date(a.date)}</small></div></div>`).join("") || `<div class="empty">No announcements yet.</div>`}</div>`;
  }

  function requestsPage(u, d) {
    const admin = u.role === "admin", rows = admin ? d.requests : d.requests.filter(r => r.userId === u.id);
    return `<div class="page-title"><h2>${admin ? "Service request management" : "Your service requests"}</h2><p>${admin ? "Review submissions and update their status." : "Track progress and review details for each submission."}</p></div><div class="toolbar"><input id="request-search" placeholder="Search ID, service, resident..." aria-label="Search requests"><select id="status-filter"><option value="">All statuses</option>${["Pending", "Processing", "Approved", "Rejected", "Completed", "Cancelled"].map(s => `<option>${s}</option>`).join("")}</select>${admin ? `<button class="btn btn-outline" id="export-requests-csv">Export CSV</button>` : `<details class="service-picker"><summary class="btn btn-primary">+ New Request</summary><div class="service-picker-menu">${services.map((service, i) => `<button type="button" data-request-service="${i}"><span>${service.icon}</span><span>${esc(service.name)}</span></button>`).join("")}</div></details>`}</div><div class="panel" id="request-table">${requestTable(rows, admin)}</div>`;
  }

  function profilePage(u) {
    const filled = [u.name, u.email, u.phone, u.address, u.photo].filter(Boolean).length;
    const pct = Math.round((filled / 5) * 100);
    return `<div class="page-title"><h2>My profile</h2><p>Update your contact information and profile picture.</p></div><div class="panel"><div class="profile-card">${avatar(u)}<div><h3>${esc(u.name)}</h3><p>${esc(u.email)} · ${u.role === "admin" ? "Administrator" : "Resident"}</p></div></div><div class="progress-wrap"><div class="progress-label">Profile completeness: ${pct}%</div><div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div></div><form id="profile-form" class="inline-form"><div class="field full-span"><label for="profile-photo">Profile picture</label><label class="file-picker" for="profile-photo"><span class="file-picker-button">Choose File</span><span id="file-name">No file chosen</span></label><input class="visually-hidden-file" id="profile-photo" name="photo" type="file" accept="image/png,image/jpeg,image/webp"><div class="field-hint">Choose a JPG, PNG, or WebP image up to 2 MB.</div></div><div class="field full-span"><label>Full name</label><input name="name" required value="${esc(u.name)}"></div><div class="field full-span"><label>Email address</label><input disabled value="${esc(u.email)}"><div class="field-hint">Email address cannot be changed here.</div></div><div class="field"><label>Phone number</label><input name="phone" value="${esc(u.phone || "")}"></div><div class="field"><label>Address</label><input name="address" value="${esc(u.address || "")}"></div><div class="form-actions full-span"><button class="btn btn-primary">Save changes</button></div></form></div><div class="panel" style="margin-top:20px"><h2>Change Password</h2><form id="password-form" class="inline-form"><div class="field full-span"><label>Current Password</label><input type="password" name="current" required></div><div class="field full-span"><label>New Password</label><input type="password" name="new" required minlength="8"></div><div class="form-actions full-span"><button class="btn btn-primary">Update Password</button></div></form></div>`;
  }

  function idPage(u) {
    const photoInner = u.photo ? `<img class="id-photo" src="${u.photo}" alt="${esc(u.name)}">` : `<div class="id-photo">${initials(u.name)}</div>`;
    return `<div class="page-title"><h2>Digital resident ID</h2><p>Your digital resident profile card.</p></div><div class="id-card"><div class="id-top">${logo()}<div class="id-label">DIGITAL RESIDENT PROFILE</div></div><div class="id-body"><span class="id-photo-wrap">${photoInner}</span><div><div class="id-label">RESIDENT NAME</div><h3>${esc(u.name)}</h3><p>${esc(u.address || "Address not provided")}</p><p>${esc(u.email)}</p></div></div><div class="id-bottom"><span>ID: ${esc(u.id.slice(-7).toUpperCase())}</span><span>DIGITAL RESIDENT PROFILE</span></div></div><div class="notice notice-info" style="margin-top:18px;max-width:550px">This digital profile is generated from information saved in your browser. It is not a government-issued identification document.</div>`;
  }

  function announcementsPage(u, d) {
    return `<div class="page-title"><h2>Community announcements</h2><p>Important updates and information from DIGIgyde.</p></div>${u.role === "admin" ? `<div class="panel" style="margin-bottom:18px"><h2>Publish an announcement</h2><p class="panel-sub">The announcement will appear in this browser's portal.</p><form id="announcement-form"><div class="field"><label>Title</label><input name="title" required maxlength="100" placeholder="Announcement title"></div><div class="field"><label>Message</label><textarea name="body" required maxlength="1000" placeholder="Write the announcement..."></textarea></div><button class="btn btn-primary">Publish announcement</button></form></div>` : ""}<div class="activity-list">${d.announcements.filter(a => a.active).map(a => `<article class="panel"><div class="activity"><span class="activity-dot"></span><div><strong>${esc(a.title)}</strong><small>${date(a.date)}</small><p style="font-size:13px;line-height:1.7;margin-bottom:0">${esc(a.body)}</p></div></div></article>`).join("") || `<div class="panel empty">No announcements have been published.</div>`}</div>`;
  }

  function residentsPage(d) {
    const rows = d.users.filter(u => u.role === "resident");
    return `<div class="page-title"><h2>Resident management</h2><p>Manage resident accounts saved in this browser.</p></div><div class="admin-note">Changes apply to data stored in this browser and are not shared across devices.</div><div class="toolbar"><input id="resident-search" placeholder="Search name or email..."><button class="btn btn-outline" id="export-residents-csv">Export CSV</button></div><div class="panel" id="residents-table"><div class="table-wrap"><table><thead><tr><th>Resident</th><th>Email</th><th>Joined</th><th>Status</th><th>Action</th></tr></thead><tbody>${rows.map(u => `<tr><td>${esc(u.name)}</td><td>${esc(u.email)}</td><td>${date(u.createdAt)}</td><td>${statusBadge(u.status)}</td><td><button class="text-btn" data-view-resident="${esc(u.id)}">View</button> <button class="text-btn" data-toggle-user="${esc(u.id)}">${u.status === "Active" ? "Suspend" : "Activate"}</button></td></tr>`).join("")}</tbody></table></div></div>`;
  }

  function auditPage(d) {
    return `<div class="page-title"><h2>Activity log</h2><p>Recent activity recorded in this browser.</p></div><div class="panel"><div class="table-wrap"><table><thead><tr><th>When</th><th>Actor</th><th>Action</th><th>Target</th></tr></thead><tbody>${d.audit.map(a => `<tr><td>${time(a.date)}</td><td>${esc(a.actor)}</td><td>${esc(a.action)}</td><td>${esc(a.target)}</td></tr>`).join("")}</tbody></table></div></div>`;
  }

  // =========================================
  // 7. MODALS & ACTIONS
  // =========================================
  function requestModal(id = null, serviceIndex = null) {
    const d = DigiStore.get(), u = DigiStore.user(), r = id ? d.requests.find(x => x.id === id) : null;
    let body;
    if (r) {
      const timeline = r.history ? r.history.map(h => `<div class="timeline-item"><div class="timeline-dot"></div><div class="timeline-content"><strong>${esc(h.status)}</strong><small>${time(h.date)} ${h.note ? `· ${esc(h.note)}` : ""}</small></div></div>`).join("") : "";
      body = `<div class="field"><label>Request ID</label><div style="display:flex; gap:10px;"><input disabled value="${esc(r.id)}" style="flex:1;"><button class="btn btn-outline" data-copy="${esc(r.id)}" title="Copy ID">📋</button></div></div><div class="field"><label>Resident</label><input disabled value="${esc(r.residentName)}"></div><div class="field"><label>Service</label><input disabled value="${esc(r.service)}"></div><div class="field"><label>Purpose</label><input disabled value="${esc(r.purpose)}"></div><div class="field"><label>Details</label><textarea disabled>${esc(r.details)}</textarea></div><div class="field"><label>Status</label>${u.role === "admin" ? `<select id="modal-status">${["Pending", "Processing", "Approved", "Rejected", "Completed", "Cancelled"].map(s => `<option ${r.status === s ? "selected" : ""}>${s}</option>`).join("")}</select>` : `<input disabled value="${esc(r.status)}">`}</div><div class="field"><label>Administrator note</label>${u.role === "admin" ? `<textarea id="modal-note" placeholder="Optional note for resident">${esc(r.adminNote || "")}</textarea>` : `<textarea disabled>${esc(r.adminNote || "No note yet.")}</textarea>`}</div>${u.role === "admin" ? `<button class="btn btn-primary btn-block" id="save-request-status" data-id="${esc(r.id)}">Save status update</button>` : ""}<div class="field full-span" style="margin-top:20px"><label>Request Timeline</label><div class="timeline">${timeline}</div></div>${u.role === "resident" && r.status === "Pending" ? `<button class="btn btn-danger btn-block" style="margin-top:10px" id="cancel-request" data-id="${esc(r.id)}">Cancel Request</button>` : ""}`;
    } else {
      const s = services[serviceIndex] || services[0];
      body = `<p class="tiny">Requirements: ${esc(s.requirements)}</p><form id="request-form"><input type="hidden" name="service" value="${esc(s.name)}"><div class="selected-service"><span>${s.icon}</span><div><strong>${esc(s.name)}</strong><small>Selected service</small></div></div>${s.name === "Blotter Report" ? `<div class="field"><label for="incident-type">Incident type</label><select id="incident-type" name="incidentType" required><option value="">Select incident type</option><option>Theft or property loss</option><option>Threat or harassment</option><option>Physical injury or altercation</option><option>Noise or neighborhood disturbance</option><option>Property damage</option><option>Other incident</option></select></div><div class="field"><label for="incident-date">Incident date and time</label><input id="incident-date" name="incidentDate" type="datetime-local" required></div><div class="field"><label for="incident-location">Incident location</label><input id="incident-location" name="incidentLocation" required maxlength="220" placeholder="Street, sitio/purok, or nearby landmark"></div><div class="field"><label for="persons-involved">Persons involved</label><textarea id="persons-involved" name="personsInvolved" required maxlength="1200" placeholder="Names or descriptions, roles, and contact details if known"></textarea></div><div class="field"><label for="incident-narrative">Narrative details</label><textarea id="incident-narrative" name="narrative" required minlength="20" maxlength="4000" placeholder="Describe what happened, in chronological order, including relevant facts and witnesses."></textarea></div><div class="field"><label for="blotter-purpose">Additional notes (optional)</label><textarea id="blotter-purpose" name="purpose" maxlength="500" placeholder="Any other relevant information"></textarea></div>` : `<div class="field"><label for="request-purpose">Purpose of request</label><input id="request-purpose" name="purpose" required maxlength="160" placeholder="e.g. Employment requirement"></div><div class="field"><label for="request-details">Additional details</label><textarea id="request-details" name="details" maxlength="1000" placeholder="Add any relevant information..."></textarea></div>`}<div class="field full-span"><label>Attach supporting document (optional)</label><input type="file" name="attachment" accept="image/*,.pdf" class="file-input"></div><div class="notice notice-info">Your submission is saved in this browser. Share accurate information and avoid including unnecessary sensitive details.</div><button class="btn btn-primary btn-block">Submit request</button></form>`;
    }

    const wrap = document.createElement("div");
    wrap.className = "modal-backdrop";
    wrap.innerHTML = `<section class="modal" role="dialog" aria-modal="true"><div class="modal-head"><h2>${r ? "Request details" : "New service request"}</h2><button class="icon-btn" id="close-modal" aria-label="Close">×</button></div>${body}</section>`;
    document.body.append(wrap);
    document.body.style.overflow = "hidden";
    const close = () => { wrap.remove(); document.body.style.overflow = ""; };
    $("#close-modal").onclick = close;
    wrap.addEventListener("click", e => { if (e.target === wrap) close(); });

    if (r) {
      $("#save-request-status")?.addEventListener("click", e => {
        if (confirm("Are you sure you want to update this request status?")) {
          DigiStore.updateRequest(e.currentTarget.dataset.id, $("#modal-status").value, $("#modal-note").value);
          close(); renderApp(); showToast("Request status updated."); playNotificationSound();
        }
      });
      $("#cancel-request")?.addEventListener("click", e => {
        if (confirm("Are you sure you want to cancel this request?")) {
          DigiStore.cancelRequest(e.currentTarget.dataset.id);
          close(); renderApp(); showToast("Request cancelled.");
        }
      });
    } else {
      $("#request-form")?.addEventListener("submit", e => {
        e.preventDefault(); const f = new FormData(e.currentTarget); const service = f.get("service");
        const details = service === "Blotter Report" ? `Incident type: ${f.get("incidentType")}\nDate/time: ${f.get("incidentDate")}\nLocation: ${f.get("incidentLocation")}\nPersons involved: ${f.get("personsInvolved")}\nNarrative: ${f.get("narrative")}\nAdditional notes: ${f.get("purpose") || "None"}` : (f.get("details") || "");
        const attachment = f.get("attachment")?.name || "";
        DigiStore.createRequest({ service, purpose: f.get("purpose") || (service === "Blotter Report" ? `Blotter report — ${f.get("incidentType")}` : "Service request"), details, attachment });
        close(); renderApp(); showToast("Request submitted and saved locally."); playNotificationSound();
      });
    }
  }

  function exportCSV(type) {
    const d = DigiStore.get(); let csv = "";
    if (type === "requests") {
      if (!d.requests.length) return showToast("No requests to export.", "error");
      csv = "ID,Resident,Service,Status,Date Submitted\n" + d.requests.map(r => `"${r.id}","${r.residentName}","${r.service}","${r.status}","${date(r.createdAt)}"`).join("\n");
    } else {
      const res = d.users.filter(u => u.role === "resident");
      if (!res.length) return showToast("No residents to export.", "error");
      csv = "Name,Email,Status,Joined\n" + res.map(u => `"${u.name}","${u.email}","${u.status}","${date(u.createdAt)}"`).join("\n");
    }
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `${type}.csv`; a.click(); URL.revokeObjectURL(a.href);
    showToast("CSV exported successfully.");
  }

  // =========================================
  // 8. MAIN RENDER CONTROLLER
  // =========================================
  let sortState = { key: null, asc: true };

  function renderApp() {
    const u = DigiStore.user();
    if (!u) { renderAuth(); return; }

    const d = DigiStore.get();
    if (u.role === "admin" && ["services", "digital-id"].includes(page)) page = "dashboard";
    let title = "Dashboard", sub = "Manage your digital community services", content = "", breadcrumb = "";

    switch (page) {
      case "dashboard": title = u.role === "admin" ? "Administrator overview" : "Resident dashboard"; content = dashboard(u, d); break;
      case "services": title = "Browse services"; breadcrumb = `<a href="#" data-page="dashboard">Dashboard</a> <span>/</span> Browse services`; content = `<div class="page-title"><h2>Community services</h2><p>Review the available services and start a request.</p></div>${serviceCards()}`; break;
      case "requests": title = u.role === "admin" ? "Service requests" : "My requests"; breadcrumb = `<a href="#" data-page="dashboard">Dashboard</a> <span>/</span> My Requests`; content = requestsPage(u, d); break;
      case "profile": title = "My profile"; breadcrumb = `<a href="#" data-page="dashboard">Dashboard</a> <span>/</span> My Profile`; content = profilePage(u); break;
      case "digital-id": title = "Digital ID"; breadcrumb = `<a href="#" data-page="dashboard">Dashboard</a> <span>/</span> Digital ID`; content = idPage(u); break;
      case "announcements": title = "Announcements"; breadcrumb = `<a href="#" data-page="dashboard">Dashboard</a> <span>/</span> Announcements`; content = announcementsPage(u, d); break;
      case "residents": title = "Residents"; breadcrumb = `<a href="#" data-page="dashboard">Dashboard</a> <span>/</span> Residents`; content = residentsPage(d); break;
      case "audit": title = "Activity log"; breadcrumb = `<a href="#" data-page="dashboard">Dashboard</a> <span>/</span> Activity Log`; content = auditPage(d); break;
      default: page = "dashboard"; return renderApp();
    }
    shell(content, title, sub, breadcrumb);
    bindPage(u);
  }

  // =========================================
  // 9. EVENT BINDINGS (Post-Render)
  // =========================================
  function bindPage(u) {
    $$("[data-page]").forEach(b => b.onclick = () => { page = b.dataset.page; renderSkeleton(); setTimeout(() => renderApp(), 200); window.scrollTo({ top: 0, behavior: "smooth" }); });
    $$("[data-account-page]").forEach(b => b.onclick = () => { page = b.dataset.accountPage; renderApp(); });

    $("#profile-photo")?.addEventListener("change", e => { $("#file-name").textContent = e.target.files?.[0]?.name || "No file chosen"; });
    $("#profile-form")?.addEventListener("submit", e => {
      e.preventDefault(); const f = new FormData(e.currentTarget); const file = f.get("photo");
      const save = photo => { DigiStore.updateProfile({ name: f.get("name"), phone: f.get("phone"), address: f.get("address"), photo }); renderApp(); showToast("Profile updated."); };
      if (file && file.size) {
        if (file.size > 2 * 1024 * 1024) { showToast("Please choose an image smaller than 2 MB."); return; }
        const reader = new FileReader(); reader.onload = () => save(reader.result); reader.onerror = () => showToast("The image could not be read."); reader.readAsDataURL(file);
      } else save(DigiStore.user().photo || "");
    });
    $("#password-form")?.addEventListener("submit", e => { e.preventDefault(); const f = new FormData(e.currentTarget); const res = DigiStore.changePassword(f.get("current"), f.get("new")); if (res.error) alert(res.error); else { showToast("Password updated successfully."); e.target.reset(); } });
    $("#announcement-form")?.addEventListener("submit", e => { e.preventDefault(); const f = new FormData(e.currentTarget); DigiStore.addAnnouncement(f.get("title").trim(), f.get("body").trim()); renderApp(); showToast("Announcement published locally."); });
    $("#export-requests-csv")?.addEventListener("click", () => exportCSV("requests"));
    $("#export-residents-csv")?.addEventListener("click", () => exportCSV("residents"));

    $("#request-search")?.addEventListener("input", filterRequests);
    $("#status-filter")?.addEventListener("change", filterRequests);

    $$("th.sortable").forEach(th => {
      th.onclick = () => {
        const key = th.dataset.sort;
        if (sortState.key === key) sortState.asc = !sortState.asc;
        else { sortState.key = key; sortState.asc = true; }
        $$("th.sortable").forEach(h => h.classList.remove("asc", "desc"));
        th.classList.add(sortState.asc ? "asc" : "desc");
        const u = DigiStore.user(), d = DigiStore.get();
        let rows = u.role === "admin" ? d.requests : d.requests.filter(r => r.userId === u.id);
        rows.sort((a, b) => {
          let valA = a[key], valB = b[key];
          if (key === "createdAt") { valA = new Date(valA); valB = new Date(valB); }
          if (valA < valB) return sortState.asc ? -1 : 1;
          if (valA > valB) return sortState.asc ? 1 : -1;
          return 0;
        });
        $("#request-table").innerHTML = requestTable(rows, u.role === "admin", $("#request-search")?.value || "");
      };
    });

    $("#resident-search")?.addEventListener("input", () => { const q = $("#resident-search").value.toLowerCase(); document.querySelectorAll("#residents-table tbody tr").forEach(tr => tr.style.display = tr.textContent.toLowerCase().includes(q) ? "" : "none"); });
  }

  // Global Click Delegation (Copy, Save, View, etc.)
  document.addEventListener("click", function (e) {
    const copyBtn = e.target.closest("[data-copy]");
    if (copyBtn) { e.preventDefault(); navigator.clipboard.writeText(copyBtn.dataset.copy).then(() => showToast(`Copied: ${copyBtn.dataset.copy}`)); return; }

    const saveBtn = e.target.closest("[data-save-inline-status]");
    if (saveBtn) {
      e.preventDefault();
      const id = saveBtn.dataset.saveInlineStatus;
      const select = document.querySelector(`[data-status-select="${CSS.escape(id)}"]`);
      if (select && confirm(`Are you sure you want to update the status of request ${id} to "${select.value}"?`)) {
        DigiStore.updateRequest(id, select.value, "");
        renderApp();
        showToast(`Request ${id} has been successfully saved as ${select.value}.`);
        playNotificationSound();
      }
      return;
    }

    const viewReqBtn = e.target.closest("[data-view-request]");
    if (viewReqBtn) { e.preventDefault(); requestModal(viewReqBtn.dataset.viewRequest); return; }

    const toggleUserBtn = e.target.closest("[data-toggle-user]");
    if (toggleUserBtn) {
      e.preventDefault();
      if (confirm("Are you sure you want to change the status of this resident?")) {
        const d = DigiStore.get(), u0 = d.users.find(x => x.id === toggleUserBtn.dataset.toggleUser);
        if (!u0) return; u0.status = u0.status === "Active" ? "Suspended" : "Active"; DigiStore.set(d); renderApp(); showToast(`Resident account is now ${u0.status}.`);
      }
      return;
    }

    const viewResBtn = e.target.closest("[data-view-resident]");
    if (viewResBtn) {
      e.preventDefault();
      const d = DigiStore.get(), resident = d.users.find(x => x.id === viewResBtn.dataset.viewResident);
      const reqs = d.requests.filter(r => r.userId === resident.id);
      const wrap = document.createElement("div"); wrap.className = "modal-backdrop";
      wrap.innerHTML = `<section class="modal"><div class="modal-head"><h2>${esc(resident.name)}'s Profile</h2><button class="icon-btn" id="close-modal">×</button></div><div class="field"><label>Email</label><input disabled value="${esc(resident.email)}"></div><div class="field"><label>Phone</label><input disabled value="${esc(resident.phone || '—')}"></div><div class="field"><label>Address</label><input disabled value="${esc(resident.address || '—')}"></div><h3 style="margin-top:20px">Request History (${reqs.length})</h3>${requestTable(reqs, false)}</section>`;
      document.body.append(wrap); document.body.style.overflow = "hidden";
      const close = () => { wrap.remove(); document.body.style.overflow = ""; };
      $("#close-modal").onclick = close; wrap.addEventListener("click", e => { if (e.target === wrap) close(); });
      return;
    }

    const reqServiceBtn = e.target.closest("[data-request-service]");
    if (reqServiceBtn) {
      e.preventDefault();
      const picker = reqServiceBtn.closest("details");
      if (picker) picker.open = false;
      requestModal(null, Number(reqServiceBtn.dataset.requestService));
      return;
    }
  });

  function filterRequests() {
    const q = ($("#request-search")?.value || "").toLowerCase(), s = $("#status-filter")?.value || "", u = DigiStore.user(), d = DigiStore.get();
    const rows = (u.role === "admin" ? d.requests : d.requests.filter(r => r.userId === u.id)).filter(r => (!s || r.status === s) && [r.id, r.service, r.residentName, r.purpose].join(" ").toLowerCase().includes(q));
    $("#request-table").innerHTML = requestTable(rows, u.role === "admin", q);
  }

  // =========================================
  // 10. INITIALIZATION
  // =========================================
  DigiStore.user() ? renderApp() : renderAuth();
})();