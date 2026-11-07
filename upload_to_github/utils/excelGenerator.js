// utils/excelGenerator.js
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');
const { numberToKhmerWords, toKhmerDigits } = require('./khmerNumber');

function generateExcelReport(dbData) {
  const templatePath = path.join(__dirname, '..', 'templates', '1_fuel_report.xlsx');
  const wb = XLSX.readFile(templatePath, { cellStyles: true });

  const transactions = dbData.fuelTransactions || [];
  const staffList = dbData.staff || [];
  const opening = dbData.stockOpening || { gasoline: 250, diesel: 640, oil: 50 };
  const inflow = dbData.stockInflow || { gasoline: 0, diesel: 0, oil: 0 };

  // 1. Update Staff Sheet (បញ្ជីរាយនាម)
  if (wb.Sheets['បញ្ជីរាយនាម']) {
    const ws = wb.Sheets['បញ្ជីរាយនាម'];
    staffList.forEach((s, idx) => {
      const r = idx + 2;
      ws[`A${r}`] = { t: 'n', v: s.id || idx + 1 };
      ws[`B${r}`] = { t: 's', v: s.name || '' };
      ws[`C${r}`] = { t: 's', v: s.gender || '' };
      ws[`D${r}`] = { t: 's', v: s.honorific || '' };
      ws[`E${r}`] = { t: 's', v: s.role || '' };
    });
  }

  // 2. Update Fuel Usage Sheet (ការប្រើប្រាស់ប្រេងឥន្ធនៈ)
  if (wb.Sheets['ការប្រើប្រាស់ប្រេងឥន្ធនៈ']) {
    const ws = wb.Sheets['ការប្រើប្រាស់ប្រេងឥន្ធនៈ'];

    // Row 17: Opening
    ws['I17'] = { t: 'n', v: Number(opening.gasoline) || 0 };
    ws['L17'] = { t: 'n', v: Number(opening.diesel) || 0 };
    ws['O17'] = { t: 'n', v: Number(opening.oil) || 0 };

    // Row 18: Inflow
    if (inflow.gasoline > 0) ws['G18'] = { t: 'n', v: Number(inflow.gasoline) };
    if (inflow.diesel > 0) ws['J18'] = { t: 'n', v: Number(inflow.diesel) };
    if (inflow.oil > 0) ws['M18'] = { t: 'n', v: Number(inflow.oil) };

    let curGas = Number(opening.gasoline) + Number(inflow.gasoline);
    let curDiesel = Number(opening.diesel) + Number(inflow.diesel);
    let curOil = Number(opening.oil) + Number(inflow.oil);

    // Starting at Row 19
    transactions.forEach((tx, idx) => {
      const r = idx + 19;
      const gasOut = Number(tx.gasoline_out) || 0;
      const gasIn = Number(tx.gasoline_in) || 0;
      const dieselOut = Number(tx.diesel_out) || 0;
      const dieselIn = Number(tx.diesel_in) || 0;
      const oilOut = Number(tx.oil_out) || 0;
      const oilIn = Number(tx.oil_in) || 0;

      curGas = curGas + gasIn - gasOut;
      curDiesel = curDiesel + dieselIn - dieselOut;
      curOil = curOil + oilIn - oilOut;

      ws[`A${r}`] = { t: 's', v: tx.date || '' };
      ws[`B${r}`] = { t: 's', v: tx.mission_no || '' };
      ws[`C${r}`] = { t: 's', v: tx.intro_no || '' };
      ws[`D${r}`] = { t: 's', v: tx.req_no || '' };
      ws[`E${r}`] = { t: 's', v: tx.voucher_no || '' };
      ws[`F${r}`] = { t: 's', v: tx.purpose || tx.description || '' };

      if (gasIn > 0) ws[`G${r}`] = { t: 'n', v: gasIn };
      if (gasOut > 0) ws[`H${r}`] = { t: 'n', v: gasOut };
      ws[`I${r}`] = { t: 'n', v: Math.max(0, curGas) };

      if (dieselIn > 0) ws[`J${r}`] = { t: 'n', v: dieselIn };
      if (dieselOut > 0) ws[`K${r}`] = { t: 'n', v: dieselOut };
      ws[`L${r}`] = { t: 'n', v: Math.max(0, curDiesel) };

      if (oilIn > 0) ws[`M${r}`] = { t: 'n', v: oilIn };
      if (oilOut > 0) ws[`N${r}`] = { t: 'n', v: oilOut };
      ws[`O${r}`] = { t: 'n', v: Math.max(0, curOil) };
    });

    const lastRow = Math.max(transactions.length + 18, 63);
    ws['!ref'] = `A1:P${lastRow}`;
  }

  // 3. Update Monthly Report Sheet (របាយការណ៍ប្រចាំខែ)
  if (wb.Sheets['របាយការណ៍ប្រចាំខែ']) {
    const ws = wb.Sheets['របាយការណ៍ប្រចាំខែ'];
    let totGasOut = 0;
    let totDieselOut = 0;
    let totOilOut = 0;

    transactions.forEach((tx, idx) => {
      const r = idx + 21;
      const gasOut = Number(tx.gasoline_out) || 0;
      const dieselOut = Number(tx.diesel_out) || 0;
      const oilOut = Number(tx.oil_out) || 0;

      totGasOut += gasOut;
      totDieselOut += dieselOut;
      totOilOut += oilOut;

      ws[`A${r}`] = { t: 'n', v: idx + 1 };
      ws[`B${r}`] = { t: 's', v: tx.date || '' };
      ws[`C${r}`] = { t: 's', v: tx.mission_no || '' };
      ws[`D${r}`] = { t: 's', v: tx.intro_no || '' };
      ws[`E${r}`] = { t: 's', v: tx.req_no || '' };
      ws[`F${r}`] = { t: 's', v: tx.voucher_no || '' };
      ws[`G${r}`] = { t: 's', v: tx.purpose || tx.description || '' };
      ws[`H${r}`] = { t: 's', v: 'លីត្រ' };

      if (gasOut > 0) ws[`I${r}`] = { t: 'n', v: gasOut };
      if (dieselOut > 0) ws[`J${r}`] = { t: 'n', v: dieselOut };
      if (oilOut > 0) ws[`K${r}`] = { t: 'n', v: oilOut };
    });

    // Balances
    ws['I16'] = { t: 'n', v: Number(opening.gasoline) };
    ws['J16'] = { t: 'n', v: Number(opening.diesel) };
    ws['K16'] = { t: 'n', v: Number(opening.oil) };

    const totGas = Number(opening.gasoline) + Number(inflow.gasoline);
    const totDiesel = Number(opening.diesel) + Number(inflow.diesel);
    const totOil = Number(opening.oil) + Number(inflow.oil);

    ws['I18'] = { t: 'n', v: totGas };
    ws['J18'] = { t: 'n', v: totDiesel };
    ws['K18'] = { t: 'n', v: totOil };

    ws['I19'] = { t: 'n', v: totGasOut };
    ws['J19'] = { t: 'n', v: totDieselOut };
    ws['K19'] = { t: 'n', v: totOilOut };

    ws['I20'] = { t: 'n', v: Math.max(0, totGas - totGasOut) };
    ws['J20'] = { t: 'n', v: Math.max(0, totDiesel - totDieselOut) };
    ws['K20'] = { t: 'n', v: Math.max(0, totOil - totOilOut) };
  }

  // 4. Update Link Sheet
  if (wb.Sheets['Link']) {
    const ws = wb.Sheets['Link'];
    transactions.forEach((tx, idx) => {
      const r = idx + 2;
      const gas = Number(tx.gasoline_out) || 0;
      const diesel = Number(tx.diesel_out) || 0;
      const oil = Number(tx.oil_out) || 0;

      ws[`A${r}`] = { t: 'n', v: idx + 1 };
      ws[`B${r}`] = { t: 's', v: tx.honorific || 'លោក' };
      ws[`C${r}`] = { t: 's', v: tx.requester_name || '' };
      ws[`D${r}`] = { t: 's', v: tx.gender || 'ប' };
      ws[`E${r}`] = { t: 's', v: tx.role || '' };
      ws[`F${r}`] = { t: 's', v: gas > 0 ? String(gas) : '00' };
      ws[`G${r}`] = { t: 's', v: gas > 0 ? numberToKhmerWords(gas, 'លីត្រ') : 'សូន្យលីត្រ' };
      ws[`H${r}`] = { t: 's', v: diesel > 0 ? String(diesel) : '00' };
      ws[`I${r}`] = { t: 's', v: diesel > 0 ? numberToKhmerWords(diesel, 'លីត្រ') : 'សូន្យលីត្រ' };
      ws[`J${r}`] = { t: 's', v: oil > 0 ? String(oil) : '00' };
      ws[`K${r}`] = { t: 's', v: oil > 0 ? numberToKhmerWords(oil, 'លីត្រ') : 'សូន្យលីត្រ' };
      ws[`L${r}`] = { t: 's', v: tx.purpose || '' };
      ws[`M${r}`] = { t: 's', v: tx.gender === 'ស' ? 'នាងខ្ញុំ' : 'ខ្ញុំបាទ' };
    });
  }

  const outBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  return outBuffer;
}

module.exports = {
  generateExcelReport
};
