// db.js
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data', 'database.json');
const BACKUPS_DIR = path.join(__dirname, 'data', 'backups');

const DEFAULT_USERS = [
  {
    id: 1,
    username: 'superadmin',
    password: 'admin123', // In production or settings, user can change
    name: 'អភិបាលជាន់ខ្ពស់ (SuperAdmin)',
    role: 'SuperAdmin',
    roleLabel: 'អភិបាលជាន់ខ្ពស់',
    active: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 2,
    username: 'admin',
    password: 'admin123',
    name: 'អភិបាលទូទៅ (Admin)',
    role: 'Admin',
    roleLabel: 'អភិបាល',
    active: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 3,
    username: 'pec21',
    password: 'pec123',
    name: 'គណៈកម្មការរៀបចំការបោះឆ្នោត (PEC21)',
    role: 'PEC21',
    roleLabel: 'PEC21',
    active: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 4,
    username: 'officer',
    password: 'officer123',
    name: 'មន្ត្រី ល.ខ.ប (Officer)',
    role: 'មន្ត្រី ល.ខ.ប',
    roleLabel: 'មន្ត្រី ល.ខ.ប',
    active: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 5,
    username: 'clerk',
    password: 'clerk123',
    name: 'អ្នកបញ្ចូលទិន្នន័យ (Clerk)',
    role: 'អ្នកបញ្ចូលទិន្នន័យ',
    roleLabel: 'អ្នកបញ្ចូលទិន្នន័យ',
    active: true,
    createdAt: new Date().toISOString()
  }
];

const DEFAULT_SETTINGS = {
  appName: 'ប្រព័ន្ធគ្រប់គ្រងរបាយការណ៍ ល.ខ.ប តាកែវ (PEC21)',
  orgName: 'គណៈកម្មការរៀបចំការបោះឆ្នោតខេត្តតាកែវ (PEC21)',
  subOrgName: 'លេខាធិការដ្ឋានរៀបចំការបោះឆ្នោត ខេត្តតាកែវ (ល.ខ.ប)',
  location: 'តាកែវ',
  unitName: 'គ.ជ.ប',
  departmentName: 'ល.ខ.ប តាកែវ',
  stationName: 'ស្ថានីយប្រេងឥន្ធនៈ សូគីម៉ិច ខេត្តតាកែវ',
  chiefName: 'ហែម បញ្ញា',
  chiefTitle: 'លោកស្រី',
  chiefRole: 'ប្រធាន ល.ខ.ប',
  adminFinOfficer: 'វ៉ាន់ សេរីរ័ត្ន',
  adminFinRole: 'ប្រធានផ្នែករដ្ឋបាល និងហិរញ្ញវត្ថុ',
  storageMode: 'dual', // 'local', 'wifi', 'online', 'sheet', 'dual'
  googleWebAppUrl: '',
  lastGoogleSync: null,
  telegramBotToken: '',
  telegramChatId: '',
  telegramNotifyEnabled: false
};

class Database {
  constructor() {
    this.data = null;
    this.init();
  }

  init() {
    if (!fs.existsSync(path.dirname(DB_PATH))) {
      fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    }
    if (!fs.existsSync(BACKUPS_DIR)) {
      fs.mkdirSync(BACKUPS_DIR, { recursive: true });
    }

    if (fs.existsSync(DB_PATH)) {
      try {
        const raw = fs.readFileSync(DB_PATH, 'utf-8');
        this.data = JSON.parse(raw);
      } catch (e) {
        console.error('Error reading database.json, re-initializing:', e);
        this.data = this.createInitialData();
        this.save();
      }
    } else {
      this.data = this.createInitialData();
      this.save();
    }
  }

