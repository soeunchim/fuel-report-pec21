// server.js
const express = require('express');
const cors = require('cors');
const os = require('os');
const path = require('path');
const QRCode = require('qrcode');
const axios = require('axios');
const db = require('./db');
const { generateVoucherDocx, generateRequestDocx, generateFinancialDocx, generateMonthlyDocx } = require('./utils/docxGenerator');
const { generateExcelReport } = require('./utils/excelGenerator');
const { syncWithGoogleSheet, testGoogleSheetConnection } = require('./utils/googleSync');
const { toKhmerDigits, numberToKhmerWords } = require('./utils/khmerNumber');
const { formatKhmerSolarDate, formatKhmerFullSolarDate, formatKhmerBuddhistDate } = require('./utils/khmerDate');

const app = express();
const PORT = process.env.PORT || 3027;

// Middlewares
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Network Helper
function getLocalNetworkAddresses() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push({
          name,
          address: iface.address,
          url: `http://${iface.address}:${PORT}`
        });
      }
    }
  }
  return addresses;
}

// Simple Tokenless / Session-like User Auth Map
const activeSessions = new Map();

// Helper: Telegram Notification
async function sendTelegramAlert(text) {
  const { telegramBotToken, telegramChatId, telegramNotifyEnabled } = db.data.settings;
  if (!telegramNotifyEnabled || !telegramBotToken || !telegramChatId) return;

  try {
    const url = `https://api.telegram.org/bot${telegramBotToken}/sendMessage`;
    await axios.post(url, {
      chat_id: telegramChatId,
      text: text,
      parse_mode: 'HTML'
    });
  } catch (err) {
    console.error('Telegram notification error:', err.message);
  }
}

// ==================== AUTH API ====================
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'សូមបញ្ចូលឈ្មោះគណនី និងពាក្យសម្ងាត់' });
  }

  const user = db.data.users.find(u => u.username.toLowerCase() === username.toLowerCase().trim());
  if (!user || user.password !== password) {
    return res.status(401).json({ error: 'ឈ្មោះគណនី ឬពាក្យសម្ងាត់មិនត្រឹមត្រូវ' });
  }

  if (user.active === false) {
    return res.status(403).json({ error: 'គណនីនេះត្រូវបានផ្អាកដំណើរការ' });
  }

  const token = `token_${user.id}_${Date.now()}`;
  const userSafe = {
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    roleLabel: user.roleLabel || user.role,
    token
  };
  activeSessions.set(token, userSafe);

  // Log action
  db.data.auditLogs.unshift({
    id: Date.now(),
    action: 'LOGIN',
    details: `${user.name} បានចូលប្រព័ន្ធ`,
    user: user.name,
    timestamp: new Date().toISOString()
  });
  db.save();

  res.json({ success: true, user: userSafe });
});

app.get('/api/me', (req, res) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (token && activeSessions.has(token)) {
    return res.json({ success: true, user: activeSessions.get(token) });
  }
  // Default to SuperAdmin if accessed locally without token for instant accessibility
  res.json({
    success: true,
    user: db.data.users[0]
  });
});

app.post('/api/logout', (req, res) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (token) activeSessions.delete(token);
  res.json({ success: true, message: 'បានចាកចេញដោយជោគជ័យ' });
});

// ==================== USERS API ====================
app.get('/api/users', (req, res) => {
  const safeUsers = db.data.users.map(u => ({
    id: u.id,
    username: u.username,
    name: u.name,
    role: u.role,
    roleLabel: u.roleLabel || u.role,
    active: u.active !== false,
    createdAt: u.createdAt
  }));
  res.json(safeUsers);
});

