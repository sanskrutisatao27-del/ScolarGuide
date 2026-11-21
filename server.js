require('dotenv').config();
const express = require('express');
const session = require('express-session');
const SqliteStore = require('better-sqlite3-session-store')(session);
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const path = require('path');
const db = require('./db');

const app = express();
const isProd = process.env.NODE_ENV === 'production';

const sessionSecret = process.env.SESSION_SECRET || (!isProd && crypto.randomBytes(32).toString('hex'));
if (!sessionSecret) {
  throw new Error('SESSION_SECRET must be set in the environment when NODE_ENV=production.');
}

if (isProd) app.set('trust proxy', 1); // needed behind Render's proxy

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ---------- Security & basics ----------
app.use(helmet());
app.use(express.urlencoded({ extended: false, limit: '10kb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  store: new SqliteStore({ client: db, expired: { clear: true, intervalMs: 900000 } }),
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  name: 'sg.sid',
  cookie: {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    maxAge: 1000 * 60 * 60 * 2 // 2 hours
  }
}));

// ---------- CSRF protection (stops fake forms from other sites) ----------
app.use((req, res, next) => {
  if (!req.session.csrf) req.session.csrf = crypto.randomBytes(24).toString('hex');
  res.locals.csrfToken = req.session.csrf;
  res.locals.user = req.session.user || null;
  if (req.method === 'POST' && req.body._csrf !== req.session.csrf) {
    return res.status(403).send('Invalid form token. Please go back and try again.');
  }
  next();
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many attempts. Please try again after 15 minutes.'
});

function requireLogin(req, res, next) {
  if (!req.session.user) return res.redirect('/login');
  next();
}

// ---------- Matching logic ----------
function findMatches(p) {
  const rows = db.prepare('SELECT * FROM scholarships').all();
  return rows.filter(s => {
    if (s.max_income !== null && p.income > s.max_income) return false;
    if (s.categories !== 'ALL' && !s.categories.split(',').includes(p.category)) return false;
    if (s.gender !== 'ALL' && s.gender !== p.gender) return false;
    if (s.levels !== 'ALL' && !s.levels.split(',').includes(p.level)) return false;
    if (s.min_percentage !== null && p.percentage < s.min_percentage) return false;
    if (s.disability_required && !p.disability) return false;
    return true;
  });
}

const CATEGORIES = ['Open', 'OBC', 'SC', 'ST', 'VJNT', 'SBC', 'EWS'];
const GENDERS = ['Male', 'Female', 'Other'];
const LEVELS = ['School', 'Diploma', 'UG', 'PG'];

// ---------- Pages ----------
app.get('/', (req, res) => res.render('index', { title: 'ScolarGuide' }));

app.get('/register', (req, res) => res.render('register', { title: 'Create account', error: null }));

app.post('/register', authLimiter, (req, res) => {
  const name = (req.body.name || '').trim();
  const email = (req.body.email || '').trim().toLowerCase();
  const password = req.body.password || '';

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  if (name.length < 2 || !emailOk) {
    return res.render('register', { title: 'Create account', error: 'Please enter a valid name and email.' });
  }
  if (password.length < 8) {
    return res.render('register', { title: 'Create account', error: 'Password must be at least 8 characters.' });
  }
  const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (exists) {
    return res.render('register', { title: 'Create account', error: 'That email is already registered.' });
  }

  const hash = bcrypt.hashSync(password, 12);
  const info = db.prepare('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)').run(name, email, hash);

  req.session.regenerate(err => {
    if (err) return res.redirect('/login');
    req.session.user = { id: info.lastInsertRowid, name };
    res.redirect('/dashboard');
  });
});

app.get('/login', (req, res) => res.render('login', { title: 'Log in', error: null }));

app.post('/login', authLimiter, (req, res) => {
  const email = (req.body.email || '').trim().toLowerCase();
  const password = req.body.password || '';
  const u = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

  if (!u || !bcrypt.compareSync(password, u.password_hash)) {
    return res.render('login', { title: 'Log in', error: 'Wrong email or password.' });
  }
  req.session.regenerate(err => {
    if (err) return res.redirect('/login');
    req.session.user = { id: u.id, name: u.name };
    res.redirect('/dashboard');
  });
});

app.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('sg.sid');
    res.redirect('/');
  });
});

app.get('/dashboard', requireLogin, (req, res) => {
  const profile = db.prepare('SELECT * FROM profiles WHERE user_id = ?').get(req.session.user.id);
  const matches = profile ? findMatches(profile) : null;
  res.render('dashboard', { title: 'Dashboard', profile, matches, error: null, CATEGORIES, GENDERS, LEVELS });
});

app.post('/dashboard', requireLogin, (req, res) => {
  const income = parseInt(req.body.income, 10);
  const percentage = parseFloat(req.body.percentage);
  const { category, gender, level } = req.body;
  const disability = req.body.disability === 'on' ? 1 : 0;

  const bad =
    !Number.isInteger(income) || income < 0 || income > 100000000 ||
    Number.isNaN(percentage) || percentage < 0 || percentage > 100 ||
    !CATEGORIES.includes(category) || !GENDERS.includes(gender) || !LEVELS.includes(level);

  if (bad) {
    return res.render('dashboard', {
      title: 'Dashboard', profile: null, matches: null,
      error: 'Please fill every field with valid values.', CATEGORIES, GENDERS, LEVELS
    });
  }

  db.prepare(`
    INSERT INTO profiles (user_id, income, category, gender, level, percentage, disability)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      income=excluded.income, category=excluded.category, gender=excluded.gender,
      level=excluded.level, percentage=excluded.percentage, disability=excluded.disability
  `).run(req.session.user.id, income, category, gender, level, percentage, disability);

  res.redirect('/dashboard');
});

app.use((req, res) => res.status(404).render('404', { title: 'Not found' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`ScolarGuide running on http://localhost:${PORT}`));
