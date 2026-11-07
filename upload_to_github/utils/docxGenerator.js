// utils/docxGenerator.js
const AdmZip = require('adm-zip');
const path = require('path');
const fs = require('fs');
const { toKhmerDigits, numberToKhmerWords } = require('./khmerNumber');
const { formatKhmerSolarDate, formatKhmerBuddhistDate, formatKhmerFullSolarDate } = require('./khmerDate');

/**
 * Replace complex Word fields (MERGEFIELD) in document.xml
 */
function replaceMergeFields(xml, fieldMap) {
  // Pattern to capture full complex field
  const fieldPattern = /<w:fldChar\s+w:fldCharType="begin"\/>([\s\S]*?)<w:fldChar\s+w:fldCharType="end"\/>/g;

  return xml.replace(fieldPattern, (fullMatch) => {
    // Collect all instrText
    const instrs = [...fullMatch.matchAll(/<w:instrText[^>]*>([\s\S]*?)<\/w:instrText>/g)]
      .map(m => m[1])
      .join('')
      .trim();

    // Extract field key without "MERGEFIELD"
    const key = instrs.replace(/^MERGEFIELD\s+/i, '').replace(/\s+/g, '').trim();

    // Preserve formatting run properties if available
    const rPrMatch = fullMatch.match(/<w:rPr>[\s\S]*?<\/w:rPr>/);
    const rPr = rPrMatch ? rPrMatch[0] : '';

    // Check if key is in fieldMap
    let replacement = null;

    for (const [mapKey, mapVal] of Object.entries(fieldMap)) {
      const cleanMapKey = mapKey.replace(/\s+/g, '');
      if (key === cleanMapKey || key.startsWith(cleanMapKey) || cleanMapKey.startsWith(key)) {
        replacement = mapVal;
        break;
      }
    }

    if (replacement !== null && replacement !== undefined) {
      // Escape XML characters
      const escaped = String(replacement)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      return `<w:r>${rPr}<w:t xml:space="preserve">${escaped}</w:t></w:r>`;
    }

    // If no match found in fieldMap, preserve default run text or empty
    const tMatch = fullMatch.match(/<w:fldChar\s+w:fldCharType="separate"\/><w:r[^>]*>[\s\S]*?<w:t[^>]*>([\s\S]*?)<\/w:t>/);
    const defVal = tMatch ? tMatch[1] : '';
    return `<w:r>${rPr}<w:t xml:space="preserve">${defVal}</w:t></w:r>`;
  });
}

/**
 * 1. Generate Voucher (.docx) - ប័ណ្ណបញ្ចេញប្រេង
 */
function generateVoucherDocx(item) {
  const templatePath = path.join(__dirname, '..', 'templates', '2_voucher.docx');
  const zip = new AdmZip(templatePath);
  let xml = zip.readAsText('word/document.xml');

  const dateObj = item.date ? new Date(item.date) : new Date();
  const solarDate = formatKhmerFullSolarDate(dateObj, 'តាកែវ');
  const solarDateShort = formatKhmerSolarDate(dateObj);
  const buddhistDate = formatKhmerBuddhistDate(dateObj);

  const fieldMap = {
    'លេខប័ណ្ណ15': item.voucher_no ? `${toKhmerDigits(item.voucher_no)}/២៤ ល.ប/ត.ក` : '_____/២៤ ល.ប/ត.ក',
    'លេខសំណើ14': item.req_no ? `${toKhmerDigits(item.req_no)}/២៤ ល.ប/ត.ក` : '_____/២៤ ល.ប/ត.ក',
    'ចុះថ្ងៃទី111': solarDateShort,
    'ឈ្មោះអ្នកស្នើសុំ1': item.requester_name || '',
    'តួនាទីអ្នកស្នើ3': item.role || '',
    'សម្រាប់ប្រើប្រាស់4': item.purpose || '',
    'ប្រេងម៉ាស៊ូតDO': item.diesel_out > 0 ? String(item.diesel_out) : '00',
    'ប្រេងម៉ាស៊ូតអក្សរ1': item.diesel_out > 0 ? numberToKhmerWords(item.diesel_out, 'លីត្រ') : 'សូន្យលីត្រ',
    'ប្រេងសាំងEA': item.gasoline_out > 0 ? String(item.gasoline_out) : '00',
    'ប្រេងសាំងអក្សរ': item.gasoline_out > 0 ? numberToKhmerWords(item.gasoline_out, 'លីត្រ') : 'សូន្យលីត្រ',
    'ប្រេងម៉ាស៊ីនMO': item.oil_out > 0 ? String(item.oil_out) : '00',
    'ប្រេងម៉ាស៊ីនអក្សរ2': item.oil_out > 0 ? numberToKhmerWords(item.oil_out, 'លីត្រ') : 'សូន្យលីត្រ',
    'ថ្ងៃខែឆ្នាំចន្ទគតិ3': buddhistDate,
    'ថ្ងៃខែឆ្នាំសូរិយគតិ4': solarDate
  };

  xml = replaceMergeFields(xml, fieldMap);
  zip.updateFile('word/document.xml', Buffer.from(xml, 'utf-8'));
  return zip.toBuffer();
}

