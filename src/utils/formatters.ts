/**
 * Safely parses any amount (number, string, or Mongoose Decimal128 object { $numberDecimal: "..." })
 */
export function parseAmount(val: any): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (typeof val === 'string') {
    const num = parseFloat(val);
    return isNaN(num) ? 0 : num;
  }
  if (typeof val === 'object') {
    if (val.$numberDecimal !== undefined) {
      const num = parseFloat(val.$numberDecimal);
      return isNaN(num) ? 0 : num;
    }
    if (val.value !== undefined) return parseAmount(val.value);
    if (val.amount !== undefined) return parseAmount(val.amount);
    if (val.totalAmount !== undefined) return parseAmount(val.totalAmount);
    if (val.projectValue !== undefined) return parseAmount(val.projectValue);
    if (typeof val.toString === 'function') {
      const str = val.toString();
      if (str && str !== '[object Object]') {
        const num = parseFloat(str);
        return isNaN(num) ? 0 : num;
      }
    }
  }
  return 0;
}

/**
 * Formats value as Indian Rupee (e.g. ₹50,000)
 */
export function formatINR(val: any): string {
  const num = parseAmount(val);
  return `₹${num.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}
