/**
 * Google Apps Script សម្រាប់ភ្ជាប់ Google Sheet ជាមួយ ប្រព័ន្ធគ្រប់គ្រងរបាយការណ៍ប្រេង (PEC21)
 * 
 * របៀបតម្លើង (How to deploy):
 * ១. បង្កើត Google Sheet ថ្មីមួយនៅលើ Google Drive
 * ២. ចុច Extensions (ផ្នែកបន្ថែម) -> Apps Script
 * ៣. លុបកូដចាស់ចោល ហើយចម្លង (Copy) កូដខាងក្រោមនេះទាំងស្រុងទៅបិទភ្ជាប់ (Paste)
 * ៤. ចុច Deploy (ដាក់ឱ្យដំណើរការ) -> New deployment (ការដាក់ឱ្យដំណើរការថ្មី)
 * ៥. ជ្រើសរើសប្រភេទ (Select type): Web app (កម្មវិធីគេហទំព័រ)
 * ៦. កំណត់ "Who has access" (អ្នកណាមានសិទ្ធិចូលប្រើ): "Anyone" (នរណាម្នាក់)
 * ៧. ចុច Deploy -> អនុញ្ញាតសិទ្ធិ (Authorize access)
 * ៨. ចម្លង Web App URL យកទៅបិទភ្ជាប់ក្នុងទំព័រ "ការកំណត់ & Cloud (Settings)" ក្នុងកម្មវិធី។
 */

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: "ok",
    message: "Google Sheets Web App Endpoint សម្រាប់គ្រប់គ្រងរបាយការណ៍ប្រេង PEC21 ដំណើរការធម្មតា!",
    timestamp: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    var rawData = e.postData.contents;
    var data = JSON.parse(rawData);
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    if (data.action === "sync_all") {
      // 1. Sheet បញ្ជីរាយនាមមន្ត្រី
      if (data.staff && Array.isArray(data.staff)) {
        var staffSheet = ss.getSheetByName("បញ្ជីរាយនាម") || ss.insertSheet("បញ្ជីរាយនាម");
        staffSheet.clear();
        staffSheet.appendRow(["ល.រ", "គោត្តនាម-នាម", "ភេទ", "ងារ", "តួនាទី", "លេខទូរស័ព្ទ", "យានយន្ត/ស្លាកលេខ"]);
        data.staff.forEach(function(s, idx) {
          staffSheet.appendRow([
            s.id || idx + 1,
            s.name || "",
            s.gender || "",
            s.honorific || "",
            s.role || "",
            s.phone || "",
            s.vehicle || ""
          ]);
        });
      }

      // 2. Sheet ការប្រើប្រាស់ប្រេង
      if (data.fuelTransactions && Array.isArray(data.fuelTransactions)) {
        var txSheet = ss.getSheetByName("ការប្រើប្រាស់ប្រេង") || ss.insertSheet("ការប្រើប្រាស់ប្រេង");
        txSheet.clear();
        txSheet.appendRow([
          "ល.រ", "កាលបរិច្ឆេទ", "លេខបេសកកម្ម", "លេខឧទ្ទេសនាម", "លេខសំណើ", "លេខប័ណ្ណ",
          "ឈ្មោះអ្នកស្នើសុំ", "ងារ", "តួនាទី", "គោលបំណង/មធ្យោបាយ",
          "សាំង EA បញ្ចូល", "សាំង EA បញ្ចេញ",
          "ម៉ាស៊ូត DO បញ្ចូល", "ម៉ាស៊ូត DO បញ្ចេញ",
          "ប្រេងម៉ាស៊ីន MO បញ្ចូល", "ប្រេងម៉ាស៊ីន MO បញ្ចេញ",
          "ស្ថានភាព"
        ]);

        data.fuelTransactions.forEach(function(tx, idx) {
          txSheet.appendRow([
            idx + 1,
            tx.date || "",
            tx.mission_no || "",
            tx.intro_no || "",
            tx.req_no || "",
            tx.voucher_no || "",
            tx.requester_name || "",
            tx.honorific || "",
            tx.role || "",
            tx.purpose || tx.description || "",
            tx.gasoline_in || 0,
            tx.gasoline_out || 0,
            tx.diesel_in || 0,
            tx.diesel_out || 0,
            tx.oil_in || 0,
            tx.oil_out || 0,
            tx.status || "approved"
          ]);
        });
      }

      // 3. Sheet សន្និធិប្រេង (Stock Summary)
      var stockSheet = ss.getSheetByName("សន្និធិប្រេង") || ss.insertSheet("សន្និធិប្រេង");
      stockSheet.clear();
      stockSheet.appendRow(["ប្រភេទប្រេង", "សមតុល្យដើមគ្រា", "បញ្ចូលក្នុងគ្រា", "បញ្ចេញក្នុងគ្រា", "សមតុល្យចុងគ្រា"]);
      
      var op = data.stockOpening || { gasoline: 250, diesel: 640, oil: 50 };
      var inf = data.stockInflow || { gasoline: 0, diesel: 0, oil: 0 };
      
      // Calculate totals
      var gasOut = 0, dieselOut = 0, oilOut = 0;
      if (data.fuelTransactions) {
        data.fuelTransactions.forEach(function(t) {
          gasOut += Number(t.gasoline_out) || 0;
          dieselOut += Number(t.diesel_out) || 0;
          oilOut += Number(t.oil_out) || 0;
        });
      }

      stockSheet.appendRow(["ប្រេងសាំង (E.A)", op.gasoline, inf.gasoline, gasOut, (Number(op.gasoline) + Number(inf.gasoline) - gasOut)]);
      stockSheet.appendRow(["ប្រេងម៉ាស៊ូត (D.O)", op.diesel, inf.diesel, dieselOut, (Number(op.diesel) + Number(inf.diesel) - dieselOut)]);
      stockSheet.appendRow(["ប្រេងម៉ាស៊ីន (M.O)", op.oil, inf.oil, oilOut, (Number(op.oil) + Number(inf.oil) - oilOut)]);

      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        message: "ទិន្នន័យត្រូវបានធ្វើសមកាលកម្មទៅកាន់ Google Sheet ដោយជោគជ័យ!",
        count: (data.fuelTransactions ? data.fuelTransactions.length : 0),
        timestamp: new Date().toISOString()
      })).setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: "ignored",
      message: "មិនមាន action ត្រូវអនុវត្ត"
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