  createInitialData() {
    let initialStaff = [];
    let initialTransactions = [];

    const seedStaffPath = path.join(__dirname, 'seed_staff.json');
    if (fs.existsSync(seedStaffPath)) {
      try {
        initialStaff = JSON.parse(fs.readFileSync(seedStaffPath, 'utf-8'));
      } catch (e) {
        console.error('Error loading seed_staff.json:', e);
      }
    }

    const seedFuelPath = path.join(__dirname, 'initial_fuel_data.json');
    if (fs.existsSync(seedFuelPath)) {
      try {
        initialTransactions = JSON.parse(fs.readFileSync(seedFuelPath, 'utf-8'));
      } catch (e) {
        console.error('Error loading initial_fuel_data.json:', e);
      }
    }

    return {
      settings: { ...DEFAULT_SETTINGS },
      users: [...DEFAULT_USERS],
      staff: initialStaff,
      stockOpening: {
        gasoline: 250,
        diesel: 640,
        oil: 50,
        periodName: 'យោងរបាយការណ៍ខែសីហា ឆ្នាំ២០២៤'
      },
      stockInflow: {
        gasoline: 0,
        diesel: 0,
        oil: 0,
        source: 'ទទួលប្រេងពី គ.ជ.ប'
      },
      inflows: [],
      fuelTransactions: initialTransactions,
      auditLogs: [
        {
          id: 1,
          action: 'SYSTEM_INIT',
          details: 'បានចាប់ផ្តើមប្រព័ន្ធគ្រប់គ្រងរបាយការណ៍ប្រេង PEC21 ដំបូង',
          user: 'System',
          timestamp: new Date().toISOString()
        }
      ]
    };
  }

  save() {
    try {
      const tempPath = `${DB_PATH}.tmp`;
      fs.writeFileSync(tempPath, JSON.stringify(this.data, null, 2), 'utf-8');
      fs.renameSync(tempPath, DB_PATH);
    } catch (err) {
      console.error('Failed to save database.json:', err);
    }
  }

  createBackup() {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = path.join(BACKUPS_DIR, `backup_${timestamp}.json`);
      fs.writeFileSync(backupPath, JSON.stringify(this.data, null, 2), 'utf-8');
      return path.basename(backupPath);
    } catch (err) {
      console.error('Failed to create backup:', err);
      return null;
    }
  }

  restoreBackup(backupFilename) {
    const backupPath = path.join(BACKUPS_DIR, backupFilename);
    if (!fs.existsSync(backupPath)) {
      throw new Error('រកមិនឃើញ File Backup នេះទេ');
    }
    const raw = fs.readFileSync(backupPath, 'utf-8');
    this.data = JSON.parse(raw);
    this.save();
    return true;
  }

  resetAll() {
    this.createBackup();
    this.data = this.createInitialData();
    this.save();
    return true;
  }

  // Stock Calculation
  getStockSummary() {
    const opening = this.data.stockOpening || { gasoline: 250, diesel: 640, oil: 50 };
    const inflow = this.data.stockInflow || { gasoline: 0, diesel: 0, oil: 0 };
    const transactions = this.data.fuelTransactions || [];

    let gasOut = 0;
    let dieselOut = 0;
    let oilOut = 0;

    transactions.forEach(tx => {
      gasOut += Number(tx.gasoline_out) || 0;
      dieselOut += Number(tx.diesel_out) || 0;
      oilOut += Number(tx.oil_out) || 0;
    });

    const gasTotal = Number(opening.gasoline) + Number(inflow.gasoline);
    const dieselTotal = Number(opening.diesel) + Number(inflow.diesel);
    const oilTotal = Number(opening.oil) + Number(inflow.oil);

    return {
      gasoline: {
        open: Number(opening.gasoline),
        in: Number(inflow.gasoline),
        total: gasTotal,
        out: gasOut,
        close: Math.max(0, gasTotal - gasOut)
      },
      diesel: {
        open: Number(opening.diesel),
        in: Number(inflow.diesel),
        total: dieselTotal,
        out: dieselOut,
        close: Math.max(0, dieselTotal - dieselOut)
      },
      oil: {
        open: Number(opening.oil),
        in: Number(inflow.oil),
        total: oilTotal,
        out: oilOut,
        close: Math.max(0, oilTotal - oilOut)
      },
      transactionsCount: transactions.length,
      staffCount: (this.data.staff || []).length
    };
  }
}

const db = new Database();
module.exports = db;
