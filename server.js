const express = require("express");
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "canteeniq-demo-secret-change-this";
const DATA_DIR = path.join(__dirname, "data");
const DB_FILE = path.join(DATA_DIR, "db.json");

app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

function isoNow() {
  return new Date().toISOString();
}

function ensureDb() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (fs.existsSync(DB_FILE)) return;

  const seed = {
    users: [],
    menu: [
      { id: "m1", name: "Veg Meals", category: "Lunch", price: 70, available: 300, popularity: 0.82, tags: ["veg", "lunch"] },
      { id: "m2", name: "Chicken Rice", category: "Lunch", price: 110, available: 180, popularity: 0.64, tags: ["nonveg", "lunch"] },
      { id: "m3", name: "Dosa", category: "Breakfast", price: 35, available: 160, popularity: 0.72, tags: ["veg", "breakfast"] },
      { id: "m4", name: "Fried Rice", category: "Lunch", price: 80, available: 140, popularity: 0.58, tags: ["veg", "lunch"] },
      { id: "m5", name: "Tea", category: "Snacks", price: 15, available: 500, popularity: 0.88, tags: ["veg", "beverage"] },
      { id: "m6", name: "Samosa", category: "Snacks", price: 20, available: 240, popularity: 0.66, tags: ["veg", "snack"] },
      { id: "m7", name: "Fresh Lime", category: "Beverage", price: 30, available: 220, popularity: 0.54, tags: ["veg", "beverage"] }
    ],
    orders: [],
    offlineSales: [],
    attendance: [
      { id: "a1", date: new Date().toISOString().slice(0, 10), totalStudents: 2000, presentStudents: 1620, recordedAt: isoNow() }
    ],
    waste: [],
    settings: {
      weather: "Clear",
      event: "Normal day"
    }
  };

  const studentPassword = bcrypt.hashSync("student123", 10);
  const managerPassword = bcrypt.hashSync("manager123", 10);

  seed.users.push(
    {
      id: "u1",
      name: "Demo Student",
      email: "student@canteeniq.local",
      passwordHash: studentPassword,
      role: "student",
      preferences: {
        dietary: "vegetarian",
        favoriteTags: ["veg", "beverage"],
        favoriteItems: ["m1", "m5"]
      }
    },
    {
      id: "u2",
      name: "Canteen Manager",
      email: "manager@canteeniq.local",
      passwordHash: managerPassword,
      role: "manager",
      preferences: {}
    }
  );

  writeDb(seed);
}

function readDb() {
  ensureDb();
  return JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
}

function writeDb(db) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

function auth(req, res, next) {
  const hdr = req.headers.authorization || "";
  const token = hdr.startsWith("Bearer ") ? hdr.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Login required." });

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "Session expired. Please login again." });
  }
}

function role(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: "You do not have permission for this action." });
    }
    next();
  };
}

function avg(arr) {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function dayFactor() {
  const d = new Date().getDay();
  const map = { 0: 0.35, 1: 1.0, 2: 1.03, 3: 1.02, 4: 1.05, 5: 1.08, 6: 0.55 };
  return map[d] || 1;
}

function weatherFactor(weather, tags) {
  const t = (weather || "").toLowerCase();
  const set = new Set(tags || []);
  if (t.includes("rain")) {
    if (set.has("snack") || set.has("beverage")) return 1.18;
    if (set.has("lunch")) return 0.97;
  }
  if (t.includes("hot") || t.includes("sun")) {
    if (set.has("beverage")) return 1.22;
    if (set.has("lunch")) return 0.95;
  }
  return 1;
}

function calculateForecast(db) {
  const latestAttendance = db.attendance[db.attendance.length - 1] || { totalStudents: 0, presentStudents: 0 };
  const present = Number(latestAttendance.presentStudents || 0);

  const online = db.orders.filter(o => o.date === new Date().toISOString().slice(0,10) && o.status !== "cancelled");
  const offline = db.offlineSales.filter(o => o.date === new Date().toISOString().slice(0,10));

  const results = db.menu.map(item => {
    const itemOnline = online
      .filter(o => o.items.some(x => x.menuId === item.id))
      .reduce((sum, o) => sum + (o.items.find(x => x.menuId === item.id)?.quantity || 0), 0);

    const itemOffline = offline
      .filter(s => s.menuId === item.id)
      .reduce((sum, s) => sum + Number(s.quantity || 0), 0);

    const historical = db.orders
      .flatMap(o => o.items.filter(x => x.menuId === item.id).map(x => x.quantity))
      .concat(offline.filter(s => s.menuId === item.id).map(s => Number(s.quantity || 0)));

    const histAvg = avg(historical.slice(-60));
    const attendanceBase = present * 0.12 * item.popularity;
    const confirmed = itemOnline + itemOffline;
    const walkInBase = Math.max(0, attendanceBase - confirmed * 0.35);
    const forecast = Math.max(
      confirmed,
      Math.round((confirmed + walkInBase + histAvg * 0.18) * dayFactor() * weatherFactor(db.settings.weather, item.tags))
    );
    const safety = Math.max(2, Math.round(forecast * 0.05));
    const recommended = forecast + safety;

    return {
      menuId: item.id,
      item: item.name,
      online: itemOnline,
      offline: itemOffline,
      confirmed,
      forecast,
      recommended,
      available: item.available,
      confidence: Math.min(98, Math.round(66 + item.popularity * 25))
    };
  });

  return {
    date: new Date().toISOString().slice(0,10),
    attendance: {
      total: latestAttendance.totalStudents,
      present
    },
    totalOnlineOrders: online.length,
    totalOfflineTransactions: offline.length,
    results,
    weather: db.settings.weather,
    event: db.settings.event
  };
}

function sanitizeUser(u) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    preferences: u.preferences || {}
  };
}