/**
 * 2. Generate Request (.docx) - សំណើ
 */
function generateRequestDocx(item) {
  const templatePath = path.join(__dirname, '..', 'templates', '3_request.docx');
  const zip = new AdmZip(templatePath);
  let xml = zip.readAsText('word/document.xml');

  const dateObj = item.date ? new Date(item.date) : new Date();
  const solarDate = formatKhmerFullSolarDate(dateObj, 'តាកែវ');
  const buddhistDate = formatKhmerBuddhistDate(dateObj);

  // Determine main fuel requested
  let fuelType = 'ប្រេងម៉ាស៊ូត(D.O)';
  let amount = item.diesel_out || 0;
  if (item.gasoline_out > 0) {
    fuelType = 'ប្រេងសាំង(E.A)';
    amount = item.gasoline_out;
  } else if (item.oil_out > 0 && item.diesel_out === 0) {
    fuelType = 'ប្រេងម៉ាស៊ីន(M.O)';
    amount = item.oil_out;
  }

  const pronoun = item.gender === 'ស' ? 'នាងខ្ញុំ' : 'ខ្ញុំបាទ';

  const fieldMap = {
    'លេខសំណើ14': item.req_no ? `${toKhmerDigits(item.req_no)}/២៤ ល.ប/ត.ក` : '_____/២៤ ល.ប/ត.ក',
    'ប្រភេទប្រេង7': fuelType,
    'ចំនួន8': String(amount || 0),
    'អក្សរខ្មែរ9': numberToKhmerWords(amount, 'លីត្រ'),
    'សម្រាប់ប្រើប្រាស់4': item.purpose || '',
    'ខ្ញុំបាទនាងខ្ញុំ': pronoun,
    'ឈ្មោះអ្នកស្នើសុំ1': item.requester_name || '',
    'តួនាទី': item.role || '',
    'ថ្ងៃខែឆ្នាំចន្ទគតិ3': buddhistDate,
    'ថ្ងៃខែឆ្នាំសូរិយគតិ4': solarDate
  };

  xml = replaceMergeFields(xml, fieldMap);
  zip.updateFile('word/document.xml', Buffer.from(xml, 'utf-8'));
  return zip.toBuffer();
}

/**
 * 3. Generate Financial Report (.docx) - របាយការណ៍ហិរញ្ញវត្ថុ
 */
function generateFinancialDocx(item, team = []) {
  const templatePath = path.join(__dirname, '..', 'templates', '4_financial_report.docx');
  const zip = new AdmZip(templatePath);
  let xml = zip.readAsText('word/document.xml');

  const dateObj = item.date ? new Date(item.date) : new Date();
  const solarDate = formatKhmerFullSolarDate(dateObj, 'តាកែវ');
  const solarDateShort = formatKhmerSolarDate(dateObj);
  const buddhistDate = formatKhmerBuddhistDate(dateObj);
  const pronoun = item.gender === 'ស' ? 'នាងខ្ញុំ' : 'ខ្ញុំបាទ';

  const member1 = team[0] || { honorific: item.honorific || 'លោក', name: item.requester_name || '', role: item.role || 'មន្ត្រី' };
  const member2 = team[1] || { honorific: 'លោក', name: 'សុច សុវណ្ណរិទ្ធ', role: 'ការីការងាររដ្ឋបាល' };

  const fieldMap = {
    'របាយការណ៍ស្តីពី6': item.purpose || 'ចុះបំពេញបេសកកម្មការងារ',
    'លេខឧទ្ទេសនាម131': item.intro_no ? `${toKhmerDigits(item.intro_no)}/២៤ ល.ប/ត.ក` : '_____/២៤ ល.ប/ត.ក',
    'ចុះថ្ងៃទី111': solarDateShort,
    'ខ្ញុំបាទនាងខ្ញុំ': pronoun,
    'ងារ11': member1.honorific || 'លោក',
    'ឈ្មោះក្នុងឧទ្ទេសនាម12': member1.name || '',
    'តួនាទី13': member1.role || '',
    'ងារ21': member2.honorific || 'លោក',
    'ឈ្មោះក្នុងឧទ្ទេសនាម22': member2.name || '',
    'តួនាទី23': member2.role || '',
    'ឧទ្ទេសនាម5': item.purpose || '',
    'ឈ្មោះអ្នកស្នើសុំ1': item.requester_name || '',
    'ថ្ងៃខែឆ្នាំចន្ទគតិ3': buddhistDate,
    'ថ្ងៃខែឆ្នាំសូរិយគតិ4': solarDate
  };

  xml = replaceMergeFields(xml, fieldMap);
  zip.updateFile('word/document.xml', Buffer.from(xml, 'utf-8'));
  return zip.toBuffer();
}

