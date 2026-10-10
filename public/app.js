const app = document.getElementById("app");

const state = {
  token: localStorage.getItem("canteeniq_token"),
  user: null,
  loginRole: "student",
  menu: [],
  cart: {},
  forecast: null,
  managerOrders: [],
  offlineSales: [],
  settings: { weather: "Rainy", event: "Exam day" },
  eventSchedule: [
    { id: 1, title: "Cultural Fest", date: new Date().toISOString().split("T")[0], time: "12:30", impact: "High" },
    { id: 2, title: "Exam Hall Setup", date: new Date(Date.now() + 86400000).toISOString().split("T")[0], time: "11:00", impact: "Medium" }
  ]
};

const DEMO_MENU = [
  { id: "m1", name: "Veg Meals", category: "Meals", price: 90, available: 180, tags: ["veg", "lunch"], popularity: 0.92 },
  { id: "m2", name: "Paneer Rice Bowl", category: "Meals", price: 120, available: 90, tags: ["veg", "protein"], popularity: 0.85 },
  { id: "m3", name: "Chicken Rice", category: "Meals", price: 140, available: 75, tags: ["non_veg"], popularity: 0.8 },
  { id: "m4", name: "Masala Dosa", category: "Snacks", price: 55, available: 140, tags: ["veg", "breakfast"], popularity: 0.88 },
  { id: "m5", name: "Idli Sambar", category: "Snacks", price: 45, available: 160, tags: ["veg", "breakfast"], popularity: 0.9 },
  { id: "m6", name: "Fresh Lemon Juice", category: "Beverage", price: 35, available: 200, tags: ["drink"], popularity: 0.72 }
];

const DEMO_ORDERS = [
  { token: 104, items: [{ name: "Veg Meals", quantity: 1 }], pickupSlot: "12:30 - 12:45", total: 90, status: "Confirmed" },
  { token: 105, items: [{ name: "Masala Dosa", quantity: 2 }], pickupSlot: "12:45 - 1:00", total: 110, status: "Ready" }
];

const DEMO_OFFLINE_SALES = [
  { token: 889, name: "Idli Sambar", quantity: 12, amount: 540 },
  { token: 890, name: "Fresh Lemon Juice", quantity: 8, amount: 280 }
];

const DEMO_FORECAST = {
  attendance: { present: 1620, total: 2000 },
  weather: "Rainy",
  event: "Exam day",
  totalOnlineOrders: 610,
  totalOfflineTransactions: 374,
  wasteData: [
    { item: "Veg Meals", quantity: 28 },
    { item: "Masala Dosa", quantity: 18 },
    { item: "Idli Sambar", quantity: 22 },
    { item: "Fresh Lemon Juice", quantity: 12 }
  ],
  results: [
    { item: "Veg Meals", online: 210, offline: 125, confirmed: 160, forecast: 410, recommended: 420, confidence: 92 },
    { item: "Masala Dosa", online: 145, offline: 90, confirmed: 110, forecast: 300, recommended: 320, confidence: 88 },
    { item: "Idli Sambar", online: 130, offline: 95, confirmed: 180, forecast: 315, recommended: 330, confidence: 90 },
    { item: "Fresh Lemon Juice", online: 90, offline: 64, confirmed: 150, forecast: 230, recommended: 240, confidence: 84 }
  ]
};

