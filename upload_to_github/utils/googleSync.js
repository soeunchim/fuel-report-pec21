// utils/googleSync.js
const axios = require('axios');

async function syncWithGoogleSheet(webAppUrl, dbData) {
  if (!webAppUrl || !webAppUrl.startsWith('http')) {
    throw new Error('សូមបញ្ចូល Google Apps Script Web App URL ត្រឹមត្រូវ');
  }

  const payload = {
    action: 'sync_all',
    timestamp: new Date().toISOString(),
    fuelTransactions: dbData.fuelTransactions || [],
    staff: dbData.staff || [],
    stockOpening: dbData.stockOpening || { gasoline: 250, diesel: 640, oil: 50 },
    stockInflow: dbData.stockInflow || { gasoline: 0, diesel: 0, oil: 0 }
  };

  try {
    const res = await axios.post(webAppUrl, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 25000,
      maxRedirects: 5
    });

    return {
      success: true,
      message: 'ធ្វើសមកាលកម្មជាមួយ Google Sheet ជោគជ័យ!',
      data: res.data,
      syncedAt: new Date().toISOString()
    };
  } catch (err) {
    // If CORS or redirect requires simple GET test
    console.error('Google Sheet Sync Error:', err.message);
    throw new Error(`បរាជ័យក្នុងការតភ្ជាប់ Google Sheet: ${err.message}`);
  }
}

async function testGoogleSheetConnection(webAppUrl) {
  if (!webAppUrl || !webAppUrl.startsWith('http')) {
    throw new Error('Google Apps Script Web App URL មិនត្រឹមត្រូវ');
  }

  try {
    const res = await axios.get(webAppUrl, {
      timeout: 15000,
      maxRedirects: 5
    });
    return {
      success: true,
      status: res.status,
      message: 'ការតភ្ជាប់ទៅ Google Sheet ដំណើរការធម្មតា!'
    };
  } catch (err) {
    throw new Error(`មិនអាចភ្ជាប់ទៅកាន់ Google Sheet បានទេ: ${err.message}`);
  }
}

module.exports = {
  syncWithGoogleSheet,
  testGoogleSheetConnection
};
