// public/js/app.js

let currentUser = null;
let currentSettings = {};
let fuelList = [];
let staffList = [];
let stockData = {};
let networkInfo = {};

// Helper: Toast Notifications
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// Convert Number to Khmer words on the fly
function updateKhmerWordsField(inputElement, targetElementId) {
  const val = Number(inputElement.value);
  const target = document.getElementById(targetElementId);
  if (target) {
    target.value = PrintService.numberToKhmerWords(val, 'លីត្រ');
  }
}

// Initialize Application
async function initApp() {
  try {
    // 1. Fetch Current User
    const meRes = await fetch('/api/me');
    const meData = await meRes.json();
    if (meData.success && meData.user) {
      currentUser = meData.user;
      renderUserProfile();
    }

    // 2. Fetch Settings
    await loadSettings();

    // 3. Fetch Network Info & QR
    await loadNetworkInfo();

    // 4. Fetch Staff & Stock
    await loadStaff();
    await loadStock();

    // 5. Fetch Fuel Transactions
    await loadFuelTransactions();

    // 6. Setup Event Listeners
    setupEventListeners();

  } catch (err) {
    console.error('Init error:', err);
    showToast('បញ្ហាក្នុងការទាញយកទិន្នន័យពីម៉ាស៊ីនបម្រើ', 'error');
  }
}

function renderUserProfile() {
  const userBox = document.getElementById('header-user-profile');
  if (!userBox || !currentUser) return;
  userBox.innerHTML = `
    <span class="user-name font-semibold">${currentUser.name || currentUser.username}</span>
    <span class="role-tag">${currentUser.roleLabel || currentUser.role}</span>
  `;

  // Role permissions
  const usersTabBtn = document.getElementById('tab-btn-users');
  if (usersTabBtn) {
    const isSuperOrAdmin = currentUser.role === 'SuperAdmin' || currentUser.role === 'Admin';
    usersTabBtn.style.display = isSuperOrAdmin ? 'flex' : 'none';
  }
}

async function loadSettings() {
  try {
    const res = await fetch('/api/settings');
    currentSettings = await res.json();
    applySettingsToUI();
  } catch (e) {
    console.error('Failed to load settings:', e);
  }
}

function applySettingsToUI() {
  // Update storage mode badge
  const badge = document.getElementById('badge-storage-mode');
  if (badge) {
    const mode = currentSettings.storageMode || 'dual';
    const modeNames = {
      local: 'Local Database',
      wifi: 'Local Wi-Fi ផ្ទៃក្នុង',
      online: 'Online Cloud',
      sheet: 'Google Sheet',
      dual: 'Online DB + Google Sheet'
    };
    badge.innerHTML = `<span class="pulse-dot"></span> Storage: ${modeNames[mode] || mode}`;
  }

  // Update form inputs if settings tab open
  const urlInput = document.getElementById('setting-google-url');
  if (urlInput) urlInput.value = currentSettings.googleWebAppUrl || '';

  const botToken = document.getElementById('setting-tg-token');
  if (botToken) botToken.value = currentSettings.telegramBotToken || '';

  const chatId = document.getElementById('setting-tg-chatid');
  if (chatId) chatId.value = currentSettings.telegramChatId || '';

  const tgEnabled = document.getElementById('setting-tg-enabled');
  if (tgEnabled) tgEnabled.checked = !!currentSettings.telegramNotifyEnabled;

  const unitInput = document.getElementById('setting-unit-name');
  if (unitInput) unitInput.value = currentSettings.unitName || '';

  const deptInput = document.getElementById('setting-dept-name');
  if (deptInput) deptInput.value = currentSettings.departmentName || '';

  const chiefName = document.getElementById('setting-chief-name');
  if (chiefName) chiefName.value = currentSettings.chiefName || '';

  const finOfficer = document.getElementById('setting-fin-officer');
  if (finOfficer) finOfficer.value = currentSettings.adminFinOfficer || '';

  // Highlight active storage card
  document.querySelectorAll('.storage-card').forEach(card => {
    card.classList.remove('active');
    if (card.dataset.mode === currentSettings.storageMode) {
      card.classList.add('active');
    }
  });

  const dualBtn = document.getElementById('btn-active-dual');
  if (dualBtn) {
    if (currentSettings.storageMode === 'dual') {
      dualBtn.className = 'btn btn-success';
      dualBtn.textContent = '✓ កំពុងប្រើទាំងពីរព្រមគ្នា';
    } else {
      dualBtn.className = 'btn btn-outline';
      dualBtn.textContent = 'ជ្រើសរើសដំណើរការទាំងពីរព្រមគ្នា';
    }
  }
}