const resolveApiUrl = (url) => {
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (location.protocol === "file:") return url.replace(/^\//, "");
  return url;
};

const demoApi = (url, options = {}) => {
  const method = (options.method || "GET").toUpperCase();
  const body = options.body ? JSON.parse(options.body) : null;

  if (url === "/api/auth/login") {
    const role = body.role || "student";
    const email = body.email || "student@canteeniq.local";
    const demoUser = {
      id: role === "student" ? "stu-101" : "mgr-01",
      name: role === "student" ? "Aarav Sharma" : "Meera Nair",
      email,
      role,
      preferences: role === "student"
        ? { dietary: "vegetarian", favoriteTags: ["veg", "lunch"], favoriteItems: ["m1", "m5"] }
        : { dietary: "not_specified", favoriteTags: ["demand", "sales"], favoriteItems: ["m1", "m3"] }
    };
    return { token: `${role}-demo-token`, user: demoUser };
  }

  if (url === "/api/me") {
    return { user: state.user || { id: "stu-101", name: "Aarav Sharma", email: "student@canteeniq.local", role: "student", preferences: { dietary: "vegetarian", favoriteTags: ["veg", "lunch"], favoriteItems: ["m1", "m5"] } } };
  }

  if (url === "/api/menu") {
    return { menu: state.menu.length ? state.menu : DEMO_MENU };
  }

  if (url === "/api/orders") {
    const order = {
      token: 200 + DEMO_ORDERS.length,
      pickupSlot: body.pickupSlot || "12:30 - 12:45",
      total: body.items.reduce((sum, item) => {
        const menuItem = state.menu.find(m => m.id === item.menuId) || DEMO_MENU.find(m => m.id === item.menuId);
        return sum + (menuItem ? menuItem.price * item.quantity : 0);
      }, 0),
      status: "Confirmed",
      items: body.items.map(item => {
        const menuItem = state.menu.find(m => m.id === item.menuId) || DEMO_MENU.find(m => m.id === item.menuId);
        return { name: menuItem ? menuItem.name : "Item", quantity: item.quantity };
      })
    };
    DEMO_ORDERS.unshift(order);
    return { order };
  }

  if (url === "/api/orders/mine") {
    return { orders: DEMO_ORDERS };
  }

  if (url === "/api/student/preferences") {
    state.user.preferences = {
      dietary: body.dietary,
      favoriteTags: body.favoriteTags || [],
      favoriteItems: body.favoriteItems || []
    };
    return { user: state.user };
  }

  if (url === "/api/forecast") {
    return DEMO_FORECAST;
  }

  if (url === "/api/settings") {
    if (method === "PUT") {
      state.settings = { ...state.settings, weather: body.weather, event: body.event };
      return { settings: state.settings };
    }
    return { settings: state.settings };
  }

  if (url === "/api/attendance") {
    state.forecast = state.forecast || { ...DEMO_FORECAST };
    state.forecast.attendance = {
      present: Number(body.presentStudents || state.forecast.attendance.present),
      total: Number(body.totalStudents || state.forecast.attendance.total)
    };
    return { ok: true };
  }

  if (url === "/api/offline-sales") {
    const menuItem = state.menu.find(m => m.id === body.menuId) || DEMO_MENU.find(m => m.id === body.menuId);
    const sale = {
      token: 900 + DEMO_OFFLINE_SALES.length,
      name: menuItem ? menuItem.name : "Item",
      quantity: Number(body.quantity || 1),
      amount: menuItem ? menuItem.price * Number(body.quantity || 1) : 0
    };
    DEMO_OFFLINE_SALES.unshift(sale);
    return { ok: true };
  }

  if (url === "/api/manager/orders") {
    return { orders: DEMO_ORDERS };
  }

  if (url === "/api/manager/offline-sales") {
    return { sales: DEMO_OFFLINE_SALES };
  }

  if (url.startsWith("/api/menu/")) {
    const id = url.split("/").pop();
    const nextMenu = (state.menu.length ? state.menu : DEMO_MENU).filter(m => m.id !== id);
    state.menu = nextMenu;
    return { ok: true };
  }

  if (url === "/api/menu" && method === "POST") {
    const item = {
      id: `m${Date.now()}`,
      name: body.name,
      category: body.category,
      price: Number(body.price || 0),
      available: Number(body.available || 0),
      popularity: body.popularity || 0.5,
      tags: body.tags || ["veg"]
    };
    state.menu = [...(state.menu.length ? state.menu : DEMO_MENU), item];
    return { menu: state.menu };
  }

  return {};
};

const api = async (url, options = {}) => {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (state.token) headers.Authorization = `Bearer ${state.token}`;

  if (location.protocol === "file:") {
    const demoResponse = demoApi(url, { ...options, headers });
    if (demoResponse && Object.keys(demoResponse).length) return demoResponse;
  }

  try {
    const res = await fetch(resolveApiUrl(url), { ...options, headers });
    const text = await res.text();
    const data = text ? JSON.parse(text) : {};
    if (!res.ok) throw new Error(data.error || "Request failed");
    return data;
  } catch (error) {
    const demoResponse = demoApi(url, { ...options, headers });
    if (demoResponse && Object.keys(demoResponse).length) return demoResponse;
    throw error;
  }
};

const money = n => `₹${Number(n).toLocaleString("en-IN")}`;

function logout() {
  localStorage.removeItem("canteeniq_token");
  state.token = null;
  state.user = null;
  render();
}

async function bootstrap() {
  if (!state.token) return render();
  try {
    const me = await api("/api/me");
    state.user = me.user;
    render();
  } catch {
    logout();
  }
}

function render() {
  if (!state.user) return renderLanding();
  if (state.user.role === "student") return renderStudentShell();
  return renderManagerShell();
}

function renderLanding() {
  app.innerHTML = `
    <div class="landing-shell">
      <div class="pitch-hero">
        <div class="pitch-copy">
          <div class="kicker">SMART CAMPUS CANTEEN</div>
          <h1>Predict demand.<br><span class="lime">Pre-order smarter.</span><br>Cut waste.</h1>
          <p class="muted">
            CanteenIQ helps colleges and cafeteria managers match food prep with real attendance,
            live student orders, and changing demand signals to reduce waste and prevent stockouts.
          </p>
          <div class="toolbar" style="margin-top:22px">
            <span class="badge lime">AI FORECAST</span>
            <span class="badge orange">LIVE PRE-ORDERS</span>
            <span class="badge">REAL-TIME ATTENDANCE</span>
          </div>
          <div class="stats-strip">
            <div class="mini-stat">
              <strong>32%</strong>
              <span>less waste</span>
            </div>
            <div class="mini-stat">
              <strong>1,620</strong>
              <span>students tracked</span>
            </div>
            <div class="mini-stat">
              <strong>4.9/5</strong>
              <span>canteen experience</span>
            </div>
          </div>
        </div>

        <div class="pitch-panel">
          <div class="panel-topline">Daily prediction engine</div>
          <div class="panel-metric">
            <span class="metric-label">Expected lunch demand</span>
            <strong>1,130</strong>
          </div>
          <div class="panel-grid">
            <div class="metric-box green">
              <span>Meals</span>
              <strong>420</strong>
            </div>
            <div class="metric-box orange">
              <span>Dosa</span>
              <strong>320</strong>
            </div>
            <div class="metric-box blue">
              <span>Juice</span>
              <strong>240</strong>
            </div>
            <div class="metric-box slate">
              <span>Confidence</span>
              <strong>92%</strong>
            </div>
          </div>
        </div>
      </div>

      <div class="feature-grid">
        <div class="feature-card">
          <div class="feature-icon">01</div>
          <h3>Attendance-aware forecasting</h3>
          <p>First-hour attendance is combined with historical trends, weather, and event data for smarter prep planning.</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon">02</div>
          <h3>Student pre-ordering</h3>
          <p>Students reserve meals before lunch and lock in their preferred slot, creating a real demand signal for the kitchen.</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon">03</div>
          <h3>Live kitchen dashboard</h3>
          <p>Managers receive clear production recommendations and can adjust quickly if demand spikes or falls.</p>
        </div>
      </div>

      <div class="login-card">
        <div class="login-side">
          <div class="kicker">CANTEENIQ</div>
          <h1>Predict.<br><span style="color:var(--lime)">Pre-order.</span><br>Waste less.</h1>
          <p class="muted">A demo-ready smart canteen platform connecting attendance, student orders, offline sales, weather context and food-demand forecasting.</p>
          <div class="toolbar" style="margin-top:22px">
            <span class="badge lime">AI DEMAND</span>
            <span class="badge orange">PRE-ORDER</span>
            <span class="badge">BILL / TOKEN</span>
          </div>
        </div>
        <div class="login-form">
          <div class="role-switch">
            <button id="studentRole" class="${state.loginRole === "student" ? "active":""}">Student / User</button>
            <button id="managerRole" class="${state.loginRole === "manager" ? "active":""}">Canteen Management</button>
          </div>
          <h2 style="font-family:'Space Grotesk';margin:0 0 5px">${state.loginRole === "student" ? "Student login" : "Manager login"}</h2>
          <div class="small">Use the demo credentials below.</div>
          <div id="loginError"></div>
          <label>Email</label>
          <input id="loginEmail" value="${state.loginRole === "student" ? "student@canteeniq.local" : "manager@canteeniq.local"}">
          <label>Password</label>
          <input id="loginPassword" type="password" value="${state.loginRole === "student" ? "student123" : "manager123"}">
          <button id="loginBtn" class="primary" style="width:100%;margin-top:18px">Sign in</button>
          <div class="small" style="margin-top:16px">
            Student: student@canteeniq.local / student123<br>
            Manager: manager@canteeniq.local / manager123
          </div>
        </div>
      </div>
    </div>
  `;
  document.getElementById("studentRole").onclick = () => { state.loginRole = "student"; render(); };
  document.getElementById("managerRole").onclick = () => { state.loginRole = "manager"; render(); };
  document.getElementById("loginBtn").onclick = login;
}

async function login() {
  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;
  const err = document.getElementById("loginError");
  err.innerHTML = "";
  try {
    const data = await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password, role: state.loginRole })
    });
    state.token = data.token;
    state.user = data.user;
    localStorage.setItem("canteeniq_token", state.token);
    render();
  } catch (e) {
    err.innerHTML = `<div class="error">${e.message}</div>`;
  }
}