/**
 * 4. Generate Monthly Fuel Usage (.docx) - របាយការណ៍ប្រើប្រាស់ប្រេង
 */
function generateMonthlyDocx(summaryData) {
  const templatePath = path.join(__dirname, '..', 'templates', '5_monthly_usage.docx');
  const zip = new AdmZip(templatePath);
  let xml = zip.readAsText('word/document.xml');

  const dateObj = summaryData.date ? new Date(summaryData.date) : new Date();
  const solarDate = formatKhmerFullSolarDate(dateObj, 'តាកែវ');
  const buddhistDate = formatKhmerBuddhistDate(dateObj);
  const monthName = summaryData.monthName || 'កញ្ញា';
  const yearKh = toKhmerDigits(summaryData.year || 2024);

  // Update header title month & year if needed
  xml = xml.replace(/កញ្ញា/g, monthName);
  xml = xml.replace(/២០២៤/g, yearKh);

  // Find table and replace stock numbers
  // Row 1: Gasoline EA
  // Row 2: Diesel DO
  // Row 3: Oil MO
  const g = summaryData.gasoline || { open: 250, in: 0, total: 250, out: 250, close: 0 };
  const d = summaryData.diesel || { open: 640, in: 0, total: 640, out: 640, close: 0 };
  const o = summaryData.oil || { open: 50, in: 0, total: 50, out: 50, close: 0 };

  // Clean any residual MERGEFIELD
  xml = xml.replace(/<w:fldChar\s+w:fldCharType="begin"\/>[\s\S]*?<w:fldChar\s+w:fldCharType="end"\/>/g, '');

  // Update table cells regex safely
  // We can locate the table rows and substitute the cell values
  const tableMatch = xml.match(/<w:tbl[\s\S]*?<\/w:tbl>/);
  if (tableMatch) {
    let tblXml = tableMatch[0];
    const rows = [...tblXml.matchAll(/<w:tr[\s\S]*?<\/w:tr>/g)];

    function updateRowValues(rowXml, vals) {
      let cellIdx = 0;
      return rowXml.replace(/<w:tc[\s\S]*?<\/w:tc>/g, (tcXml) => {
        // Values start at cell 3 (opening, in, total, out, close)
        if (cellIdx >= 3 && cellIdx <= 7) {
          const val = vals[cellIdx - 3];
          // Replace inner <w:t>...</w:t>
          tcXml = tcXml.replace(/<w:t[^>]*>[\s\S]*?<\/w:t>/g, '');
          tcXml = tcXml.replace(/(<\/w:pPr>)/, `$1<w:r><w:rPr><w:rFonts w:ascii="Khmer OS Siemreap" w:hAnsi="Khmer OS Siemreap" w:cs="Khmer OS Siemreap"/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr><w:t>${val}</w:t></w:r>`);
        }
        cellIdx++;
        return tcXml;
      });
    }

    if (rows[1]) {
      const updatedR1 = updateRowValues(rows[1][0], [g.open, g.in, g.total, g.out, g.close]);
      tblXml = tblXml.replace(rows[1][0], updatedR1);
    }
    if (rows[2]) {
      const updatedR2 = updateRowValues(rows[2][0], [d.open, d.in, d.total, d.out, d.close]);
      tblXml = tblXml.replace(rows[2][0], updatedR2);
    }
    if (rows[3]) {
      const updatedR3 = updateRowValues(rows[3][0], [o.open, o.in, o.total, o.out, o.close]);
      tblXml = tblXml.replace(rows[3][0], updatedR3);
    }

    xml = xml.replace(tableMatch[0], tblXml);
  }

  // Update Buddhist and solar dates
  xml = xml.replace(/ថ្ងៃសៅរ៍ ៤រោច ខែភទ្របទ ឆ្នាំរោង ឆស័ក ព\.ស\.\s*២៥៦៨/g, buddhistDate);
  xml = xml.replace(/តាកែវ ថ្ងៃទី២១ ខែកញ្ញា ឆ្នាំ២០២៤/g, solarDate);

  zip.updateFile('word/document.xml', Buffer.from(xml, 'utf-8'));
  return zip.toBuffer();
}

module.exports = {
  generateVoucherDocx,
  generateRequestDocx,
  generateFinancialDocx,
  generateMonthlyDocx
};
