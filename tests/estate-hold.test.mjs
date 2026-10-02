import test from 'node:test';
import assert from 'node:assert/strict';
import {projectHold} from '../src/lib/estate-hold.ts';
const base={value:100000,debt:0,annualRatePct:0,remainingTermYears:0,horizonYears:2,appreciationPct:0,discountPct:0,monthlyNoi:500,saleCosts:2000,annualCapex:1000};
test('unlevered hold separates cash, terminal proceeds and sale today',()=>{const r=projectHold(base);assert.equal(r.totalCash,10000);assert.equal(r.terminalNet,98000);assert.equal(r.advantagePresentValue,10000);});
test('hold amortizes remaining principal and stops payments after payoff',()=>{const r=projectHold({...base,debt:12000,remainingTermYears:1});assert.equal(r.rows[0].debt,0);assert.equal(r.rows[0].cash,-7000);assert.equal(r.rows[1].cash,5000);});
test('opportunity cost discounts future proceeds and missing financing is rejected',()=>{assert.ok(projectHold({...base,discountPct:10}).advantagePresentValue<0);assert.equal(projectHold({...base,debt:1000}),null);assert.equal(projectHold({...base,horizonYears:0}),null);});