function topbar(active) {
  const links = state.user.role === "student"
    ? `<button data-nav="student">Menu</button><button data-nav="orders">My Orders</button><button data-nav="profile">Profile</button>`
    : `<button data-nav="dashboard">Dashboard</button><button data-nav="sales">Sales</button><button data-nav="menu">Menu</button>`;
  return `<div class="topbar"><div class="container inner">
    <div class="brand">Canteen<span>IQ</span></div>
    <div class="nav">${links}<button id="logoutBtn">Logout</button></div>
  </div></div>`;
}

function shellContent(inner) {
  return `<div>${topbar()}<main class="container layout">${inner}</main></div>`;
}

async function renderStudentShell() {
  try {
    const menu = await api("/api/menu");
    state.menu = menu.menu;
  } catch {}
  const recommended = state.menu.filter(m => (state.user.preferences?.favoriteItems || []).includes(m.id));
  app.innerHTML = shellContent(`
    <div class="hero">
      <div>
        <div class="kicker">STUDENT / USER</div>
        <h1>Lunch without the<br><span class="lime">waiting.</span></h1>
        <p>Pre-order your food, choose a pickup slot, get a digital token and help the canteen prepare closer to real demand.</p>
        <div class="toolbar" style="margin-top:18px">
          <span class="badge lime">OPT-IN PERSONALIZATION</span>
          <span class="badge">DIGITAL TOKEN</span>
          <span class="badge">PICKUP SLOT</span>
        </div>
      </div>
      <div class="hero-card">
        <div class="small">YOUR PROFILE</div>
        <h3 style="font-family:'Space Grotesk';font-size:24px;margin:8px 0">${state.user.name}</h3>
        <div class="stat"><div class="value">${state.user.preferences?.dietary || "Not set"}</div><div class="label">Dietary preference</div></div>
        <div class="small" style="margin-top:12px">Your order history can power one-tap reorder and better aggregate demand forecasts.</div>
      </div>
    </div>
    <div class="section-title"><div><h2>Today's menu</h2><p>Choose quantities and place a pre-order.</p></div><button class="ghost" id="openOrders">View my orders</button></div>
    <div id="studentMessage"></div>
    <div class="menu-grid" id="menuGrid"></div>
    <div class="card" style="margin-top:20px">
      <div class="section-title" style="margin-top:0"><div><h2>Your cart</h2><p>Pickup at the canteen counter.</p></div><div class="price" id="cartTotal">₹0</div></div>
      <div id="cartItems" class="grid"></div>
      <div class="toolbar" style="margin-top:15px">
        <label style="margin:0;width:220px">Pickup slot
          <select id="pickupSlot"><option>12:15 - 12:30</option><option selected>12:30 - 12:45</option><option>12:45 - 1:00</option><option>1:00 - 1:15</option></select>
        </label>
        <button class="primary right" id="placeOrder">Place pre-order</button>
      </div>
    </div>
  `);
  wireTopbar();
  document.getElementById("openOrders").onclick = () => studentOrders();
  renderMenuCards();
  renderCart();
  document.getElementById("placeOrder").onclick = placeOrder;
}