async function loadNetworkInfo() {
  try {
    const res = await fetch('/api/network-info');
    networkInfo = await res.json();

    const localUrlEl = document.getElementById('info-local-url');
    if (localUrlEl) localUrlEl.textContent = networkInfo.localUrl;

    const wifiUrlEl = document.getElementById('info-wifi-url');
    if (wifiUrlEl) wifiUrlEl.textContent = networkInfo.wifiUrl;

    const onlineUrlEl = document.getElementById('info-online-url');
    if (onlineUrlEl) onlineUrlEl.textContent = networkInfo.onlineUrl;

    const qrImg = document.getElementById('wifi-qr-image');
    if (qrImg && networkInfo.qrDataUrl) {
      qrImg.src = networkInfo.qrDataUrl;
    }
    const qrModalLink = document.getElementById('wifi-qr-link');
    if (qrModalLink) {
      qrModalLink.textContent = networkInfo.wifiUrl;
      qrModalLink.href = networkInfo.wifiUrl;
    }
  } catch (e) {
    console.error('Failed to load network info:', e);
  }
}

async function loadStock() {
  try {
    const res = await fetch('/api/stock');
    const data = await res.json();
    stockData = data;
    renderStockCards(data.summary);
  } catch (e) {
    console.error('Failed to load stock:', e);
  }
}

function renderStockCards(summary) {
  if (!summary) return;

  const g = summary.gasoline;
  const d = summary.diesel;
  const o = summary.oil;

  // Gasoline
  document.getElementById('stat-gas-close').textContent = `${g.close} លីត្រ`;
  document.getElementById('stat-gas-open').textContent = `ដើមគ្រា: ${g.open}`;
  document.getElementById('stat-gas-in').textContent = `ចូល: +${g.in}`;
  document.getElementById('stat-gas-out').textContent = `ចេញ: -${g.out}`;

  // Diesel
  document.getElementById('stat-diesel-close').textContent = `${d.close} លីត្រ`;
  document.getElementById('stat-diesel-open').textContent = `ដើមគ្រា: ${d.open}`;
  document.getElementById('stat-diesel-in').textContent = `ចូល: +${d.in}`;
  document.getElementById('stat-diesel-out').textContent = `ចេញ: -${d.out}`;

  // Oil
  document.getElementById('stat-oil-close').textContent = `${o.close} លីត្រ`;
  document.getElementById('stat-oil-open').textContent = `ដើមគ្រា: ${o.open}`;
  document.getElementById('stat-oil-in').textContent = `ចូល: +${o.in}`;
  document.getElementById('stat-oil-out').textContent = `ចេញ: -${o.out}`;

  // Transactions & Staff count
  document.getElementById('stat-total-tx').textContent = summary.transactionsCount || 0;
  document.getElementById('stat-total-staff').textContent = summary.staffCount || 0;
}

async function loadStaff() {
  try {
    const res = await fetch('/api/staff');
    staffList = await res.json();
    renderStaffTable();
    populateStaffDropdown();
  } catch (e) {
    console.error('Failed to load staff:', e);
  }
}

function renderStaffTable() {
  const tbody = document.getElementById('staff-table-body');
  if (!tbody) return;

  tbody.innerHTML = staffList.map((s, idx) => `
    <tr>
      <td style="text-align: center;">${s.id || idx + 1}</td>
      <td><b>${s.name}</b></td>
      <td style="text-align: center;">${s.gender === 'ស' ? 'ស្រី' : 'ប្រុស'}</td>
      <td>${s.honorific || ''}</td>
      <td>${s.role || ''}</td>
      <td>${s.phone || '-'}</td>
      <td>${s.vehicle || '-'}</td>
      <td style="text-align: center;">
        <button class="btn btn-outline btn-sm" onclick="editStaff(${s.id})">✏️ កែប្រែ</button>
        <button class="btn btn-danger btn-sm" onclick="deleteStaff(${s.id})">🗑️ លុប</button>
      </td>
    </tr>
  `).join('');
}