app.post('/api/users', (req, res) => {
  const { username, password, name, role } = req.body;
  if (!username || !password || !name || !role) {
    return res.status(400).json({ error: 'សូមបំពេញព័ត៌មានគណនីឱ្យបានគ្រប់ជ្រុងជ្រោយ' });
  }

  const existing = db.data.users.find(u => u.username.toLowerCase() === username.toLowerCase().trim());
  if (existing) {
    return res.status(400).json({ error: 'ឈ្មោះគណនីនេះមានរួចហើយ' });
  }

  const allowedRoles = ['SuperAdmin', 'Admin', 'PEC21', 'មន្ត្រី ល.ខ.ប', 'អ្នកបញ្ចូលទិន្នន័យ'];
  if (!allowedRoles.includes(role)) {
    return res.status(400).json({ error: 'តួនាទីមិនត្រឹមត្រូវ ត្រូវតែជា: SuperAdmin, Admin, PEC21, មន្ត្រី ល.ខ.ប, ឬ អ្នកបញ្ចូលទិន្នន័យ' });
  }

  const newUser = {
    id: Date.now(),
    username: username.trim(),
    password: password,
    name: name.trim(),
    role: role,
    roleLabel: role,
    active: true,
    createdAt: new Date().toISOString()
  };

  db.data.users.push(newUser);
  db.save();
  res.json({ success: true, message: 'បានបង្កើតគណនីថ្មីដោយជោគជ័យ', user: newUser });
});

app.put('/api/users/:id', (req, res) => {
  const id = Number(req.params.id);
  const user = db.data.users.find(u => u.id === id);
  if (!user) return res.status(404).json({ error: 'រកមិនឃើញគណនីនេះទេ' });

  const { name, role, password, active } = req.body;
  if (name) user.name = name.trim();
  if (role) {
    user.role = role;
    user.roleLabel = role;
  }
  if (password) user.password = password;
  if (typeof active === 'boolean') user.active = active;

  db.save();
  res.json({ success: true, message: 'បានកែប្រែគណនីដោយជោគជ័យ' });
});

app.delete('/api/users/:id', (req, res) => {
  const id = Number(req.params.id);
  const user = db.data.users.find(u => u.id === id);
  if (!user) return res.status(404).json({ error: 'រកមិនឃើញគណនីនេះទេ' });
  if (user.username === 'superadmin') {
    return res.status(400).json({ error: 'មិនអាចលុបគណនី SuperAdmin បានឡើយ' });
  }

  db.data.users = db.data.users.filter(u => u.id !== id);
  db.save();
  res.json({ success: true, message: 'បានលុបគណនីដោយជោគជ័យ' });
});

// ==================== NETWORK & QR CODE API ====================
app.get('/api/network-info', async (req, res) => {
  const addresses = getLocalNetworkAddresses();
  const primaryIp = addresses[0] ? addresses[0].address : 'localhost';
  const localUrl = `http://localhost:${PORT}`;
  const wifiUrl = addresses[0] ? addresses[0].url : localUrl;
  const onlineUrl = req.protocol + '://' + req.get('host');

  let qrDataUrl = '';
  try {
    qrDataUrl = await QRCode.toDataURL(wifiUrl, { margin: 2, scale: 5 });
  } catch (e) {
    console.error('QR code error:', e);
  }

  res.json({
    port: PORT,
    primaryIp,
    localUrl,
    wifiUrl,
    onlineUrl,
    addresses,
    qrDataUrl,
    storageMode: db.data.settings.storageMode || 'dual'
  });
});

// ==================== SETTINGS & CLOUD SYNC API ====================
app.get('/api/settings', (req, res) => {
  res.json(db.data.settings);
});

app.put('/api/settings', (req, res) => {
  const updates = req.body;
  db.data.settings = { ...db.data.settings, ...updates };
  db.save();
  res.json({ success: true, message: 'បានរក្សាទុកការកំណត់ដោយជោគជ័យ', settings: db.data.settings });
});

app.post('/api/storage-mode', (req, res) => {
  const { mode } = req.body;
  const allowed = ['local', 'wifi', 'online', 'sheet', 'dual'];
  if (!allowed.includes(mode)) {
    return res.status(400).json({ error: 'របៀបដំណើរការមិនត្រឹមត្រូវ' });
  }
  db.data.settings.storageMode = mode;
  db.save();
  res.json({ success: true, mode, message: `បានប្តូរទៅកាន់របៀប ${mode}` });
});

