export function generateEmployeeCode(seq: number): string {
  const pad = seq.toString().padStart(4, '0');
  return `AAG-EMP-${pad}`;
}

export function generateClientCode(seq: number): string {
  const pad = seq.toString().padStart(4, '0');
  return `AAG-CLI-${pad}`;
}

export function generateProjectCode(seq: number, year: number = new Date().getFullYear()): string {
  const pad = seq.toString().padStart(4, '0');
  return `AAG-PRJ-${year}-${pad}`;
}

export function generateSettlementCode(seq: number, year: number = new Date().getFullYear()): string {
  const pad = seq.toString().padStart(4, '0');
  return `AAG-SET-${year}-${pad}`;
}

export function generateReceiptCode(seq: number, year: number = new Date().getFullYear()): string {
  const pad = seq.toString().padStart(4, '0');
  return `AAG-RCP-${year}-${pad}`;
}