function populateStaffDropdown() {
  const select = document.getElementById('tx-staff-select');
  if (!select) return;

  select.innerHTML = '<option value="">-- ជ្រើសរើសមន្ត្រីក្នុងបញ្ជី --</option>' +
    staffList.map(s => `
      <option value="${s.id}" data-name="${s.name}" data-gender="${s.gender}" data-honorific="${s.honorific}" data-role="${s.role}" data-vehicle="${s.vehicle || ''}">
        ${s.honorific} ${s.name} (${s.role})
      </option>
    `).join('');
}

async function loadFuelTransactions() {
  try {
    const search = document.getElementById('filter-search')?.value || '';
    const month = document.getElementById('filter-month')?.value || '';
    const status = document.getElementById('filter-status')?.value || '';

    let url = `/api/fuel?search=${encodeURIComponent(search)}`;
    if (month) url += `&month=${month}`;
    if (status) url += `&status=${status}`;

    const res = await fetch(url);
    fuelList = await res.json();
    renderFuelTable();
    renderRecentDashboardTable();
  } catch (e) {
    console.error('Failed to load fuel:', e);
  }
}

function renderFuelTable() {
  const tbody = document.getElementById('fuel-table-body');
  if (!tbody) return;

  if (fuelList.length === 0) {
    tbody.innerHTML = `<tr><td colspan="10" style="text-align: center; padding: 30px; color: #94a3b8;">មិនមានទិន្នន័យប្រេងត្រូវបង្ហាញទេ</td></tr>`;
    return;
  }

  tbody.innerHTML = fuelList.map((tx, idx) => {
    const gasOut = Number(tx.gasoline_out) || 0;
    const dieselOut = Number(tx.diesel_out) || 0;
    const oilOut = Number(tx.oil_out) || 0;

    return `
      <tr>
        <td style="text-align: center;">${tx.id || idx + 1}</td>
        <td>${tx.date || ''}</td>
        <td style="text-align: center;"><b>${tx.voucher_no || '-'}</b></td>
        <td style="text-align: center;">${tx.req_no || '-'}</td>
        <td><b>${tx.honorific || ''} ${tx.requester_name || ''}</b><div style="font-size: 11px; color: #64748b;">${tx.role || ''}</div></td>
        <td style="max-width: 250px; font-size: 12px;">${tx.purpose || tx.description || '-'}</td>
        <td style="text-align: center;">
          ${gasOut > 0 ? `<span class="badge" style="background: #d1fae5; color: #065f46; padding: 2px 6px; border-radius: 4px;">សាំង: ${gasOut}L</span><br>` : ''}
          ${dieselOut > 0 ? `<span class="badge" style="background: #dbeafe; color: #1e40af; padding: 2px 6px; border-radius: 4px;">ម៉ាស៊ូត: ${dieselOut}L</span><br>` : ''}
          ${oilOut > 0 ? `<span class="badge" style="background: #fef3c7; color: #92400e; padding: 2px 6px; border-radius: 4px;">ប្រេងម៉ាស៊ីន: ${oilOut}L</span>` : ''}
          ${gasOut === 0 && dieselOut === 0 && oilOut === 0 ? '-' : ''}
        </td>
        <td style="text-align: center;">
          <span style="background: #dcfce7; color: #166534; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 600;">អនុម័ត</span>
        </td>
        <td style="text-align: center; white-space: nowrap;">
          <button class="btn btn-outline btn-sm" title="បោះពុម្ពប័ណ្ណ" onclick="previewDocument('voucher', ${tx.id})">🖨️ ប័ណ្ណ</button>
          <button class="btn btn-outline btn-sm" title="បោះពុម្ពសំណើ" onclick="previewDocument('request', ${tx.id})">📄 សំណើ</button>
          <button class="btn btn-outline btn-sm" title="របាយការណ៍ហិរញ្ញវត្ថុ" onclick="previewDocument('financial', ${tx.id})">📊 ហិរញ្ញវត្ថុ</button>
          <button class="btn btn-outline btn-sm" onclick="editFuelTx(${tx.id})">✏️</button>
          <button class="btn btn-danger btn-sm" onclick="deleteFuelTx(${tx.id})">🗑️</button>
        </td>
      </tr>
    `;
  }).join('');
}

