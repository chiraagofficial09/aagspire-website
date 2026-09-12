import { Types } from 'mongoose';

export function toDecimal(val: number | string | Types.Decimal128): Types.Decimal128 {
  if (val instanceof Types.Decimal128) {
    return val;
  }
  const num = typeof val === 'string' ? parseFloat(val) : val;
  const rounded = (isNaN(num) ? 0 : num).toFixed(2);
  return Types.Decimal128.fromString(rounded);
}

export function fromDecimal(val: any): number {
  if (!val) return 0;
  if (val instanceof Types.Decimal128) {
    return parseFloat(val.toString());
  }
  if (typeof val === 'number') {
    return parseFloat(val.toFixed(2));
  }
  if (typeof val === 'string') {
    const parsed = parseFloat(val);
    return isNaN(parsed) ? 0 : parseFloat(parsed.toFixed(2));
  }
  if (typeof val === 'object' && '$numberDecimal' in val) {
    return parseFloat(val.$numberDecimal);
  }
  return 0;
}

export function round2(num: number): number {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}
