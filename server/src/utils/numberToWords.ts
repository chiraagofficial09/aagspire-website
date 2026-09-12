// Utility to convert numbers to formal Indian currency words: e.g. "Rupees Forty-Five Thousand Two Hundred Only"

const ONES = [
  '',
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
  'Eleven',
  'Twelve',
  'Thirteen',
  'Fourteen',
  'Fifteen',
  'Sixteen',
  'Seventeen',
  'Eighteen',
  'Nineteen',
];

const TENS = [
  '',
  '',
  'Twenty',
  'Thirty',
  'Forty',
  'Fifty',
  'Sixty',
  'Seventy',
  'Eighty',
  'Ninety',
];

function convertBelowThousand(num: number): string {
  let str = '';
  if (num >= 100) {
    str += ONES[Math.floor(num / 100)] + ' Hundred ';
    num %= 100;
  }
  if (num > 0) {
    if (num < 20) {
      str += ONES[num] + ' ';
    } else {
      str += TENS[Math.floor(num / 10)] + ' ';
      if (num % 10 > 0) {
        str += ONES[num % 10] + ' ';
      }
    }
  }
  return str.trim();
}

export function numberToIndianWords(amount: number): string {
  const rounded = Math.round(Number(amount) || 0);
  if (rounded === 0) return 'Rupees Zero Only';

  let remaining = Math.abs(rounded);
  let result = '';

  const crore = Math.floor(remaining / 10000000);
  remaining %= 10000000;
  if (crore > 0) {
    result += convertBelowThousand(crore) + ' Crore ';
  }

  const lakh = Math.floor(remaining / 100000);
  remaining %= 100000;
  if (lakh > 0) {
    result += convertBelowThousand(lakh) + ' Lakh ';
  }

  const thousand = Math.floor(remaining / 1000);
  remaining %= 1000;
  if (thousand > 0) {
    result += convertBelowThousand(thousand) + ' Thousand ';
  }

  if (remaining > 0) {
    result += convertBelowThousand(remaining) + ' ';
  }

  return `Rupees ${result.trim()} Only`;
}