function renderRecentDashboardTable() {
  const tbody = document.getElementById('recent-dashboard-body');
  if (!tbody) return;

  const recent = fuelList.slice(-6).reverse();
  tbody.innerHTML = recent.map((tx, idx) => `
    <tr>
      <td>${tx.date || ''}</td>
      <td><b>${tx.voucher_no || '-'}</b></td>
      <td>${tx.honorific || ''} ${tx.requester_name || ''}</td>
      <td style="max-width: 200px; font-size: 12px;">${tx.purpose || tx.description || '-'}</td>
      <td style="text-align: center;">
        ${tx.gasoline_out > 0 ? `${tx.gasoline_out}L សាំង ` : ''}
        ${tx.diesel_out > 0 ? `${tx.diesel_out}L ម៉ាស៊ូត ` : ''}
        ${tx.oil_out > 0 ? `${tx.oil_out}L ប្រេងម៉ាស៊ីន` : ''}
      </td>
      <td style="text-align: center;">
        <button class="btn btn-outline btn-sm" onclick="previewDocument('voucher', ${tx.id})">🖨️ មើលប័ណ្ណ</button>
      </td>
    </tr>
  `).join('');
}

// Event Listeners Setup
function setupEventListeners() {
  // Navigation Tabs
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

      tab.classList.add('active');
      const target = tab.dataset.tab;
      const content = document.getElementById(`content-${target}`);
      if (content) content.classList.add('active');

      if (target === 'users') loadUsers();
      if (target === 'stock') loadStock();
    });
  });

  // Settings Sub-tabs
  document.querySelectorAll('.sub-tab').forEach(stab => {
    stab.addEventListener('click', () => {
      document.querySelectorAll('.sub-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.sub-content').forEach(c => c.classList.remove('active'));

      stab.classList.add('active');
      const target = stab.dataset.sub;
      const subContent = document.getElementById(`sub-${target}`);
      if (subContent) subContent.classList.add('active');
    });
  });

  // Staff Select Auto-fill in Fuel Modal
  const staffSelect = document.getElementById('tx-staff-select');
  if (staffSelect) {
    staffSelect.addEventListener('change', (e) => {
      const opt = e.target.selectedOptions[0];
      if (opt && opt.value) {
        document.getElementById('tx-requester-name').value = opt.dataset.name || '';
        document.getElementById('tx-honorific').value = opt.dataset.honorific || 'លោក';
        document.getElementById('tx-gender').value = opt.dataset.gender || 'ប';
        document.getElementById('tx-role').value = opt.dataset.role || '';
      }
    });
  }

  // Storage Card Clicks
  document.querySelectorAll('.storage-card').forEach(card => {
    card.addEventListener('click', () => {
      const mode = card.dataset.mode;
      switchStorageMode(mode);
    });
  });

  // Filter triggers
  document.getElementById('filter-search')?.addEventListener('input', debounce(loadFuelTransactions, 300));
  document.getElementById('filter-month')?.addEventListener('change', loadFuelTransactions);
  document.getElementById('filter-status')?.addEventListener('change', loadFuelTransactions);
}

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Switch Storage Mode
async function switchStorageMode(mode) {
  try {
    const res = await fetch('/api/storage-mode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode })
    });
    const data = await res.json();
    if (data.success) {
      currentSettings.storageMode = mode;
      applySettingsToUI();
      showToast(`បានប្តូរទីតាំងផ្ទុកទៅជា: ${mode}`, 'success');
    }
  } catch (e) {
    showToast('បរាជ័យក្នុងការប្តូររបៀបដំណើរការ', 'error');
  }
}

