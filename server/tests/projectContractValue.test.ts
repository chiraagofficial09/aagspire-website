import assert from 'node:assert/strict';
import test from 'node:test';
import { Types } from 'mongoose';
import { getNetProjectValue } from '../src/services/dashboardFinance.js';
import { extractNetProjectValue } from '../src/services/projectCommissionCalculator.js';
import { calculateCommissionAmounts, calculateDiscountedSplit } from '../src/services/commission.service.js';

const split = { brokerPercent: 10, employeePercent: 40, officePercent: 10, adminPercent: 35, settlementPercent: 5 };

test('legacy flat and percentage discounts never reduce the entered contract value', () => {
  for (const [project, expected] of [
    [{ projectValue: 500, discountAmount: 500, discountPercent: 100 }, 500],
    [{ projectValue: '500', discountAmount: 900 }, 500],
    [{ projectValue: Types.Decimal128.fromString('500.25'), discountPercent: 100 }, 500.25],
    [{ projectValue: { $numberDecimal: '500.25' }, discountAmount: { $numberDecimal: '500.25' } }, 500.25],
    [{ projectValue: 0, discountPercent: 100 }, 0],
  ] as const) {
    assert.equal(getNetProjectValue(project), expected);
    assert.equal(extractNetProjectValue(project), expected);
    assert.equal(Math.max(0, getNetProjectValue(project) - 100), Math.max(0, expected - 100));
  }
});

test('commission ignores legacy discounts while retaining production cost deduction', () => {
  const amounts = calculateCommissionAmounts(1000, split, 100, 200);
  assert.equal(Number(amounts.employeeAmount.toString()), 320);
  const result = calculateDiscountedSplit(1000, 100, split);
  assert.equal(result.netProjectValue, 1000);
  assert.equal(result.discountAmount, 0);
  assert.equal(result.split.employeeAmount, 400);
});