app.post('/api/sync/google-sheet', async (req, res) => {
  try {
    const webAppUrl = req.body.url || db.data.settings.googleWebAppUrl;
    if (!webAppUrl) {
      return res.status(400).json({ error: 'សូមបញ្ចូល Google Apps Script Web App URL នៅក្នុងការកំណត់' });
    }

    const result = await syncWithGoogleSheet(webAppUrl, db.data);
    db.data.settings.lastGoogleSync = new Date().toISOString();
    db.save();

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/sync/google-sheet/test', async (req, res) => {
  try {
    const webAppUrl = req.query.url || db.data.settings.googleWebAppUrl;
    const testRes = await testGoogleSheetConnection(webAppUrl);
    res.json(testRes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/test-telegram', async (req, res) => {
  try {
    const text = '🔔 <b>សាកល្បងការជូនដំណឹង Telegram</b>\nប្រព័ន្ធគ្រប់គ្រងរបាយការណ៍ប្រេង PEC21 ដំណើរការតភ្ជាប់ជោគជ័យ!';
    await sendTelegramAlert(text);
    res.json({ success: true, message: 'បានផ្ញើសារសាកល្បងទៅកាន់ Telegram រួចរាល់' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ==================== STAFF (បញ្ជីរាយនាម) API ====================
app.get('/api/staff', (req, res) => {
  res.json(db.data.staff || []);
});

app.post('/api/staff', (req, res) => {
  const { name, gender, honorific, role, phone, vehicle } = req.body;
  if (!name) return res.status(400).json({ error: 'សូមបញ្ចូលឈ្មោះមន្ត្រី' });

  const staffList = db.data.staff || [];
  const newStaff = {
    id: staffList.length > 0 ? Math.max(...staffList.map(s => s.id || 0)) + 1 : 1,
    name: name.trim(),
    gender: gender || 'ប',
    honorific: honorific || 'លោក',
    role: role || '',
    phone: phone || '',
    vehicle: vehicle || ''
  };

  staffList.push(newStaff);
  db.data.staff = staffList;
  db.save();
  res.json({ success: true, staff: newStaff });
});

app.put('/api/staff/:id', (req, res) => {
  const id = Number(req.params.id);
  const staff = (db.data.staff || []).find(s => s.id === id);
  if (!staff) return res.status(404).json({ error: 'រកមិនឃើញព័ត៌មានមន្ត្រីនេះទេ' });

  Object.assign(staff, req.body);
  db.save();
  res.json({ success: true, staff });
});

app.delete('/api/staff/:id', (req, res) => {
  const id = Number(req.params.id);
  db.data.staff = (db.data.staff || []).filter(s => s.id !== id);
  db.save();
  res.json({ success: true, message: 'បានលុបមន្ត្រីដោយជោគជ័យ' });
});

// ==================== STOCK & INFLOW API ====================
app.get('/api/stock', (req, res) => {
  const summary = db.getStockSummary();
  res.json({
    summary,
    stockOpening: db.data.stockOpening,
    stockInflow: db.data.stockInflow,
    inflows: db.data.inflows || []
  });
});

app.put('/api/stock/opening', (req, res) => {
  const { gasoline, diesel, oil, periodName } = req.body;
  db.data.stockOpening = {
    gasoline: Number(gasoline) || 0,
    diesel: Number(diesel) || 0,
    oil: Number(oil) || 0,
    periodName: periodName || db.data.stockOpening.periodName || 'យោងរបាយការណ៍ដើមគ្រា'
  };
  db.save();
  res.json({ success: true, stockOpening: db.data.stockOpening });
});

app.post('/api/stock/inflow', (req, res) => {
  const { date, gasoline, diesel, oil, document_no, description } = req.body;
  const newInflow = {
    id: Date.now(),
    date: date || new Date().toISOString().split('T')[0],
    gasoline: Number(gasoline) || 0,
    diesel: Number(diesel) || 0,
    oil: Number(oil) || 0,
    document_no: document_no || '',
    description: description || 'ទទួលប្រេងពី គ.ជ.ប'
  };

  db.data.inflows = db.data.inflows || [];
  db.data.inflows.push(newInflow);

  // Update cumulative inflow
  db.data.stockInflow.gasoline = (Number(db.data.stockInflow.gasoline) || 0) + newInflow.gasoline;
  db.data.stockInflow.diesel = (Number(db.data.stockInflow.diesel) || 0) + newInflow.diesel;
  db.data.stockInflow.oil = (Number(db.data.stockInflow.oil) || 0) + newInflow.oil;

  db.save();
  res.json({ success: true, inflow: newInflow, stockSummary: db.getStockSummary() });
});

// ==================== FUEL TRANSACTIONS API ====================
app.get('/api/fuel', (req, res) => {
  let list = db.data.fuelTransactions || [];
  const { month, year, search, status } = req.query;

  if (search) {
    const q = search.toLowerCase().trim();
    list = list.filter(item =>
      (item.requester_name && item.requester_name.toLowerCase().includes(q)) ||
      (item.purpose && item.purpose.toLowerCase().includes(q)) ||
      (item.voucher_no && String(item.voucher_no).includes(q)) ||
      (item.req_no && String(item.req_no).includes(q)) ||
      (item.intro_no && String(item.intro_no).includes(q))
    );
  }

  if (month) {
    list = list.filter(item => {
      if (!item.date) return false;
      const m = parseInt(item.date.split('-')[1], 10);
      return m === parseInt(month, 10);
    });
  }

  if (year) {
    list = list.filter(item => {
      if (!item.date) return false;
      const y = parseInt(item.date.split('-')[0], 10);
      return y === parseInt(year, 10);
    });
  }

  if (status) {
    list = list.filter(item => item.status === status);
  }

  res.json(list);
});

app.get('/api/fuel/:id', (req, res) => {
  const id = Number(req.params.id);
  const item = (db.data.fuelTransactions || []).find(t => t.id === id);
  if (!item) return res.status(404).json({ error: 'រកមិនឃើញទិន្នន័យប្រេងនេះទេ' });
  res.json(item);
});

app.post('/api/fuel', async (req, res) => {
  const payload = req.body;
  if (!payload.requester_name && !payload.purpose) {
    return res.status(400).json({ error: 'សូមបញ្ចូលឈ្មោះអ្នកស្នើសុំ និងគោលបំណងប្រើប្រាស់' });
  }

  const list = db.data.fuelTransactions || [];
  const nextId = list.length > 0 ? Math.max(...list.map(t => t.id || 0)) + 1 : 1;

  const newTx = {
    id: nextId,
    date: payload.date || new Date().toISOString().split('T')[0],
    mission_no: payload.mission_no || '',
    intro_no: payload.intro_no || '',
    req_no: payload.req_no || String(nextId + 104),
    voucher_no: payload.voucher_no || String(nextId + 104),
    requester_name: payload.requester_name || '',
    honorific: payload.honorific || 'លោក',
    gender: payload.gender || 'ប',
    role: payload.role || '',
    purpose: payload.purpose || payload.description || '',
    gasoline_in: Number(payload.gasoline_in) || 0,
    gasoline_out: Number(payload.gasoline_out) || 0,
    diesel_in: Number(payload.diesel_in) || 0,
    diesel_out: Number(payload.diesel_out) || 0,
    oil_in: Number(payload.oil_in) || 0,
    oil_out: Number(payload.oil_out) || 0,
    status: payload.status || 'approved',
    created_at: new Date().toISOString()
  };

  list.push(newTx);
  db.data.fuelTransactions = list;
  db.save();

  // Send Telegram Alert if configured
  const alertText = `⛽ <b>មានការបញ្ចេញប្រេងថ្មី!</b>\n` +
    `👤 <b>អ្នកស្នើសុំ:</b> ${newTx.honorific} ${newTx.requester_name} (${newTx.role})\n` +
    `📄 <b>លេខប័ណ្ណ:</b> ${newTx.voucher_no} | <b>លេខសំណើ:</b> ${newTx.req_no}\n` +
    `🚗 <b>គោលបំណង:</b> ${newTx.purpose}\n` +
    (newTx.gasoline_out > 0 ? `🟢 <b>សាំង (E.A):</b> ${newTx.gasoline_out} លីត្រ\n` : '') +
    (newTx.diesel_out > 0 ? `🔵 <b>ម៉ាស៊ូត (D.O):</b> ${newTx.diesel_out} លីត្រ\n` : '') +
    (newTx.oil_out > 0 ? `🟡 <b>ប្រេងម៉ាស៊ីន (M.O):</b> ${newTx.oil_out} លីត្រ\n` : '');

  sendTelegramAlert(alertText).catch(() => {});

  // Trigger Google Sheet sync in background if dual mode
  if (db.data.settings.storageMode === 'dual' && db.data.settings.googleWebAppUrl) {
    syncWithGoogleSheet(db.data.settings.googleWebAppUrl, db.data).catch(err => {
      console.warn('Background Dual Sync error:', err.message);
    });
  }

  res.json({ success: true, item: newTx });
});

app.put('/api/fuel/:id', (req, res) => {
  const id = Number(req.params.id);
  const list = db.data.fuelTransactions || [];
  const index = list.findIndex(t => t.id === id);
  if (index === -1) return res.status(404).json({ error: 'រកមិនឃើញទិន្នន័យប្រេងនេះទេ' });

  const updated = { ...list[index], ...req.body, id };
  list[index] = updated;
  db.data.fuelTransactions = list;
  db.save();

  res.json({ success: true, item: updated });
});

app.delete('/api/fuel/:id', (req, res) => {
  const id = Number(req.params.id);
  db.data.fuelTransactions = (db.data.fuelTransactions || []).filter(t => t.id !== id);
  db.save();
  res.json({ success: true, message: 'បានលុបទិន្នន័យប្រេងដោយជោគជ័យ' });
});

app.post('/api/fuel/delete-all', (req, res) => {
  db.createBackup();
  db.data.fuelTransactions = [];
  db.save();
  res.json({ success: true, message: 'បានសម្អាតទិន្នន័យប្រេងទាំងអស់' });
});

// ==================== EXPORT & PRINT API ====================

// 1. របាយការណ៍ប្រេងឥន្ធនៈ -> Export to Excel (.xlsx)
app.get('/api/export/excel', (req, res) => {
  try {
    const buffer = generateExcelReport(db.data);
    const filename = `របាយការណ៍ប្រេងឥន្ធនៈ_PEC21_${new Date().toISOString().split('T')[0]}.xlsx`;
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (err) {
    console.error('Excel export error:', err);
    res.status(500).json({ error: 'បរាជ័យក្នុងការបង្កើតឯកសារ Excel: ' + err.message });
  }
});

// 2. ប័ណ្ណបញ្ចេញប្រេង -> Export to Word (.docx)
app.get('/api/export/docx/voucher/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    const item = (db.data.fuelTransactions || []).find(t => t.id === id);
    if (!item) return res.status(404).json({ error: 'រកមិនឃើញទិន្នន័យប័ណ្ណនេះទេ' });

    const buffer = generateVoucherDocx(item);
    const filename = `ប័ណ្ណបញ្ចេញប្រេង_${item.voucher_no || item.id}.docx`;
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.send(buffer);
  } catch (err) {
    console.error('Voucher export error:', err);
    res.status(500).json({ error: 'បរាជ័យក្នុងការបង្កើតប័ណ្ណ Word: ' + err.message });
  }
});

// 3. សំណើ -> Export to Word (.docx)
app.get('/api/export/docx/request/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    const item = (db.data.fuelTransactions || []).find(t => t.id === id);
    if (!item) return res.status(404).json({ error: 'រកមិនឃើញទិន្នន័យសំណើនេះទេ' });

    const buffer = generateRequestDocx(item);
    const filename = `សំណើសុំប្រេង_${item.req_no || item.id}.docx`;
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.send(buffer);
  } catch (err) {
    console.error('Request export error:', err);
    res.status(500).json({ error: 'បរាជ័យក្នុងការបង្កើតសំណើ Word: ' + err.message });
  }
});

// 4. របាយការណ៍ហិរញ្ញវត្ថុ -> Export to Word (.docx)
app.get('/api/export/docx/financial/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    const item = (db.data.fuelTransactions || []).find(t => t.id === id);
    if (!item) return res.status(404).json({ error: 'រកមិនឃើញទិន្នន័យនេះទេ' });

    const team = (db.data.staff || []).slice(0, 2);
    const buffer = generateFinancialDocx(item, team);
    const filename = `របាយការណ៍ហិរញ្ញវត្ថុ_${item.intro_no || item.id}.docx`;
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.send(buffer);
  } catch (err) {
    console.error('Financial report export error:', err);
    res.status(500).json({ error: 'បរាជ័យក្នុងការបង្កើតរបាយការណ៍ហិរញ្ញវត្ថុ: ' + err.message });
  }
});

// 5. របាយការណ៍ប្រើប្រាស់ប្រេង -> Export to Word (.docx)
app.get('/api/export/docx/monthly', (req, res) => {
  try {
    const summary = db.getStockSummary();
    const buffer = generateMonthlyDocx({
      date: new Date(),
      monthName: 'កញ្ញា',
      year: 2024,
      ...summary
    });
    const filename = `របាយការណ៍ប្រើប្រាស់ប្រេងឥន្ធនៈ_PEC21.docx`;
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.send(buffer);
  } catch (err) {
    console.error('Monthly report export error:', err);
    res.status(500).json({ error: 'បរាជ័យក្នុងការបង្កើតរបាយការណ៍ប្រើប្រាស់ប្រេង: ' + err.message });
  }
});

// ==================== BACKUP & RESTORE API ====================
app.get('/api/backup', (req, res) => {
  const backupsDir = path.join(__dirname, 'data', 'backups');
  if (!fs.existsSync(backupsDir)) return res.json([]);
  const files = fs.readdirSync(backupsDir)
    .filter(f => f.endsWith('.json'))
    .map(f => {
      const stats = fs.statSync(path.join(backupsDir, f));
      return {
        filename: f,
        size: stats.size,
        createdAt: stats.birthtime
      };
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(files);
});

app.post('/api/backup', (req, res) => {
  const backupFile = db.createBackup();
  res.json({ success: true, message: 'បានបង្កើត Backup ដោយជោគជ័យ', filename: backupFile });
});

app.post('/api/restore', (req, res) => {
  const { filename } = req.body;
  try {
    db.restoreBackup(filename);
    res.json({ success: true, message: 'បានស្តារទិន្នន័យពី Backup ជោគជ័យ' });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.post('/api/system/reset-all-data', (req, res) => {
  db.resetAll();
  res.json({ success: true, message: 'បានកំណត់ទិន្នន័យប្រព័ន្ធឡើងវិញដំបូងជោគជ័យ' });
});

// Start Server
app.listen(PORT, () => {
  const addresses = getLocalNetworkAddresses();
  console.log(`================================================================`);
  console.log(`🚀 ប្រព័ន្ធគ្រប់គ្រងរបាយការណ៍ប្រេង PEC21 កំពុងដំណើរការ...`);
  console.log(`🌐 របៀបទី ១ (Local Database):     http://localhost:${PORT}`);
  if (addresses.length > 0) {
    addresses.forEach(a => {
      console.log(`📶 របៀបទី ២ (Local Wi-Fi):        ${a.url} (${a.name})`);
    });
  }
  console.log(`================================================================`);
});
