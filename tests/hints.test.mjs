import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {solved} from '../dist/engine.js';
import {nextHint,applyHint,findCompletion} from '../dist/hints.js';

const levels=JSON.parse(fs.readFileSync(new URL('../dist/levels.json',import.meta.url)));
const fresh=()=>({dogs:[],marks:[],elapsed:0,mistakes:0,hints:0});

test('every board can be finished through safe exclusions first, then dog hints',()=>{
  for(const level of levels){
    let state=fresh(),steps=0;
    while(!solved(level,state.dogs)){
      const before=structuredClone(state),hint=nextHint(level,state);
      assert.ok(hint,`missing hint on level ${level.id}`);
      assert.deepEqual(state,before,'viewing a hint must not modify the board');
      assert.ok(hint.reason.length>20);
      if(hint.kind==='cross'){
        assert.ok(hint.indices.length>0);
        assert.ok(hint.indices.every(i=>!level.solution.includes(i)),`bad exclusion on level ${level.id}`);
      }else if(hint.kind==='dog'){
        assert.ok(level.regions.every((_,i)=>level.solution.includes(i)||state.marks.includes(i)),'dogs cannot be revealed before every exclusion is marked');
        assert.ok(level.solution.includes(hint.indices[0]));
      }else assert.fail('fresh correctly played boards should not need a correction');
      const next=applyHint(level,state,hint);
      assert.notDeepEqual(next,state,'confirming a valid hint should make progress');
      assert.equal(next.mistakes,0);state=next;
      assert.ok(++steps<=level.size**2+level.size,'hint chain must finish');
    }
    assert.equal(nextHint(level,state),null);
  }
});
test('wrong crosses take priority even when several correct exclusions are available',()=>{
  for(const level of levels){
    const wrong=level.solution.at(-1),state={...fresh(),dogs:[level.solution[0]],marks:[wrong]};
    const hint=nextHint(level,state);
    assert.equal(hint.kind,'remove');assert.deepEqual(hint.indices,[wrong]);
    const next=applyHint(level,state,hint);
    assert.deepEqual(next.marks,[]);assert.deepEqual(next.dogs,state.dogs);assert.equal(next.mistakes,0);
  }
});
test('multiple misplaced crosses are repaired one at a time before any new mark',()=>{
  const level=levels[0];let state={...fresh(),marks:[...level.solution]};
  for(let i=0;i<level.size;i++){
    const hint=nextHint(level,state);assert.equal(hint.kind,'remove');
    state=applyHint(level,state,hint);
  }
  assert.deepEqual(state.marks,[]);assert.deepEqual(state.dogs,[]);
  assert.equal(nextHint(level,state).kind,'cross');
});
test('hint confirmation cannot revive a failed board or apply a stale suggestion',()=>{
  const level=levels[0],state=fresh(),hint=nextHint(level,state);
  const failed={...state,mistakes:3};
  assert.equal(nextHint(level,failed),null);assert.equal(applyHint(level,failed,hint),failed);
  const changed=applyHint(level,state,hint);
  assert.equal(applyHint(level,changed,hint),changed);
});
test('the completion search respects confirmed dogs and exclusions',()=>{
  for(const level of levels){
    assert.deepEqual(findCompletion(level),level.solution);
    assert.equal(findCompletion(level,[],[level.solution[0]]),null);
    assert.deepEqual(findCompletion(level,[level.solution[0]],[]),level.solution);
  }
});