// Sync Google Sheets
async function syncGoogleSheetsNow() {
  const syncBtn = document.getElementById('btn-sync-header');
  const originalText = syncBtn ? syncBtn.innerHTML : '';
  if (syncBtn) {
    syncBtn.innerHTML = `⏳ កំពុង Sync...`;
    syncBtn.disabled = true;
  }

  try {
    showToast('កំពុងចាប់ផ្តើមធ្វើសមកាលកម្មជាមួយ Google Sheet...', 'info');
    const res = await fetch('/api/sync/google-sheet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: currentSettings.googleWebAppUrl })
    });
    const result = await res.json();
    if (result.success) {
      showToast(result.message || 'ធ្វើសមកាលកម្មជោគជ័យ!', 'success');
      currentSettings.lastGoogleSync = result.syncedAt;
      document.getElementById('last-sync-time').textContent = new Date().toLocaleString('km-KH');
    } else {
      showToast(result.error || 'បរាជ័យក្នុងការ Sync', 'error');
    }
  } catch (err) {
    showToast(`កំហុស Sync: ${err.message}`, 'error');
  } finally {
    if (syncBtn) {
      syncBtn.innerHTML = originalText;
      syncBtn.disabled = false;
    }
  }
}

// Modal Helpers
function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.add('open');
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.remove('open');
}

// Fuel CRUD
function openNewFuelModal() {
  document.getElementById('fuel-form').reset();
  document.getElementById('tx-id').value = '';
  document.getElementById('tx-date').value = new Date().toISOString().split('T')[0];
  document.getElementById('fuel-modal-title').textContent = '➕ បញ្ចូលការបញ្ចេញប្រេងថ្មី';

  // Suggest next voucher / req number
  const nextNo = fuelList.length > 0 ? Math.max(...fuelList.map(t => Number(t.voucher_no) || 0)) + 1 : 105;
  document.getElementById('tx-voucher-no').value = nextNo;
  document.getElementById('tx-req-no').value = nextNo;
  document.getElementById('tx-intro-no').value = nextNo - 5;

  openModal('modal-fuel');
}

function editFuelTx(id) {
  const item = fuelList.find(t => t.id === id);
  if (!item) return;

  document.getElementById('tx-id').value = item.id;
  document.getElementById('tx-date').value = item.date || '';
  document.getElementById('tx-voucher-no').value = item.voucher_no || '';
  document.getElementById('tx-req-no').value = item.req_no || '';
  document.getElementById('tx-intro-no').value = item.intro_no || '';
  document.getElementById('tx-requester-name').value = item.requester_name || '';
  document.getElementById('tx-honorific').value = item.honorific || 'លោក';
  document.getElementById('tx-gender').value = item.gender || 'ប';
  document.getElementById('tx-role').value = item.role || '';
  document.getElementById('tx-purpose').value = item.purpose || item.description || '';

  document.getElementById('tx-gas-out').value = item.gasoline_out || 0;
  document.getElementById('tx-diesel-out').value = item.diesel_out || 0;
  document.getElementById('tx-oil-out').value = item.oil_out || 0;

  document.getElementById('fuel-modal-title').textContent = '✏️ កែប្រែទិន្នន័យបញ្ចេញប្រេង';
  openModal('modal-fuel');
}

async function saveFuelTx(e) {
  e.preventDefault();
  const id = document.getElementById('tx-id').value;

  const payload = {
    date: document.getElementById('tx-date').value,
    voucher_no: document.getElementById('tx-voucher-no').value,
    req_no: document.getElementById('tx-req-no').value,
    intro_no: document.getElementById('tx-intro-no').value,
    requester_name: document.getElementById('tx-requester-name').value,
    honorific: document.getElementById('tx-honorific').value,
    gender: document.getElementById('tx-gender').value,
    role: document.getElementById('tx-role').value,
    purpose: document.getElementById('tx-purpose').value,
    gasoline_out: Number(document.getElementById('tx-gas-out').value) || 0,
    diesel_out: Number(document.getElementById('tx-diesel-out').value) || 0,
    oil_out: Number(document.getElementById('tx-oil-out').value) || 0
  };

  try {
    const url = id ? `/api/fuel/${id}` : '/api/fuel';
    const method = id ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (data.success) {
      showToast(id ? 'បានកែប្រែទិន្នន័យប្រេងជោគជ័យ' : 'បានបញ្ចូលការបញ្ចេញប្រេងថ្មីជោគជ័យ', 'success');
      closeModal('modal-fuel');
      await loadFuelTransactions();
      await loadStock();
    } else {
      showToast(data.error || 'បរាជ័យក្នុងការរក្សាទុក', 'error');
    }
  } catch (err) {
    showToast(`កំហុស: ${err.message}`, 'error');
  }
}

