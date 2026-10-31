
const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config({
  path: require('path').join(__dirname, '..', '.env')
});
const C = require('./config');
if (!C.secret || !C.admin.id || !C.admin.password) {
  throw new Error(
    'Missing SECRET, ADMIN_ID or ADMIN_PASS in environment configuration.'
  );
}
const app = express();
const DB = process.env.DATA_FILE || path.join(__dirname, 'data.json');

const EMPTY = () => ({
  users: [],
  orders: [],
  requests: [],
  feedback: []
});

function load() {
  try {
    const d = JSON.parse(fs.readFileSync(DB, 'utf8'));
    return { ...EMPTY(), ...d };
  } catch {
    return EMPTY();
  }
}

function save(d) {
  const tmp = DB + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(d, null, 2), 'utf8');
  fs.renameSync(tmp, DB);
}

const clean = (v, n = 200) =>
  String(v ?? '').trim().slice(0, n);

const hash = (pw, salt = crypto.randomBytes(16).toString('hex')) =>
  salt + ':' + crypto.scryptSync(String(pw), salt, 64).toString('hex');

function same(pw, stored) {
  try {
    const [salt, key] = String(stored).split(':');
    const actual = crypto.scryptSync(String(pw), salt, 64);
    const expected = Buffer.from(key, 'hex');

    return expected.length === actual.length &&
      crypto.timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

const hmac = p =>
  crypto.createHmac('sha256', C.secret)
    .update(p)
    .digest('base64url');

const sign = payload => {
  const p = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return p + '.' + hmac(p);
};

function verify(token) {
  try {
    const [p, sig] = String(token || '').split('.');

    if (!p || !sig) return null;

    const expected = Buffer.from(hmac(p));
    const received = Buffer.from(sig);

    if (
      expected.length !== received.length ||
      !crypto.timingSafeEqual(expected, received)
    ) return null;

    const data = JSON.parse(
      Buffer.from(p, 'base64url').toString('utf8')
    );

    if (data.exp && Date.now() > data.exp) return null;

    return data;
  } catch {
    return null;
  }
}

const auth = role => (req, res, next) => {
  const payload = verify(
    (req.headers.authorization || '').replace(/^Bearer\s+/i, '')
  );

  if (!payload || (role && payload.role !== role)) {
    return res.status(401).json({
      error: 'Please sign in again.'
    });
  }

  req.auth = payload;
  next();
};

const FDI = new Set([
  11,12,13,14,15,16,17,18,
  21,22,23,24,25,26,27,28,
  31,32,33,34,35,36,37,38,
  41,42,43,44,45,46,47,48
]);

function priceNow() {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(new Date());

  const hour = Number(
    parts.find(p => p.type === 'hour').value
  );

  const slot = C.slots.find(
    s => hour >= s.from && hour < s.to
  );

  return slot ? slot.price : C.defaultPrice;
}

app.use(express.json({ limit: '3mb' }));

app.use(express.static(
  path.join(__dirname, '..', 'frontend')
));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'CUSPYLO',
    storage: 'local JSON file'
  });
});

// Frontend configuration
app.get('/api/config', (_req, res) => {
  res.json({
    slots: C.slots,
    defaultPrice: C.defaultPrice,
    price: priceNow(),
    whatsapp: C.whatsapp,
    email: C.email
  });
});

// Student registration
app.post('/api/signup', (req, res) => {
  const b = req.body || {};
  const d = load();

  const user = {
    name: clean(b.name, 80),
    username: clean(b.username, 30).toLowerCase(),
    phone: clean(b.phone, 20),
    email: clean(b.email, 120),
    college: clean(b.college, 120)
  };

  if (
    !user.name ||
    !user.username ||
    !user.phone ||
    !user.college ||
    String(b.password || '').length < 6
  ) {
    return res.status(400).json({
      error: 'Complete all required fields. Password must be at least 6 characters.'
    });
  }

  if (d.users.some(u => u.username === user.username)) {
    return res.status(409).json({
      error: 'That username is already registered.'
    });
  }

  d.users.push({
    ...user,
    passwordHash: hash(b.password),
    createdAt: new Date().toISOString()
  });

  save(d);

  const token = sign({
    role: 'user',
    username: user.username,
    exp: Date.now() + 7 * 864e5
  });

  res.json({ token, user });
});