function renderMenuCards() {
  const box = document.getElementById("menuGrid");
  box.innerHTML = state.menu.map(m => `
    <div class="card menu-card">
      <div>
        <div class="toolbar"><span class="badge">${m.category}</span>${m.tags?.includes("veg") ? '<span class="badge lime">VEG</span>' : '<span class="badge orange">NON-VEG</span>'}</div>
        <h3 style="margin-top:13px">${m.name}</h3>
        <div class="muted small">Available: ${m.available}</div>
      </div>
      <div class="toolbar" style="margin-top:18px">
        <div class="price">${money(m.price)}</div>
        <button class="primary right" data-add="${m.id}">Add</button>
      </div>
    </div>
  `).join("");
  box.querySelectorAll("[data-add]").forEach(btn => btn.onclick = () => {
    const id = btn.dataset.add;
    state.cart[id] = (state.cart[id] || 0) + 1;
    renderCart();
  });
}

function renderCart() {
  const box = document.getElementById("cartItems");
  const ids = Object.keys(state.cart).filter(id => state.cart[id] > 0);
  let total = 0;
  if (!ids.length) {
    box.innerHTML = `<div class="small">Your cart is empty.</div>`;
  } else {
    box.innerHTML = ids.map(id => {
      const m = state.menu.find(x => x.id === id);
      const q = state.cart[id];
      total += q * m.price;
      return `<div class="toolbar">
        <div><strong>${m.name}</strong><div class="small">${money(m.price)} each</div></div>
        <div class="qty right"><button data-minus="${id}">−</button><input value="${q}" readonly><button data-plus="${id}">+</button></div>
      </div>`;
    }).join("");
  }
  document.getElementById("cartTotal").textContent = money(total);
  box.querySelectorAll("[data-minus]").forEach(b => b.onclick = () => {
    const id=b.dataset.minus; state.cart[id]--; renderCart();
  });
  box.querySelectorAll("[data-plus]").forEach(b => b.onclick = () => {
    const id=b.dataset.plus; state.cart[id]++; renderCart();
  });
}

async function placeOrder() {
  const items = Object.entries(state.cart).filter(([_,q]) => q>0).map(([menuId,quantity])=>({menuId,quantity}));
  const msg = document.getElementById("studentMessage");
  msg.innerHTML = "";
  if (!items.length) return msg.innerHTML = `<div class="error">Add at least one item.</div>`;
  try {
    const data = await api("/api/orders", {
      method:"POST",
      body:JSON.stringify({ items, pickupSlot: document.getElementById("pickupSlot").value })
    });
    msg.innerHTML = `<div class="alert">Order confirmed. Token <strong>#${data.order.token}</strong> • ${data.order.pickupSlot} • ${money(data.order.total)}</div>`;
    state.cart = {};
    await renderStudentShell();
  } catch(e) {
    msg.innerHTML = `<div class="error">${e.message}</div>`;
  }
}