async function deleteFuelTx(id) {
  if (!confirm('តើអ្នកពិតជាចង់លុបទិន្នន័យប្រេងនេះមែនទេ?')) return;
  try {
    const res = await fetch(`/api/fuel/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      showToast('បានលុបទិន្នន័យរួចរាល់', 'success');
      await loadFuelTransactions();
      await loadStock();
    }
  } catch (e) {
    showToast('បរាជ័យក្នុងការលុប', 'error');
  }
}

// Inflow (ទទួលប្រេងពី គ.ជ.ប)
function openInflowModal() {
  document.getElementById('inflow-form').reset();
  document.getElementById('inflow-date').value = new Date().toISOString().split('T')[0];
  openModal('modal-inflow');
}

async function saveInflow(e) {
  e.preventDefault();
  const payload = {
    date: document.getElementById('inflow-date').value,
    document_no: document.getElementById('inflow-doc-no').value,
    gasoline: Number(document.getElementById('inflow-gas').value) || 0,
    diesel: Number(document.getElementById('inflow-diesel').value) || 0,
    oil: Number(document.getElementById('inflow-oil').value) || 0,
    description: document.getElementById('inflow-desc').value || 'ទទួលប្រេងពី គ.ជ.ប'
  };

  try {
    const res = await fetch('/api/stock/inflow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.success) {
      showToast('បានកត់ត្រាការទទួលប្រេងពី គ.ជ.ប ជោគជ័យ', 'success');
      closeModal('modal-inflow');
      await loadStock();
    }
  } catch (err) {
    showToast('បរាជ័យក្នុងការកត់ត្រាការបញ្ចូលប្រេង', 'error');
  }
}

// Staff CRUD
function openNewStaffModal() {
  document.getElementById('staff-form').reset();
  document.getElementById('staff-id').value = '';
  document.getElementById('staff-modal-title').textContent = '➕ បន្ថែមមន្ត្រីថ្មី';
  openModal('modal-staff');
}

function editStaff(id) {
  const staff = staffList.find(s => s.id === id);
  if (!staff) return;

  document.getElementById('staff-id').value = staff.id;
  document.getElementById('staff-name').value = staff.name || '';
  document.getElementById('staff-gender').value = staff.gender || 'ប';
  document.getElementById('staff-honorific').value = staff.honorific || 'លោក';
  document.getElementById('staff-role').value = staff.role || '';
  document.getElementById('staff-phone').value = staff.phone || '';
  document.getElementById('staff-vehicle').value = staff.vehicle || '';

  document.getElementById('staff-modal-title').textContent = '✏️ កែប្រែព័ត៌មានមន្ត្រី';
  openModal('modal-staff');
}

async function saveStaff(e) {
  e.preventDefault();
  const id = document.getElementById('staff-id').value;
  const payload = {
    name: document.getElementById('staff-name').value,
    gender: document.getElementById('staff-gender').value,
    honorific: document.getElementById('staff-honorific').value,
    role: document.getElementById('staff-role').value,
    phone: document.getElementById('staff-phone').value,
    vehicle: document.getElementById('staff-vehicle').value
  };

  try {
    const url = id ? `/api/staff/${id}` : '/api/staff';
    const method = id ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.success) {
      showToast(id ? 'បានកែប្រែព័ត៌មានមន្ត្រីជោគជ័យ' : 'បានបន្ថែមមន្ត្រីថ្មីជោគជ័យ', 'success');
      closeModal('modal-staff');
      await loadStaff();
    }
  } catch (e) {
    showToast('បរាជ័យក្នុងការរក្សាទុកមន្ត្រី', 'error');
  }
}

async function deleteStaff(id) {
  if (!confirm('តើអ្នកពិតជាចង់លុបមន្ត្រីនេះពីបញ្ជីមែនទេ?')) return;
  try {
    const res = await fetch(`/api/staff/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      showToast('បានលុបមន្ត្រីរួចរាល់', 'success');
      await loadStaff();
    }
  } catch (e) {
    showToast('បរាជ័យក្នុងការលុប', 'error');
  }
}