// Student login
app.post('/api/login', (req, res) => {
  const b = req.body || {};
  const d = load();

  const u = d.users.find(
    x => x.username === clean(b.username, 30).toLowerCase()
  );

  if (!u || !same(b.password || '', u.passwordHash)) {
    return res.status(401).json({
      error: 'Wrong username or password.'
    });
  }

  const user = {
    name: u.name,
    username: u.username,
    phone: u.phone,
    email: u.email,
    college: u.college
  };

  res.json({
    token: sign({
      role: 'user',
      username: u.username,
      exp: Date.now() + 7 * 864e5
    }),
    user
  });
});

// Separate admin login
app.post('/api/admin/login', (req, res) => {
  const b = req.body || {};

  if (
    clean(b.id) !== C.admin.id ||
    String(b.password || '') !== C.admin.password
  ) {
    return res.status(401).json({
      error: 'Invalid admin ID or password.'
    });
  }

  res.json({
    token: sign({
      role: 'admin',
      exp: Date.now() + 12 * 3600e3
    }),
    user: { name: 'CUSPYLO Admin' }
  });
});

// Current logged-in user
app.get('/api/me', auth(), (req, res) => {
  if (req.auth.role === 'admin') {
    return res.json({
      role: 'admin',
      user: { name: 'CUSPYLO Admin' }
    });
  }

  const u = load().users.find(
    x => x.username === req.auth.username
  );

  if (!u) {
    return res.status(404).json({
      error: 'Account not found.'
    });
  }

  const { passwordHash, ...user } = u;

  res.json({ role: 'user', user });
});

// Student order history
app.get('/api/my/orders', auth('user'), (req, res) => {
  const orders = load().orders
    .filter(o => o.username === req.auth.username)
    .sort((a, b) => b.date.localeCompare(a.date));

  res.json({ orders });
});

// Place order
app.post('/api/orders', auth('user'), (req, res) => {
  const b = req.body || {};

  const items = [
    ...new Set(
      (Array.isArray(b.items) ? b.items : []).map(Number)
    )
  ].filter(n => FDI.has(n));

  if (!items.length) {
    return res.status(400).json({
      error: 'Your cart is empty.'
    });
  }

  if (
    !clean(b.name) ||
    !clean(b.phone) ||
    !clean(b.college)
  ) {
    return res.status(400).json({
      error: 'Name, phone and college are required.'
    });
  }

  const unit = priceNow();

  const order = {
    invoice: 'CSP-' + Date.now().toString(36).toUpperCase(),
    username: req.auth.username,
    name: clean(b.name, 80),
    phone: clean(b.phone, 20),
    email: clean(b.email, 120),
    college: clean(b.college, 120),
    address: clean(b.address, 500),
    items,
    unit,
    total: unit * items.length,
    payment: 'COD',
    status: 'New',
    date: new Date().toISOString()
  };

  const d = load();
  d.orders.push(order);
  save(d);

  res.json(order);
});

// Product request
app.post('/api/requests', auth('user'), (req, res) => {
  const b = req.body || {};
  const product = clean(b.product, 160);

  if (!product) {
    return res.status(400).json({
      error: 'Enter the product name.'
    });
  }

  const image =
    typeof b.image === 'string' &&
    /^data:image\/(png|jpeg|webp);base64,/.test(b.image) &&
    b.image.length < 2.5e6
      ? b.image
      : '';

  const d = load();

  d.requests.push({
    id: crypto.randomUUID(),
    username: req.auth.username,
    product,
    image,
    phone: clean(b.phone, 20),
    date: new Date().toISOString(),
    status: 'New'
  });

  save(d);
  res.json({ ok: true });
});

// Feedback
app.post('/api/feedback', (req, res) => {
  const b = req.body || {};
  const message = clean(b.message, 1200);

  if (!message) {
    return res.status(400).json({
      error: 'Please write your feedback.'
    });
  }

  const d = load();

  d.feedback.push({
    id: crypto.randomUUID(),
    name: clean(b.name, 80) || 'Anonymous',
    contact: clean(b.contact, 100),
    message,
    date: new Date().toISOString()
  });

  save(d);
  res.json({ ok: true });
});

// Admin data: orders, requests and feedback only
app.get('/api/admin/data', auth('admin'), (_req, res) => {
  const d = load();

  res.json({
    orders: [...d.orders].reverse(),
    requests: [...d.requests].reverse(),
    feedback: [...d.feedback].reverse()
  });
});

// Serve frontend routes
app.get('*', (_req, res) => {
  res.sendFile(
    path.join(__dirname, '..', 'frontend', 'index.html')
  );
});

// Start server
app.listen(process.env.PORT || 3000, '0.0.0.0', () => {
  console.log(`CUSPYLO is running on port ${process.env.PORT || 3000}`);
  console.log(`Admin ID: ${C.admin.id}`);
  console.log('Admin credentials loaded securely.');
});
