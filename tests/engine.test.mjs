import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizePolicy,DEFAULT_POLICY} from '../src/engine.js';
test('defaults configure three randomized movements and fixed hold',()=>{let p=normalizePolicy();assert.equal(p.count,3);assert.equal(p.actions.length,4);assert.equal(p.retries,3)});
test('duplicate and unsupported actions are removed',()=>{let p=normalizePolicy({actions:['blink','blink','invalid','smile'],count:5});assert.deepEqual(p.actions,['blink','smile']);assert.equal(p.count,2)});
test('no liveness actions is invalid',()=>assert.throws(()=>normalizePolicy({actions:[]}),/at least one/));
test('thresholds cannot invert',()=>{let p=normalizePolicy({matchDistance:.9,reviewDistance:.1});assert.ok(p.reviewDistance>p.matchDistance)});
