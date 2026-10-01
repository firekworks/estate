import test from 'node:test';
import assert from 'node:assert/strict';
import {xirr,forecastError} from '../src/lib/estate-performance.ts';
test('XIRR matches dated one-year ten-percent return',()=>assert.ok(Math.abs(xirr([{date:'2025-01-01',amount:-1000},{date:'2026-01-01',amount:1100}])-.1)<1e-9));
test('XIRR handles loss and rejects ambiguous or missing cashflows',()=>{assert.ok(xirr([{date:'2025-01-01',amount:-1000},{date:'2026-01-01',amount:900}])<0);assert.equal(xirr([{date:'2025-01-01',amount:-1000}]),null);assert.equal(xirr([{date:'2025-01-01',amount:-1000},{date:'2025-06-01',amount:2000},{date:'2026-01-01',amount:-500}]),null);});
test('forecast error preserves missing data and handles zero forecast',()=>{assert.equal(forecastError(null,640),null);assert.deepEqual(forecastError(0,10),{absolute:10,relative:null});assert.equal(forecastError(660,640).absolute,-20);});