// User Accounts CRUD
async function loadUsers() {
  try {
    const res = await fetch('/api/users');
    const users = await res.json();
    const tbody = document.getElementById('users-table-body');
    if (!tbody) return;

    tbody.innerHTML = users.map(u => `
      <tr>
        <td style="text-align: center;">${u.id}</td>
        <td><b>${u.username}</b></td>
        <td>${u.name}</td>
        <td><span class="role-tag">${u.roleLabel || u.role}</span></td>
        <td style="text-align: center;">
          <span style="background: ${u.active ? '#dcfce7' : '#fee2e2'}; color: ${u.active ? '#166534' : '#991b1b'}; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 600;">
            ${u.active ? 'សកម្ម' : 'ផ្អាក'}
          </span>
        </td>
        <td style="text-align: center;">
          <button class="btn btn-outline btn-sm" onclick="editUserModal(${u.id})">✏️ កែប្រែ</button>
          ${u.username !== 'superadmin' ? `<button class="btn btn-danger btn-sm" onclick="deleteUser(${u.id})">🗑️ លុប</button>` : ''}
        </td>
      </tr>
    `).join('');
  } catch (e) {
    console.error('Failed to load users:', e);
  }
}

function openNewUserModal() {
  document.getElementById('user-form').reset();
  document.getElementById('user-id').value = '';
  document.getElementById('user-username').disabled = false;
  document.getElementById('user-password').required = true;
  document.getElementById('user-password').placeholder = '••••••••';
  document.getElementById('user-modal-title').textContent = '➕ បង្កើតគណនីថ្មី';
  openModal('modal-user');
}

function editUserModal(id) {
  fetch('/api/users')
    .then(r => r.json())
    .then(users => {
      const u = users.find(x => x.id === id);
      if (!u) return;
      document.getElementById('user-id').value = u.id;
      document.getElementById('user-username').value = u.username;
      document.getElementById('user-username').disabled = true;
      document.getElementById('user-name').value = u.name;
      document.getElementById('user-role').value = u.role;
      document.getElementById('user-password').value = '';
      document.getElementById('user-password').placeholder = '(ទុកចោលបើមិនចង់ប្តូរពាក្យសម្ងាត់)';
      document.getElementById('user-password').required = false;
      document.getElementById('user-modal-title').textContent = '✏️ កែប្រែព័ត៌មានគណនី';
      openModal('modal-user');
    })
    .catch(err => {
      console.error(err);
      showToast('បរាជ័យក្នុងការទាញយកព័ត៌មានគណនី', 'error');
    });
}

async function saveUser(e) {
  e.preventDefault();
  const id = document.getElementById('user-id').value;
  const payload = {
    username: document.getElementById('user-username').value,
    password: document.getElementById('user-password').value,
    name: document.getElementById('user-name').value,
    role: document.getElementById('user-role').value
  };

  // If editing and password was left empty, don't send empty password
  if (id && !payload.password) {
    delete payload.password;
  }

  try {
    const url = id ? `/api/users/${id}` : '/api/users';
    const method = id ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.success) {
      showToast(id ? 'បានកែប្រែគណនីជោគជ័យ' : 'បានបង្កើតគណនីថ្មីជោគជ័យ', 'success');
      closeModal('modal-user');
      await loadUsers();
    } else {
      showToast(data.error || 'បរាជ័យក្នុងការរក្សាទុកគណនី', 'error');
    }
  } catch (e) {
    showToast('បរាជ័យក្នុងការរក្សាទុកគណនី', 'error');
  }
}

async function deleteUser(id) {
  if (!confirm('តើអ្នកពិតជាចង់លុបគណនីនេះមែនទេ?')) return;
  try {
    const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      showToast('បានលុបគណនីរួចរាល់', 'success');
      await loadUsers();
    } else {
      showToast(data.error || 'បរាជ័យក្នុងការលុប', 'error');
    }
  } catch (e) {
    showToast('បរាជ័យក្នុងការលុប', 'error');
  }
}

// Print & Export Previews
let currentPreviewType = '';
let currentPreviewId = null;

