// utils/khmerDate.js
const { toKhmerDigits } = require('./khmerNumber');

const KHMER_DAYS = [
  'អាទិត្យ', 'ច័ន្ទ', 'អង្គារ', 'ពុធ', 'ព្រហស្បតិ៍', 'សុក្រ', 'សៅរ៍'
];

const KHMER_MONTHS = [
  'មករា', 'កុម្ភៈ', 'មីនា', 'មេសា', 'ឧសភា', 'មិថុនា',
  'កក្កដា', 'សីហា', 'កញ្ញា', 'តុលា', 'វិច្ឆិកា', 'ធ្នូ'
];

// Traditional Khmer Lunar months
const LUNAR_MONTHS = [
  'មិគសិរ', 'បុស្ស', 'មាឃ', 'ផល្គុន', 'ចេត្រ', 'ពិសាខ',
  'ជេស្ឋ', 'អាសាឍ', 'ស្រាពណ៍', 'ភទ្របទ', 'អស្សុជ', 'កត្តិក'
];

// 12 Zodiac animals
const ZODIAC_YEARS = [
  'ជូត', 'ឆ្លូវ', 'ខាល', 'ថោះ', 'រោង', 'ម្សាញ់',
  'មមី', 'មមែ', 'វក', 'រកា', 'ចរ', 'កុរ'
];

const SAK_NAMES = [
  'ឯកស័ក', 'ទោស័ក', 'ត្រីស័ក', 'ចត្វាស័ក', 'បញ្ចស័ក',
  'ឆស័ក', 'សប្តស័ក', 'អដ្ឋស័ក', 'នព្វស័ក', 'សំរឹទ្ធិស័ក'
];

function formatKhmerSolarDate(dateInput) {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';
  const day = toKhmerDigits(d.getDate());
  const month = KHMER_MONTHS[d.getMonth()];
  const year = toKhmerDigits(d.getFullYear());
  return `ថ្ងៃទី${day} ខែ${month} ឆ្នាំ${year}`;
}

function formatKhmerFullSolarDate(dateInput, location = 'តាកែវ') {
  if (!dateInput) return '';
  const solar = formatKhmerSolarDate(dateInput);
  return location ? `${location} ${solar}` : solar;
}

function formatKhmerBuddhistDate(dateInput) {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';

  const dayOfWeek = KHMER_DAYS[d.getDay()];
  const gregorianYear = d.getFullYear();
  const buddhistYear = toKhmerDigits(gregorianYear + 544);

  // Zodiac calculation: 2024 is year of Dragon (រោង), 2025 Snake (ម្សាញ់), 2026 Horse (មមី)
  // Base 2020 was Rat (ជូត, idx 0)
  const zodiacIdx = (gregorianYear - 2020 + 1200) % 12;
  const zodiac = ZODIAC_YEARS[zodiacIdx];

  // Sak calculation: 2024 was ឆស័ក (6th, idx 5)
  // (2024 - 4) % 10 = 0 -> ឆស័ក
  const sakIdx = (gregorianYear - 2024 + 5 + 100) % 10;
  const sak = SAK_NAMES[sakIdx];

  // Approximated Lunar Phase from day of month for display
  const mDay = d.getDate();
  let lunarDayStr = '';
  if (mDay <= 15) {
    lunarDayStr = `${toKhmerDigits(mDay)}កើត`;
  } else {
    lunarDayStr = `${toKhmerDigits(mDay - 15)}រោច`;
  }

  // Lunar Month approximated from Gregorian month
  // Roughly September is ភទ្របទ
  const lMonthIdx = (d.getMonth() + 12) % 12;
  const lunarMonth = LUNAR_MONTHS[lMonthIdx] || 'ភទ្របទ';

  return `ថ្ងៃ${dayOfWeek} ${lunarDayStr} ខែ${lunarMonth} ឆ្នាំ${zodiac} ${sak} ព.ស. ${buddhistYear}`;
}

module.exports = {
  KHMER_DAYS,
  KHMER_MONTHS,
  formatKhmerSolarDate,
  formatKhmerFullSolarDate,
  formatKhmerBuddhistDate
};