async function studentOrders() {
  const data = await api("/api/orders/mine");
  app.innerHTML = shellContent(`
    <div class="section-title"><div><h2>My orders</h2><p>Your recent pre-orders and tokens.</p></div><button class="ghost" id="backMenu">Back to menu</button></div>
    <div class="card"><table class="table"><thead><tr><th>Token</th><th>Items</th><th>Pickup</th><th>Total</th><th>Status</th></tr></thead><tbody>
      ${data.orders.map(o => `<tr><td>#${o.token}</td><td>${o.items.map(i=>`${i.name} × ${i.quantity}`).join("<br>")}</td><td>${o.pickupSlot}</td><td>${money(o.total)}</td><td><span class="badge lime">${o.status}</span></td></tr>`).join("") || `<tr><td colspan="5" class="small">No orders yet.</td></tr>`}
    </tbody></table></div>
  `);
  wireTopbar();
  document.getElementById("backMenu").onclick = () => renderStudentShell();
}

async function studentProfile() {
  app.innerHTML = shellContent(`
    <div class="section-title"><div><h2>My preferences</h2><p>These settings are optional and help personalization.</p></div></div>
    <div id="prefMessage"></div>
    <div class="card" style="max-width:680px">
      <label>Dietary preference</label>
      <select id="dietary">
        ${["not_specified","vegetarian","non_vegetarian","vegan","eggetarian","jain"].map(v=>`<option ${state.user.preferences?.dietary===v?"selected":""}>${v}</option>`).join("")}
      </select>
      <label>Favorite tags (comma separated)</label>
      <input id="favoriteTags" value="${(state.user.preferences?.favoriteTags||[]).join(", ")}" placeholder="veg, beverage, lunch">
      <label>Favorite menu IDs (comma separated)</label>
      <input id="favoriteItems" value="${(state.user.preferences?.favoriteItems||[]).join(", ")}" placeholder="m1, m5">
      <button class="primary" style="margin-top:16px" id="savePrefs">Save preferences</button>
    </div>
  `);
  wireTopbar();
  document.getElementById("savePrefs").onclick = async () => {
    const data = await api("/api/student/preferences", {
      method:"PUT",
      body:JSON.stringify({
        dietary: document.getElementById("dietary").value,
        favoriteTags: document.getElementById("favoriteTags").value.split(",").map(x=>x.trim()).filter(Boolean),
        favoriteItems: document.getElementById("favoriteItems").value.split(",").map(x=>x.trim()).filter(Boolean)
      })
    });
    state.user=data.user;
    document.getElementById("prefMessage").innerHTML=`<div class="alert">Preferences saved.</div>`;
  };
}

function wireTopbar(){
  document.querySelectorAll("[data-nav]").forEach(btn=>btn.onclick=()=>{
    const n=btn.dataset.nav;
    if(n==="student") renderStudentShell();
    else if(n==="orders") studentOrders();
    else if(n==="profile") studentProfile();
    else if(n==="dashboard") managerDashboard();
    else if(n==="sales") managerSales();
    else if(n==="menu") managerMenu();
  });
  document.getElementById("logoutBtn").onclick=logout;
}

async function renderManagerShell() {
  await managerDashboard();
}

async function managerDashboard() {
  try {
    const [forecast, settings] = await Promise.all([api("/api/forecast"), api("/api/settings")]);
    state.forecast = forecast;
    state.settings = settings.settings;
  } catch(e) {
    app.innerHTML = shellContent(`<div class="error">${e.message}</div>`);
    wireTopbar();
    return;
  }
  const f=state.forecast;
  const trend = getDemandTrendData();
  const eventSummary = state.eventSchedule.slice(0, 3).map(event => `
    <div class="event-pill ${event.impact.toLowerCase()}">
      <div>
        <strong>${event.title}</strong>
        <span>${event.date} • ${event.time}</span>
      </div>
      <em>${event.impact}</em>
    </div>
  `).join("");
  app.innerHTML = shellContent(`
    <div class="hero">
      <div>
        <div class="kicker">CANTEEN MANAGEMENT</div>
        <h1>Know the demand<br>before <span class="lime">prep.</span></h1>
        <p>Use first-hour attendance, online pre-orders, offline bills, weather context and historical behavior to create an item-level preparation plan.</p>
      </div>
      <div class="hero-card">
        <div class="toolbar"><span class="badge lime">LIVE FORECAST</span><span class="badge">${f.weather}</span><span class="badge">${f.event}</span></div>
        <div class="grid grid-2" style="margin-top:14px">
          <div class="stat"><div class="value">${f.attendance.present}</div><div class="label">Present</div></div>
          <div class="stat"><div class="value">${f.totalOnlineOrders}</div><div class="label">Online orders</div></div>
          <div class="stat"><div class="value">${f.totalOfflineTransactions}</div><div class="label">Offline transactions</div></div>
          <div class="stat"><div class="value">${f.results.reduce((s,r)=>s+r.forecast,0)}</div><div class="label">Forecast portions</div></div>
        </div>
      </div>
    </div>
    <div class="section-title"><div><h2>Manager dashboard</h2><p>Food-wise recommendation for today's demand.</p></div></div>
    <div class="card">
      <table class="table"><thead><tr><th>Food</th><th>Online</th><th>Offline</th><th>Confirmed</th><th>Forecast</th><th>Prepare</th><th>Confidence</th></tr></thead>
      <tbody>${f.results.map(r=>`<tr>
        <td><strong>${r.item}</strong></td><td>${r.online}</td><td>${r.offline}</td><td>${r.confirmed}</td><td>${r.forecast}</td><td><strong style="color:var(--lime)">${r.recommended}</strong></td><td>${r.confidence}%</td>
      </tr>`).join("")}</tbody></table>
    </div>
    <div class="dashboard-grid" style="margin-top:18px">
      <div class="card">
        <div class="section-title" style="margin-top:0"><div><h3 style="margin:0">Demand trend</h3></div></div>
        ${renderDemandChart()}
        <div class="chart-legend"><span>Projected demand</span><strong>${trend[trend.length - 1]} portions</strong></div>
      </div>
      <div class="card">
        <div class="section-title" style="margin-top:0"><div><h3 style="margin:0">Event calendar</h3></div><span class="badge lime">Surge monitor</span></div>
        <div class="event-form">
          <label>Event title</label>
          <input id="eventTitle" placeholder="Fest, seminar, sports meet" />
          <div class="form-row">
            <div>
              <label>Date</label>
              <input id="eventDate" type="date" value="${new Date().toISOString().split("T")[0]}" />
            </div>
            <div>
              <label>Time</label>
              <input id="eventTime" type="time" value="12:30" />
            </div>
          </div>
          <label>Impact level</label>
          <select id="eventImpact">
            <option value="Low">Low</option>
            <option value="Medium" selected>Medium</option>
            <option value="High">High</option>
          </select>
          <button class="primary" style="margin-top:12px" id="saveEventBtn">Add event</button>
        </div>
        <div class="event-list">${eventSummary}</div>
      </div>
    </div>
    <div class="card" style="margin-top:18px">
      <div class="section-title" style="margin-top:0"><div><h3 style="margin:0">Waste tracking</h3></div><span class="badge orange">Model learning</span></div>
      <div id="wasteMsg"></div>
      <div class="form-row">
        <div>
          <label>Food item</label>
          <select id="wasteItem">
            ${DEMO_MENU.map(m => `<option value="${m.name}">${m.name}</option>`).join("")}
          </select>
        </div>
        <div>
          <label>Wasted quantity</label>
          <input id="wasteQty" type="number" min="1" value="10" />
        </div>
      </div>
      <button class="primary" style="margin-top:12px" id="saveWasteBtn">Save wasted food</button>
      <div class="waste-summary" style="margin-top:14px">
        <strong>Today's waste captured:</strong>
        <span>${(DEMO_FORECAST.wasteData || []).reduce((sum, item) => sum + item.quantity, 0)} portions</span>
      </div>
    </div>
    <div class="grid grid-3" style="margin-top:18px">
      <div class="card"><div class="small">Update attendance</div><button class="primary" style="margin-top:10px" id="openAttendance">Record first-hour attendance</button></div>
      <div class="card"><div class="small">Record offline purchase</div><button class="primary" style="margin-top:10px" id="openOffline">Add bill / token sale</button></div>
      <div class="card"><div class="small">Context inputs</div><button class="primary" style="margin-top:10px" id="openContext">Update weather / event</button></div>
    </div>
  `);
  wireTopbar();
  document.getElementById("openAttendance").onclick = showAttendanceForm;
  document.getElementById("openOffline").onclick = showOfflineForm;
  document.getElementById("openContext").onclick = showContextForm;
  document.getElementById("saveEventBtn").onclick = saveCalendarEvent;
  document.getElementById("saveWasteBtn").onclick = recordWasteData;
}

function showAttendanceForm(){
  app.innerHTML = shellContent(`
    <div class="section-title"><div><h2>First-hour attendance</h2><p>This becomes one of the strongest signals before lunch/snacks.</p></div></div>
    <div id="aMsg"></div>
    <div class="card" style="max-width:650px">
      <div class="form-row">
        <div><label>Total students</label><input id="totalStudents" type="number" value="2000"></div>
        <div><label>Present students</label><input id="presentStudents" type="number" value="1620"></div>
      </div>
      <button class="primary" style="margin-top:16px" id="saveAttendance">Save attendance</button>
    </div>
  `);
  wireTopbar();
  document.getElementById("saveAttendance").onclick=async()=>{
    try{
      await api("/api/attendance",{method:"POST",body:JSON.stringify({
        totalStudents:Number(document.getElementById("totalStudents").value),
        presentStudents:Number(document.getElementById("presentStudents").value)
      })});
      document.getElementById("aMsg").innerHTML=`<div class="alert">Attendance saved. Forecast will update.</div>`;
    }catch(e){document.getElementById("aMsg").innerHTML=`<div class="error">${e.message}</div>`}
  }
}

function showOfflineForm(){
  app.innerHTML = shellContent(`
    <div class="section-title"><div><h2>Record offline bill / token</h2><p>Capture what was actually purchased at the counter.</p></div></div>
    <div id="oMsg"></div>
    <div class="card" style="max-width:650px">
      <label>Food item</label>
      <select id="offlineMenu">${state.menu.map(m=>`<option value="${m.id}">${m.name} — ${money(m.price)}</option>`).join("")}</select>
      <label>Quantity</label><input id="offlineQty" type="number" min="1" value="1">
      <button class="primary" style="margin-top:16px" id="saveOffline">Record sale</button>
    </div>
  `);
  wireTopbar();
  document.getElementById("saveOffline").onclick=async()=>{
    try{
      await api("/api/offline-sales",{method:"POST",body:JSON.stringify({
        menuId:document.getElementById("offlineMenu").value,
        quantity:Number(document.getElementById("offlineQty").value)
      })});
      document.getElementById("oMsg").innerHTML=`<div class="alert">Offline sale recorded.</div>`;
    }catch(e){document.getElementById("oMsg").innerHTML=`<div class="error">${e.message}</div>`}
  }
}

function getDemandTrendData() {
  const base = [360, 420, 390, 520, 600, 580, 640];
  const wasteAdjustment = (DEMO_FORECAST.wasteData || []).reduce((sum, item) => sum + item.quantity, 0) * 0.35;
  const surgeBoost = state.eventSchedule.reduce((total, event) => {
    const eventDate = new Date(`${event.date}T${event.time || "12:00"}:00`);
    const today = new Date();
    const diffHours = Math.abs(eventDate.getTime() - today.getTime()) / 3600000;
    if (diffHours <= 24) {
      if (event.impact === "High") return total + 180;
      if (event.impact === "Medium") return total + 90;
      return total + 45;
    }
    return total;
  }, 0);

  return base.map((value, index) => {
    const eventFactor = index === 6 ? Math.min(surgeBoost, 220) : 0;
    const wasteFactor = index >= 5 ? Math.round(wasteAdjustment / 3) : 0;
    return value + eventFactor + wasteFactor;
  });
}

function renderDemandChart() {
  const values = getDemandTrendData();
  const max = Math.max(...values, 1);
  const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return `
    <div class="chart-shell">
      <div class="chart-grid">
        ${values.map((value, index) => `
          <div class="bar-col">
            <div class="bar-wrap">
              <div class="bar" style="height:${Math.max((value / max) * 100, 18)}%"></div>
            </div>
            <span>${labels[index]}</span>
            <small>${value}</small>
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

function saveCalendarEvent() {
  const title = document.getElementById("eventTitle").value.trim() || "New event";
  const date = document.getElementById("eventDate").value || new Date().toISOString().split("T")[0];
  const time = document.getElementById("eventTime").value || "12:00";
  const impact = document.getElementById("eventImpact").value || "Medium";

  state.eventSchedule.unshift({
    id: Date.now(),
    title,
    date,
    time,
    impact
  });

  managerDashboard();
}

async function recordWasteData() {
  const item = document.getElementById("wasteItem").value;
  const quantity = Number(document.getElementById("wasteQty").value || 0);

  if (!item || quantity <= 0) {
    document.getElementById("wasteMsg").innerHTML = '<div class="error">Select an item and enter a valid wasted quantity.</div>';
    return;
  }

  const existing = (DEMO_FORECAST.wasteData || []).find(w => w.item === item);
  if (existing) {
    existing.quantity += quantity;
  } else {
    DEMO_FORECAST.wasteData.push({ item, quantity });
  }

  const forecastResult = DEMO_FORECAST.results.find(r => r.item === item);
  if (forecastResult) {
    forecastResult.recommended = Math.max(forecastResult.recommended - Math.floor(quantity / 2), 0);
    forecastResult.forecast = Math.max(forecastResult.forecast - Math.floor(quantity / 2), 0);
    forecastResult.confidence = Math.min(98, forecastResult.confidence + 1);
  }

  document.getElementById("wasteMsg").innerHTML = '<div class="alert">Wastage data saved. Model will adjust future forecast recommendations.</div>';
  managerDashboard();
}

function showContextForm(){
  const current=state.settings||{weather:"Clear",event:"Normal day"};
  app.innerHTML = shellContent(`
    <div class="section-title"><div><h2>Context inputs</h2><p>Weather and college events can shift demand patterns.</p></div></div>
    <div id="cMsg"></div>
    <div class="card" style="max-width:650px">
      <label>Weather</label>
      <select id="weather">${["Clear","Hot / Sunny","Rainy","Cool / Cloudy"].map(v=>`<option ${current.weather===v?"selected":""}>${v}</option>`).join("")}</select>
      <label>College event</label>
      <select id="event">${["Normal day","Exam day","Sports event","Cultural event","Half day"].map(v=>`<option ${current.event===v?"selected":""}>${v}</option>`).join("")}</select>
      <button class="primary" style="margin-top:16px" id="saveContext">Save context</button>
    </div>
  `);
  wireTopbar();
  document.getElementById("saveContext").onclick=async()=>{
    try{
      const data=await api("/api/settings",{method:"PUT",body:JSON.stringify({
        weather:document.getElementById("weather").value,
        event:document.getElementById("event").value
      })});
      state.settings=data.settings;
      document.getElementById("cMsg").innerHTML=`<div class="alert">Context updated. Return to dashboard to see the new forecast.</div>`;
    }catch(e){document.getElementById("cMsg").innerHTML=`<div class="error">${e.message}</div>`}
  }
}

async function managerSales(){
  const [orders, sales]=await Promise.all([api("/api/manager/orders"), api("/api/manager/offline-sales")]);
  app.innerHTML=shellContent(`
    <div class="section-title"><div><h2>Today's sales</h2><p>Online orders and offline bills / tokens in one place.</p></div></div>
    <div class="grid grid-2">
      <div class="card"><div class="section-title" style="margin-top:0"><div><h3 style="margin:0">Online pre-orders</h3></div><span class="badge lime">${orders.orders.length}</span></div>
        <table class="table"><thead><tr><th>Token</th><th>Items</th><th>Total</th></tr></thead>
        <tbody>${orders.orders.map(o=>`<tr><td>#${o.token}</td><td>${o.items.map(i=>`${i.name} × ${i.quantity}`).join("<br>")}</td><td>${money(o.total)}</td></tr>`).join("") || `<tr><td colspan="3" class="small">No orders.</td></tr>`}</tbody></table>
      </div>
      <div class="card"><div class="section-title" style="margin-top:0"><div><h3 style="margin:0">Offline bills / tokens</h3></div><span class="badge orange">${sales.sales.length}</span></div>
        <table class="table"><thead><tr><th>Token</th><th>Item</th><th>Qty</th><th>Amount</th></tr></thead>
        <tbody>${sales.sales.map(s=>`<tr><td>#${s.token}</td><td>${s.name}</td><td>${s.quantity}</td><td>${money(s.amount)}</td></tr>`).join("") || `<tr><td colspan="4" class="small">No offline sales.</td></tr>`}</tbody></table>
      </div>
    </div>
  `);
  wireTopbar();
}

async function managerMenu(){
  const data=await api("/api/menu"); state.menu=data.menu;
  app.innerHTML=shellContent(`
    <div class="section-title"><div><h2>Menu management</h2><p>Add items, set availability and tune popularity for the demo model.</p></div></div>
    <div id="mMsg"></div>
    <div class="card">
      <div class="grid grid-4">
        <div><label>Name</label><input id="mn" placeholder="Paneer Roll"></div>
        <div><label>Category</label><input id="mc" placeholder="Snacks"></div>
        <div><label>Price</label><input id="mp" type="number" placeholder="45"></div>
        <div><label>Available</label><input id="ma" type="number" placeholder="120"></div>
      </div>
      <button class="primary" style="margin-top:15px" id="addMenu">Add item</button>
    </div>
    <div class="card" style="margin-top:18px"><table class="table"><thead><tr><th>Name</th><th>Category</th><th>Price</th><th>Available</th><th></th></tr></thead>
    <tbody>${state.menu.map(m=>`<tr><td>${m.name}</td><td>${m.category}</td><td>${money(m.price)}</td><td>${m.available}</td><td><button class="danger" data-del="${m.id}">Delete</button></td></tr>`).join("")}</tbody></table></div>
  `);
  wireTopbar();
  document.getElementById("addMenu").onclick=async()=>{
    try{
      await api("/api/menu",{method:"POST",body:JSON.stringify({
        name:document.getElementById("mn").value,
        category:document.getElementById("mc").value,
        price:Number(document.getElementById("mp").value),
        available:Number(document.getElementById("ma").value),
        popularity:0.5,tags:["veg"]
      })});
      document.getElementById("mMsg").innerHTML=`<div class="alert">Menu item added.</div>`;
      managerMenu();
    }catch(e){document.getElementById("mMsg").innerHTML=`<div class="error">${e.message}</div>`}
  };
  document.querySelectorAll("[data-del]").forEach(btn=>btn.onclick=async()=>{
    if(!confirm("Delete this item?")) return;
    await api(`/api/menu/${btn.dataset.del}`,{method:"DELETE"});
    managerMenu();
  });
}

bootstrap();