function previewDocument(type, id) {
  currentPreviewType = type;
  currentPreviewId = id;

  const item = fuelList.find(t => t.id === id) || (fuelList[0] || {});
  const container = document.getElementById('preview-render-area');
  const titleEl = document.getElementById('preview-modal-title');
  const downloadBtn = document.getElementById('btn-download-word');

  let html = '';
  let downloadUrl = '';

  if (type === 'voucher') {
    titleEl.textContent = `🖨️ ប័ណ្ណបញ្ចេញប្រេង (លេខ ${item.voucher_no || item.id})`;
    html = PrintService.renderVoucher(item, currentSettings);
    downloadUrl = `/api/export/docx/voucher/${item.id}`;
    downloadBtn.style.display = 'inline-flex';
  } else if (type === 'request') {
    titleEl.textContent = `📄 សំណើសុំប្រេង (លេខ ${item.req_no || item.id})`;
    html = PrintService.renderRequest(item, currentSettings);
    downloadUrl = `/api/export/docx/request/${item.id}`;
    downloadBtn.style.display = 'inline-flex';
  } else if (type === 'financial') {
    titleEl.textContent = `📊 របាយការណ៍ហិរញ្ញវត្ថុ (ឧទ្ទេសនាម ${item.intro_no || item.id})`;
    html = PrintService.renderFinancial(item, currentSettings);
    downloadUrl = `/api/export/docx/financial/${item.id}`;
    downloadBtn.style.display = 'inline-flex';
  } else if (type === 'monthly') {
    titleEl.textContent = `📋 របាយការណ៍ប្រើប្រាស់ប្រេងឥន្ធនៈប្រចាំខែ`;
    html = PrintService.renderMonthly(stockData.summary || {}, currentSettings);
    downloadUrl = `/api/export/docx/monthly`;
    downloadBtn.style.display = 'inline-flex';
  }

  container.innerHTML = html;
  downloadBtn.onclick = () => {
    window.location.href = downloadUrl;
  };

  openModal('modal-preview');
}

function printDocumentNow() {
  const content = document.getElementById('preview-render-area').innerHTML;
  const printArea = document.getElementById('print-area');
  printArea.innerHTML = content;
  window.print();
}

// QR Code Wi-Fi Modal
function showWifiQRModal() {
  openModal('modal-wifi-qr');
}

// Save Settings Form
async function saveSettings(e) {
  e.preventDefault();
  const payload = {
    googleWebAppUrl: document.getElementById('setting-google-url').value,
    telegramBotToken: document.getElementById('setting-tg-token').value,
    telegramChatId: document.getElementById('setting-tg-chatid').value,
    telegramNotifyEnabled: document.getElementById('setting-tg-enabled').checked,
    unitName: document.getElementById('setting-unit-name').value,
    departmentName: document.getElementById('setting-dept-name').value,
    chiefName: document.getElementById('setting-chief-name').value,
    adminFinOfficer: document.getElementById('setting-fin-officer').value
  };

  try {
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.success) {
      currentSettings = data.settings;
      applySettingsToUI();
      showToast('បានរក្សាទុកការកំណត់ប្រព័ន្ធដោយជោគជ័យ', 'success');
    }
  } catch (err) {
    showToast('បរាជ័យក្នុងការរក្សាទុកការកំណត់', 'error');
  }
}

// Copy Google Apps Script code to clipboard
function copyAppsScriptCode() {
  const code = document.getElementById('apps-script-code-block').textContent;
  navigator.clipboard.writeText(code).then(() => {
    showToast('បានចម្លងកូដ Google Apps Script ទៅក្តារចម្លង (Clipboard) រួចរាល់!', 'success');
  }).catch(() => {
    showToast('សូមជ្រើសរើសហើយ Copy កូដដោយផ្ទាល់', 'info');
  });
}

// Reset Danger Zone
async function resetAllSystemData() {
  const confirmText = prompt('តើអ្នកពិតជាចង់កំណត់ទិន្នន័យប្រព័ន្ធឡើងវិញដំបូងមែនទេ? សូមវាយពាក្យ "RESET" ដើម្បីបញ្ជាក់:');
  if (confirmText !== 'RESET') {
    showToast('បានបោះបង់ការកំណត់ឡើងវិញ', 'info');
    return;
  }

  try {
    const res = await fetch('/api/system/reset-all-data', { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      showToast('បានកំណត់ប្រព័ន្ធឡើងវិញជោគជ័យ!', 'success');
      setTimeout(() => location.reload(), 1000);
    }
  } catch (e) {
    showToast('បរាជ័យក្នុងការកំណត់ប្រព័ន្ធឡើងវិញ', 'error');
  }
}

// Start
document.addEventListener('DOMContentLoaded', initApp);