app.post("/api/auth/login", (req, res) => {
  const { email, password, role: requestedRole } = req.body || {};
  const db = readDb();
  const user = db.users.find(u => u.email.toLowerCase() === String(email || "").toLowerCase());
  if (!user || !bcrypt.compareSync(String(password || ""), user.passwordHash)) {
    return res.status(401).json({ error: "Invalid email or password." });
  }
  if (requestedRole && user.role !== requestedRole) {
    return res.status(403).json({ error: `Use the ${user.role} login for this account.` });
  }
  const token = jwt.sign({ id: user.id, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: "8h" });
  res.json({ token, user: sanitizeUser(user) });
});

app.get("/api/me", auth, (req, res) => {
  const db = readDb();
  const user = db.users.find(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: "User not found." });
  res.json({ user: sanitizeUser(user) });
});

app.get("/api/menu", auth, (req, res) => {
  const db = readDb();
  res.json({ menu: db.menu });
});

app.put("/api/student/preferences", auth, role("student"), (req, res) => {
  const db = readDb();
  const user = db.users.find(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: "User not found." });

  const { dietary, favoriteTags, favoriteItems } = req.body || {};
  user.preferences = {
    dietary: dietary || "not_specified",
    favoriteTags: Array.isArray(favoriteTags) ? favoriteTags.slice(0, 10) : [],
    favoriteItems: Array.isArray(favoriteItems) ? favoriteItems.slice(0, 10) : []
  };

  writeDb(db);
  res.json({ user: sanitizeUser(user) });
});

app.post("/api/orders", auth, role("student"), (req, res) => {
  const db = readDb();
  const { items, pickupSlot } = req.body || {};

  if (!Array.isArray(items) || !items.length) {
    return res.status(400).json({ error: "Select at least one food item." });
  }

  let total = 0;
  const normalizedItems = [];

  for (const raw of items) {
    const menuItem = db.menu.find(m => m.id === raw.menuId);
    const quantity = Math.max(1, Number(raw.quantity || 0));
    if (!menuItem) return res.status(400).json({ error: "Invalid menu item." });
    if (quantity > menuItem.available) {
      return res.status(400).json({ error: `${menuItem.name} does not have enough availability.` });
    }
    normalizedItems.push({
      menuId: menuItem.id,
      name: menuItem.name,
      quantity,
      price: menuItem.price
    });
    total += menuItem.price * quantity;
  }

  normalizedItems.forEach(i => {
    const menuItem = db.menu.find(m => m.id === i.menuId);
    menuItem.available -= i.quantity;
  });

  const now = new Date();
  const order = {
    id: `o_${Date.now()}`,
    token: String(Math.floor(1000 + Math.random() * 9000)),
    userId: req.user.id,
    date: now.toISOString().slice(0,10),
    createdAt: now.toISOString(),
    pickupSlot: pickupSlot || "12:30 - 12:45",
    status: "confirmed",
    items: normalizedItems,
    total
  };

  db.orders.push(order);
  writeDb(db);
  res.json({ order });
});

app.get("/api/orders/mine", auth, role("student"), (req, res) => {
  const db = readDb();
  const orders = db.orders
    .filter(o => o.userId === req.user.id)
    .sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({ orders });
});

