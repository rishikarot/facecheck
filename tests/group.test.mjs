import test from 'node:test';
import assert from 'node:assert/strict';
import {rankGroupCandidates,normalizePolicy} from '../src/engine.js';
const candidate=(distance,x=70,w=180,h=180)=>({distance,confidence:.94,box:{x,y:40,width:w,height:h}});
test('the correct candidate is selected even when not the first detected face',()=>{
  const r=rankGroupCandidates([candidate(.71,20),candidate(.31,300),candidate(.66,540)]);
  assert.equal(r.result,'possible_match');assert.equal(r.detectedFaces,undefined);
  assert.equal(r.best.index,2);assert.equal(r.candidates.length,3);
});
test('does not force a match when all group faces differ',()=>{
  const r=rankGroupCandidates([candidate(.87),candidate(.72)]);
  assert.equal(r.result,'no_match');assert.equal(r.best.index,2);
});
test('similar distances must be reviewed even when best candidate is strong',()=>{
  const r=rankGroupCandidates([candidate(.37,20),candidate(.40,250)]);
  assert.equal(r.result,'review');assert.ok(r.explanation.includes('similarly'));
});
test('tiny candidate is review, not accepted',()=>{
  const r=rankGroupCandidates([candidate(.28,20,32,40),candidate(.77,280)]);
  assert.equal(r.result,'review');assert.ok(r.explanation.includes('small'));
});
test('no detected faces gives no match candidate',()=>{
  const r=rankGroupCandidates([]);assert.equal(r.result,'no_faces');assert.equal(r.best,null);
});
test('borderline distance is review',()=>{
  const r=rankGroupCandidates([candidate(.54)]);assert.equal(r.result,'review');
});
test('pure ranking never returns a verified identity or attendance status',()=>{
  const r=rankGroupCandidates([candidate(.3)]);
  assert.equal('verifiedIdentity' in r,false);assert.equal('attendanceAuthorized' in r,false);
});
