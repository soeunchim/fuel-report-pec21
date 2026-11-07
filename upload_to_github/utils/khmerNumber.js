// utils/khmerNumber.js

const khmerDigits = ['០', '១', '២', '៣', '៤', '៥', '៦', '៧', '៨', '៩'];
const ones = ['', 'មួយ', 'ពីរ', 'បី', 'បួន', 'ប្រាំ', 'ប្រាំមួយ', 'ប្រាំពីរ', 'ប្រាំបី', 'ប្រាំបួន'];
const tens = ['', 'ដប់', 'ម្ភៃ', 'សាមសិប', 'សែសិប', 'ហាសិប', 'ហុកសិប', 'ចិតសិប', 'ប៉ែតសិប', 'កៅសិប'];

function toKhmerDigits(num) {
  if (num === null || num === undefined) return '';
  return String(num).replace(/[0-9]/g, d => khmerDigits[parseInt(d, 10)]);
}

function fromKhmerDigits(str) {
  if (!str) return '';
  return String(str).replace(/[០-៩]/g, d => khmerDigits.indexOf(d));
}

function numberToKhmerWords(n, unit = 'លីត្រ') {
  if (n === null || n === undefined || n === '') return '';
  const val = Number(n);
  if (isNaN(val)) return '';
  if (val === 0) return 'សូន្យ' + unit;

  function convertGroup(v) {
    let res = '';
    const h = Math.floor(v / 100);
    const rem = v % 100;
    if (h > 0) {
      res += ones[h] + 'រយ';
    }
    if (rem > 0) {
      const t = Math.floor(rem / 10);
      const o = rem % 10;
      if (t > 0) {
        res += tens[t];
      }
      if (o > 0) {
        res += ones[o];
      }
    }
    return res;
  }

  let result = '';
  let temp = val;
  if (temp >= 1000000) {
    const mil = Math.floor(temp / 1000000);
    result += convertGroup(mil) + 'លាន';
    temp = temp % 1000000;
  }
  if (temp >= 1000) {
    const k = Math.floor(temp / 1000);
    result += convertGroup(k) + 'ពាន់';
    temp = temp % 1000;
  }
  if (temp > 0) {
    result += convertGroup(temp);
  }

  return (result + (unit ? ' ' + unit : '')).trim();
}

module.exports = {
  toKhmerDigits,
  fromKhmerDigits,
  numberToKhmerWords
};
