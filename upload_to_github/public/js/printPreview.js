// public/js/printPreview.js

const PrintService = {
  toKhmerDigits(num) {
    if (num === null || num === undefined) return '';
    const khmerDigits = ['០', '១', '២', '៣', '៤', '៥', '៦', '៧', '៨', '៩'];
    return String(num).replace(/[0-9]/g, d => khmerDigits[parseInt(d, 10)]);
  },

  numberToKhmerWords(n, unit = 'លីត្រ') {
    if (n === null || n === undefined || n === '') return '';
    const val = Number(n);
    if (isNaN(val)) return '';
    if (val === 0) return 'សូន្យ' + unit;

    const ones = ['', 'មួយ', 'ពីរ', 'បី', 'បួន', 'ប្រាំ', 'ប្រាំមួយ', 'ប្រាំពីរ', 'ប្រាំបី', 'ប្រាំបួន'];
    const tens = ['', 'ដប់', 'ម្ភៃ', 'សាមសិប', 'សែសិប', 'ហាសិប', 'ហុកសិប', 'ចិតសិប', 'ប៉ែតសិប', 'កៅសិប'];

    function convertGroup(v) {
      let res = '';
      const h = Math.floor(v / 100);
      const rem = v % 100;
      if (h > 0) res += ones[h] + 'រយ';
      if (rem > 0) {
        const t = Math.floor(rem / 10);
        const o = rem % 10;
        if (t > 0) res += tens[t];
        if (o > 0) res += ones[o];
      }
      return res;
    }

    let result = '';
    let temp = val;
    if (temp >= 1000) {
      const k = Math.floor(temp / 1000);
      result += convertGroup(k) + 'ពាន់';
      temp = temp % 1000;
    }
    if (temp > 0) result += convertGroup(temp);
    return (result + (unit ? ' ' + unit : '')).trim();
  },

  formatKhmerSolarDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    const months = ['មករា', 'កុម្ភៈ', 'មីនា', 'មេសា', 'ឧសភា', 'មិថុនា', 'កក្កដា', 'សីហា', 'កញ្ញា', 'តុលា', 'វិច្ឆិកា', 'ធ្នូ'];
    return `ថ្ងៃទី${this.toKhmerDigits(d.getDate())} ខែ${months[d.getMonth()]} ឆ្នាំ${this.toKhmerDigits(d.getFullYear())}`;
  },

  // 1. Voucher Preview (ប័ណ្ណបញ្ចេញប្រេង)
  renderVoucher(item, settings) {
    const sDate = this.formatKhmerSolarDate(item.date);
    const gasOut = Number(item.gasoline_out) || 0;
    const dieselOut = Number(item.diesel_out) || 0;
    const oilOut = Number(item.oil_out) || 0;

    return `
      <div style="font-family: 'Kantumruy Pro', 'Siemreap', sans-serif; padding: 25px; color: #000; line-height: 1.6; font-size: 13.5px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="font-family: 'Moul', cursive; font-size: 18px; margin-bottom: 6px;">ប័ណ្ណបញ្ចេញប្រេងឥន្ធនៈ</h2>
          <div style="display: flex; justify-content: space-between; font-size: 13px; font-weight: 500; margin-top: 10px;">
            <div style="text-align: left;">
              <div>អង្គភាព ៖ <b>${settings.unitName || 'គ.ជ.ប'}</b></div>
              <div>ផ្នែក ៖ <b>${settings.departmentName || 'ល.ខ.ប តាកែវ'}</b></div>
            </div>
            <div style="text-align: right;">
              <div>លេខ ៖ <b>${this.toKhmerDigits(item.voucher_no || item.id)}/២៤ ល.ប/ត.ក</b></div>
            </div>
          </div>
        </div>

        <div style="margin-bottom: 15px; border-top: 1px dashed #cbd5e1; padding-top: 10px;">
          <p><b>យោង ៖</b> សំណើលេខ <b>${this.toKhmerDigits(item.req_no || item.id)}/២៤ ល.ប/ត.ក</b> ចុះ ${sDate}</p>
          <p><b>ឈ្មោះអ្នកស្នើសុំ ៖</b> ${item.honorific || ''} ${item.requester_name || ''} &nbsp;&nbsp;&nbsp;&nbsp; <b>ឋានៈ/តួនាទី ៖</b> ${item.role || ''}</p>
          <p><b>មធ្យោបាយប្រើប្រាស់ ៖</b> ${item.purpose || ''}</p>
          <p><b>បញ្ចេញនៅឃ្លាំង ៖</b> ${settings.stationName || 'ស្ថានីយប្រេងឥន្ធនៈ សូគីម៉ិច ខេត្តតាកែវ'}។</p>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px;" border="1" cellpadding="6">
          <thead>
            <tr style="background: #f1f5f9; text-align: center;">
              <th rowspan="2" style="width: 40px;">ល.រ</th>
              <th rowspan="2">ប្រភេទប្រេងឥន្ធនៈ</th>
              <th rowspan="2" style="width: 60px;">ឯកតាគិត</th>
              <th colspan="2">ចំនួន</th>
              <th rowspan="2">ទឹកប្រាក់សរសេរជាអក្សរ</th>
            </tr>
            <tr style="background: #f8fafc; text-align: center;">
              <th style="width: 80px;">សំណូមពរ</th>
              <th style="width: 80px;">បញ្ចេញពិត</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="text-align: center;">១</td>
              <td>ប្រេងម៉ាស៊ូត (D.O)</td>
              <td style="text-align: center;">លីត្រ</td>
              <td style="text-align: center;">${dieselOut > 0 ? dieselOut : '00'}</td>
              <td style="text-align: center;">${dieselOut > 0 ? dieselOut : '00'}</td>
              <td>${dieselOut > 0 ? this.numberToKhmerWords(dieselOut, 'លីត្រ') : 'សូន្យលីត្រ'}</td>
            </tr>
            <tr>
              <td style="text-align: center;">២</td>
              <td>ប្រេងសាំង (E.A)</td>
              <td style="text-align: center;">លីត្រ</td>
              <td style="text-align: center;">${gasOut > 0 ? gasOut : '00'}</td>
              <td style="text-align: center;">${gasOut > 0 ? gasOut : '00'}</td>
              <td>${gasOut > 0 ? this.numberToKhmerWords(gasOut, 'លីត្រ') : 'សូន្យលីត្រ'}</td>
            </tr>
            <tr>
              <td style="text-align: center;">៣</td>
              <td>ប្រេងម៉ាស៊ីន (M.O)</td>
              <td style="text-align: center;">លីត្រ</td>
              <td style="text-align: center;">${oilOut > 0 ? oilOut : '00'}</td>
              <td style="text-align: center;">${oilOut > 0 ? oilOut : '00'}</td>
              <td>${oilOut > 0 ? this.numberToKhmerWords(oilOut, 'លីត្រ') : 'សូន្យលីត្រ'}</td>
            </tr>
            <tr style="font-weight: bold; background: #f8fafc;">
              <td colspan="3" style="text-align: center;">សរុប</td>
              <td style="text-align: center;">${gasOut + dieselOut + oilOut}</td>
              <td style="text-align: center;">${gasOut + dieselOut + oilOut}</td>
              <td>${this.numberToKhmerWords(gasOut + dieselOut + oilOut, 'លីត្រ')}</td>
            </tr>
          </tbody>
        </table>

        <div style="display: flex; justify-content: space-between; margin-top: 30px; text-align: center;">
          <div style="width: 30%;">
            <div><b>អ្នកកាន់ឃ្លាំង</b></div>
            <div style="height: 65px;"></div>
            <div>.....................................</div>
          </div>
          <div style="width: 30%;">
            <div><b>អ្នកទទួលប្រេង</b></div>
            <div style="height: 65px;"></div>
            <div><b>${item.requester_name || ''}</b></div>
          </div>
          <div style="width: 35%;">
            <div>${settings.location || 'តាកែវ'}, ${sDate}</div>
            <div><b>${settings.adminFinRole || 'ប្រធានផ្នែករដ្ឋបាល និងហិរញ្ញវត្ថុ'}</b></div>
            <div style="height: 50px;"></div>
            <div><b>${settings.adminFinOfficer || 'វ៉ាន់ សេរីរ័ត្ន'}</b></div>
          </div>
        </div>
      </div>
    `;
  },

  // 2. Request Preview (សំណើ)
  renderRequest(item, settings) {
    const sDate = this.formatKhmerSolarDate(item.date);
    const pronoun = item.gender === 'ស' ? 'នាងខ្ញុំ' : 'ខ្ញុំបាទ';

    let fuelType = 'ប្រេងម៉ាស៊ូត (D.O)';
    let amount = item.diesel_out || 0;
    if (item.gasoline_out > 0) {
      fuelType = 'ប្រេងសាំង (E.A)';
      amount = item.gasoline_out;
    } else if (item.oil_out > 0 && !item.diesel_out) {
      fuelType = 'ប្រេងម៉ាស៊ីន (M.O)';
      amount = item.oil_out;
    }

    return `
      <div style="font-family: 'Kantumruy Pro', 'Siemreap', sans-serif; padding: 25px; color: #000; line-height: 1.7; font-size: 14px;">
        <div style="text-align: center; margin-bottom: 15px;">
          <h3 style="font-family: 'Moul', cursive; font-size: 15px; margin-bottom: 4px;">ព្រះរាជាណាចក្រកម្ពុជា</h3>
          <h4 style="font-family: 'Moul', cursive; font-size: 14px; margin-bottom: 10px;">ជាតិ សាសនា ព្រះមហាក្សត្រ</h4>
          <div style="width: 60px; height: 1px; background: #000; margin: 0 auto 15px auto;"></div>
        </div>

        <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
          <div>
            <div style="font-family: 'Moul', cursive; font-size: 12px;">${settings.unitName || 'គណៈកម្មាធិការជាតិរៀបចំការបោះឆ្នោត'}</div>
            <div style="font-weight: 600;">${settings.subOrgName || 'លេខាធិការដ្ឋានរៀបចំការបោះឆ្នោត ខេត្តតាកែវ'}</div>
            <div>លេខៈ <b>${this.toKhmerDigits(item.req_no || item.id)}/២៤ ល.ប/ត.ក</b></div>
          </div>
        </div>

        <div style="text-align: center; margin: 15px 0;">
          <h3 style="font-family: 'Moul', cursive; font-size: 15px;">សូមគោរពជូន</h3>
          <p style="font-weight: 600;">${settings.chiefTitle || 'លោកស្រី'}ប្រធានលេខាធិការដ្ឋានរៀបចំការបោះឆ្នោត ខេត្តតាកែវ</p>
        </div>

        <div style="margin: 20px 0;">
          <p style="text-indent: 30px;"><b>កម្មវត្ថុ ៖</b> សំណើសុំ ${fuelType} ចំនួន <b>${amount} លីត្រ (${this.numberToKhmerWords(amount, 'លីត្រ')})</b>។</p>
          <p style="text-indent: 30px; margin-top: 10px;"><b>សម្រាប់ប្រើប្រាស់ ៖</b> ${item.purpose || ''}</p>
          <p style="text-indent: 30px; margin-top: 10px;">អាស្រ័យហេតុដូចបានគោរពជម្រាបជូនខាងលើ សូម ${settings.chiefTitle || 'លោកស្រី'}ប្រធាន មេត្តាពិនិត្យលទ្ធភាព និងសម្រេចអនុញ្ញាតផ្ដល់ប្រេងឥន្ធនៈឱ្យតាមសំណើ ដោយក្ដីអនុគ្រោះ។</p>
          <p style="text-indent: 30px; margin-top: 10px;">សូម ${settings.chiefTitle || 'លោកស្រី'}ប្រធាន មេត្តាទទួលនូវការគោរពដ៏ខ្ពង់ខ្ពស់អំពី${pronoun}។</p>
        </div>

        <div style="display: flex; justify-content: space-between; margin-top: 40px; text-align: center;">
          <div style="width: 45%;">
            <div><b>បានឃើញ និងឯកភាព</b></div>
            <div>${settings.location || 'តាកែវ'}, ${sDate}</div>
            <div><b>${settings.chiefRole || 'ប្រធាន ល.ខ.ប'}</b></div>
            <div style="height: 60px;"></div>
            <div style="font-family: 'Moul', cursive; font-size: 13px;">${settings.chiefName || 'ហែម បញ្ញា'}</div>
          </div>
          <div style="width: 45%;">
            <div>${settings.location || 'តាកែវ'}, ${sDate}</div>
            <div><b>អ្នកស្នើសុំ</b></div>
            <div style="height: 60px;"></div>
            <div><b>${item.honorific || ''} ${item.requester_name || ''}</b></div>
          </div>
        </div>
      </div>
    `;
  },

  // 3. Financial Report Preview (របាយការណ៍ហិរញ្ញវត្ថុ)
  renderFinancial(item, settings) {
    const sDate = this.formatKhmerSolarDate(item.date);
    const pronoun = item.gender === 'ស' ? 'នាងខ្ញុំ' : 'ខ្ញុំបាទ';

    return `
      <div style="font-family: 'Kantumruy Pro', 'Siemreap', sans-serif; padding: 25px; color: #000; line-height: 1.7; font-size: 13.5px;">
        <div style="text-align: center; margin-bottom: 15px;">
          <h3 style="font-family: 'Moul', cursive; font-size: 15px; margin-bottom: 4px;">ព្រះរាជាណាចក្រកម្ពុជា</h3>
          <h4 style="font-family: 'Moul', cursive; font-size: 14px; margin-bottom: 10px;">ជាតិ សាសនា ព្រះមហាក្សត្រ</h4>
          <div style="width: 60px; height: 1px; background: #000; margin: 0 auto 15px auto;"></div>
        </div>

        <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
          <div>
            <div style="font-family: 'Moul', cursive; font-size: 12px;">${settings.unitName || 'គណៈកម្មាធិការជាតិរៀបចំការបោះឆ្នោត'}</div>
            <div style="font-weight: 600;">${settings.subOrgName || 'លេខាធិការដ្ឋានរៀបចំការបោះឆ្នោត ខេត្តតាកែវ'}</div>
          </div>
        </div>

        <div style="text-align: center; margin: 15px 0;">
          <h3 style="font-family: 'Moul', cursive; font-size: 15px;">សូមគោរពជូន</h3>
          <p style="font-weight: 600;">${settings.chiefTitle || 'លោកស្រី'}ប្រធានលេខាធិការដ្ឋានរៀបចំការបោះឆ្នោត ខេត្តតាកែវ</p>
        </div>

        <div style="margin: 15px 0;">
          <p><b>កម្មវត្ថុ ៖</b> របាយការណ៍ស្តីពី ${item.purpose || 'ការចុះបំពេញបេសកកម្មការងារ'}។</p>
          <p><b>យោង ៖</b> ឧទ្ទេសនាមលេខ <b>${this.toKhmerDigits(item.intro_no || item.id)}/២៤ ល.ប/ត.ក</b> ចុះ ${sDate} របស់ ល.ខ.ប។</p>
          <p style="text-indent: 30px; margin-top: 8px;">តបតាមកម្មវត្ថុ និងយោងខាងលើ ${pronoun}មានកិត្តិយសសូមគោរពជម្រាបជូន ${settings.chiefTitle || 'លោកស្រី'}ប្រធាន មេត្តាជ្រាបថា នៅ ${sDate} ក្រុមការងារ ល.ខ.ប បានចុះអនុវត្តការងារដូចខាងក្រោម៖</p>

          <div style="margin-left: 20px; margin-top: 10px;">
            <p><b>I- សមាសភាពចូលរួម ៖</b></p>
            <p>១. ${item.honorific || 'លោក'} <b>${item.requester_name || ''}</b> តួនាទីជា ${item.role || 'មន្ត្រី'}</p>
            <p>២. លោក <b>សុច សុវណ្ណរិទ្ធ</b> តួនាទីជា ការីការងាររដ្ឋបាល</p>
            
            <p style="margin-top: 8px;"><b>II- គោលបំណង ៖</b></p>
            <p>${item.purpose || ''}</p>

            <p style="margin-top: 8px;"><b>III- លទ្ធផល ៖</b></p>
            <p>ដំណើរការចុះបំពេញបេសកកម្មបានប្រព្រឹត្តទៅដោយរលូន តាមគោលការណ៍ណែនាំរបស់ ល.ខ.ប ពុំមានបញ្ហាអ្វីគួរឱ្យកត់សម្គាល់ឡើយ និងបានបញ្ចប់ដោយជោគជ័យ។</p>
          </div>

          <p style="text-indent: 30px; margin-top: 12px;">អាស្រ័យហេតុដូចបានគោរពជម្រាបជូនខាងលើ សូម ${settings.chiefTitle || 'លោកស្រី'}ប្រធាន មេត្តាជ្រាបជារបាយការណ៍។</p>
        </div>

        <div style="display: flex; justify-content: flex-end; margin-top: 30px; text-align: center;">
          <div style="width: 45%;">
            <div>${settings.location || 'តាកែវ'}, ${sDate}</div>
            <div><b>អ្នកធ្វើរបាយការណ៍</b></div>
            <div style="height: 60px;"></div>
            <div><b>${item.requester_name || ''}</b></div>
          </div>
        </div>
      </div>
    `;
  },

  // 4. Monthly Report Preview (របាយការណ៍ប្រើប្រាស់ប្រេង)
  renderMonthly(stockSummary, settings) {
    const sDate = this.formatKhmerSolarDate(new Date());
    const g = stockSummary.gasoline || { open: 250, in: 0, total: 250, out: 250, close: 0 };
    const d = stockSummary.diesel || { open: 640, in: 0, total: 640, out: 640, close: 0 };
    const o = stockSummary.oil || { open: 50, in: 0, total: 50, out: 50, close: 0 };

    return `
      <div style="font-family: 'Kantumruy Pro', 'Siemreap', sans-serif; padding: 25px; color: #000; line-height: 1.7; font-size: 13.5px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h3 style="font-family: 'Moul', cursive; font-size: 16px;">សូមគោរពជូន</h3>
          <h4 style="font-family: 'Moul', cursive; font-size: 14px; margin-top: 4px;">ឯកឧត្តមប្រធានគណៈកម្មាធិការជាតិរៀបចំការបោះឆ្នោត</h4>
        </div>

        <p><b>កម្មវត្ថុ ៖</b> របាយការណ៍ប្រើប្រាស់ប្រេងឥន្ធនៈប្រចាំខែកញ្ញា ឆ្នាំ២០២៤</p>
        <p style="text-indent: 30px; margin-top: 10px;">តបតាមកម្មវត្ថុខាងលើ នាងខ្ញុំមានកិត្តិយសសូមជម្រាបជូន ឯកឧត្តមប្រធាន មេត្តាជ្រាបថាៈ លេខាធិការដ្ឋានរៀបចំការបោះឆ្នោត ខេត្តតាកែវ បានទទួលប្រេងឥន្ធនៈពី គ.ជ.ប សម្រាប់ប្រើប្រាស់ក្នុងដំណាក់កាលការពិនិត្យបញ្ជីឈ្មោះ និងការចុះឈ្មោះបោះឆ្នោត ឆ្នាំ២០២៤ នៅ ល.ខ.ប មានឆ្លុះបញ្ចាំងនៅក្នុងតារាងដូចខាងក្រោម៖</p>

        <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 13px;" border="1" cellpadding="6">
          <thead>
            <tr style="background: #f1f5f9; text-align: center; font-weight: bold;">
              <th>ល.រ</th>
              <th>ប្រភេទប្រេងឥន្ធនៈ</th>
              <th>ឯកតា</th>
              <th>សមតុល្យដើមគ្រា</th>
              <th>បញ្ចូលក្នុងគ្រា</th>
              <th>សរុបក្នុងគ្រា</th>
              <th>បញ្ចេញក្នុងគ្រា</th>
              <th>សមតុល្យចុងគ្រា</th>
            </tr>
          </thead>
          <tbody>
            <tr style="text-align: center;">
              <td>១</td>
              <td style="text-align: left;">ប្រេងសាំង (E.A)</td>
              <td>លីត្រ</td>
              <td>${g.open}</td>
              <td>${g.in}</td>
              <td>${g.total}</td>
              <td>${g.out}</td>
              <td><b>${g.close}</b></td>
            </tr>
            <tr style="text-align: center;">
              <td>២</td>
              <td style="text-align: left;">ប្រេងម៉ាស៊ូត (D.O)</td>
              <td>លីត្រ</td>
              <td>${d.open}</td>
              <td>${d.in}</td>
              <td>${d.total}</td>
              <td>${d.out}</td>
              <td><b>${d.close}</b></td>
            </tr>
            <tr style="text-align: center;">
              <td>៣</td>
              <td style="text-align: left;">ប្រេងម៉ាស៊ីន (M.O)</td>
              <td>លីត្រ</td>
              <td>${o.open}</td>
              <td>${o.in}</td>
              <td>${o.total}</td>
              <td>${o.out}</td>
              <td><b>${o.close}</b></td>
            </tr>
          </tbody>
        </table>

        <p style="text-indent: 30px;">អាស្រ័យហេតុដូចបានគោរពជម្រាបជូនខាងលើ សូម ឯកឧត្តមប្រធាន មេត្តាជ្រាបជារបាយការណ៍។</p>
        <p style="text-indent: 30px;">សូម ឯកឧត្តមប្រធាន មេត្តាទទួលនូវការគោរពដ៏ខ្ពង់ខ្ពស់អំពីនាងខ្ញុំ។</p>

        <div style="display: flex; justify-content: flex-end; margin-top: 40px; text-align: center;">
          <div style="width: 45%;">
            <div>${settings.location || 'តាកែវ'}, ${sDate}</div>
            <div><b>ប្រធានលេខាធិការដ្ឋានខេត្តរៀបចំការបោះឆ្នោត</b></div>
            <div style="height: 65px;"></div>
            <div style="font-family: 'Moul', cursive; font-size: 13px;">${settings.chiefName || 'ហែម បញ្ញា'}</div>
          </div>
        </div>
      </div>
    `;
  }
};