app.get("/api/forecast", auth, role("manager"), (req, res) => {
  const db = readDb();
  res.json(calculateForecast(db));
});

app.get("/api/settings", auth, role("manager"), (req, res) => {
  const db = readDb();
  res.json({ settings: db.settings });
});

app.put("/api/settings", auth, role("manager"), (req, res) => {
  const db = readDb();
  const { weather, event } = req.body || {};
  db.settings.weather = weather || "Clear";
  db.settings.event = event || "Normal day";
  writeDb(db);
  res.json({ settings: db.settings });
});

app.post("/api/attendance", auth, role("manager"), (req, res) => {
  const db = readDb();
  const totalStudents = Math.max(0, Number(req.body.totalStudents || 0));
  const presentStudents = Math.max(0, Math.min(Number(req.body.presentStudents || 0), totalStudents));

  const row = {
    id: `a_${Date.now()}`,
    date: new Date().toISOString().slice(0,10),
    totalStudents,
    presentStudents,
    recordedAt: isoNow()
  };
  db.attendance.push(row);
  writeDb(db);
  res.json({ attendance: row });
});

app.post("/api/offline-sales", auth, role("manager"), (req, res) => {
  const db = readDb();
  const { menuId, quantity } = req.body || {};
  const menuItem = db.menu.find(m => m.id === menuId);
  const qty = Math.max(1, Number(quantity || 0));

  if (!menuItem) return res.status(400).json({ error: "Menu item not found." });
  if (qty > menuItem.available) return res.status(400).json({ error: "Not enough available quantity." });

  menuItem.available -= qty;

  const sale = {
    id: `s_${Date.now()}`,
    menuId,
    name: menuItem.name,
    quantity: qty,
    amount: qty * menuItem.price,
    date: new Date().toISOString().slice(0,10),
    createdAt: isoNow(),
    token: String(Math.floor(1000 + Math.random() * 9000))
  };

  db.offlineSales.push(sale);
  writeDb(db);
  res.json({ sale });
});

app.post("/api/waste", auth, role("manager"), (req, res) => {
  const db = readDb();
  const { menuId, quantity } = req.body || {};
  const menuItem = db.menu.find(m => m.id === menuId);
  const qty = Math.max(0, Number(quantity || 0));
  if (!menuItem) return res.status(400).json({ error: "Menu item not found." });

  const row = {
    id: `w_${Date.now()}`,
    menuId,
    name: menuItem.name,
    quantity: qty,
    date: new Date().toISOString().slice(0,10),
    createdAt: isoNow()
  };
  db.waste.push(row);
  writeDb(db);
  res.json({ waste: row });
});

app.post("/api/menu", auth, role("manager"), (req, res) => {
  const db = readDb();
  const { name, category, price, available, popularity, tags } = req.body || {};
  if (!name || !category || !Number.isFinite(Number(price))) {
    return res.status(400).json({ error: "Name, category and price are required." });
  }

  const item = {
    id: `m_${Date.now()}`,
    name: String(name).trim(),
    category: String(category).trim(),
    price: Number(price),
    available: Math.max(0, Number(available || 0)),
    popularity: Math.min(1, Math.max(0, Number(popularity ?? 0.5))),
    tags: Array.isArray(tags) ? tags : ["veg"]
  };
  db.menu.push(item);
  writeDb(db);
  res.json({ item });
});

app.delete("/api/menu/:id", auth, role("manager"), (req, res) => {
  const db = readDb();
  const before = db.menu.length;
  db.menu = db.menu.filter(m => m.id !== req.params.id);
  if (db.menu.length === before) return res.status(404).json({ error: "Menu item not found." });
  writeDb(db);
  res.json({ ok: true });
});

app.get("/api/manager/orders", auth, role("manager"), (req, res) => {
  const db = readDb();
  const today = new Date().toISOString().slice(0,10);
  const orders = db.orders
    .filter(o => o.date === today)
    .sort((a,b) => new Date(a.createdAt) - new Date(b.createdAt));
  res.json({ orders });
});

app.get("/api/manager/offline-sales", auth, role("manager"), (req, res) => {
  const db = readDb();
  const today = new Date().toISOString().slice(0,10);
  const sales = db.offlineSales.filter(s => s.date === today);
  res.json({ sales });
});

app.get("/api/health", (_, res) => {
  res.json({ ok: true, app: "CanteenIQ", time: isoNow() });
});

ensureDb();

app.get("/{*splat}", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`CanteenIQ running on http://localhost:${PORT}`);
});
