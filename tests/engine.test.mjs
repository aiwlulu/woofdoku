import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {conflict, solved, placeDog, markCells, validSave} from '../dist/engine.js';

const levels=JSON.parse(fs.readFileSync(new URL('../dist/levels.json',import.meta.url)));
function allSolutions(puzzle) {
  const result=[];
  function visit(row,cols,regions,path) {
    if(result.length>1)return;
    if(row===puzzle.size){result.push(path);return;}
    for(let col=0;col<puzzle.size;col++){
      const region=puzzle.regions[row*puzzle.size+col];
      if(cols.has(col)||regions.has(region)||(row&&Math.abs(col-path[row-1])<=1))continue;
      visit(row+1,new Set([...cols,col]),new Set([...regions,region]),[...path,col]);
    }
  }
  visit(0,new Set(),new Set(),[]);return result;
}
test('all 60 boards have connected regions, a valid solution and exactly one answer',()=>{
  assert.equal(levels.length,60);
  const fingerprints=new Set();
  for(const puzzle of levels){
    const n=puzzle.size;
    assert.equal(puzzle.regions.length,n*n);
    assert.equal(new Set(puzzle.regions).size,n);
    const counts=Array(n).fill(0);puzzle.regions.forEach(region=>counts[region]++);
    assert.ok(counts.filter(count=>count===1).length<=1,`level ${puzzle.id} has more than one singleton region`);
    assert.equal(solved(puzzle,puzzle.solution),true);
    const answers=allSolutions(puzzle);
    assert.equal(answers.length,1,`level ${puzzle.id} is ambiguous`);
    assert.deepEqual(answers[0].map((c,r)=>r*n+c),puzzle.solution);
    for(let region=0;region<n;region++){
      const cells=puzzle.regions.map((v,i)=>v===region?i:-1).filter(i=>i>=0);
      const seen=new Set([cells[0]]), queue=[cells[0]];
      while(queue.length){const i=queue.pop(),r=Math.floor(i/n),c=i%n;for(const [rr,cc] of [[r-1,c],[r+1,c],[r,c-1],[r,c+1]]){const j=rr*n+cc;if(rr>=0&&rr<n&&cc>=0&&cc<n&&puzzle.regions[j]===region&&!seen.has(j)){seen.add(j);queue.push(j);}}}
      assert.equal(seen.size,cells.length,`level ${puzzle.id} region ${region} disconnected`);
    }
    fingerprints.add(JSON.stringify(puzzle.regions));
  }
  assert.equal(fingerprints.size,60);
});
test('answer validation catches wrong positions even with no row or region conflicts',()=>{
  const puzzle=levels[0];
  const wrong=puzzle.regions.findIndex((_,i)=>!puzzle.solution.includes(i));
  const state={level:0,dogs:[],marks:[],elapsed:0,mistakes:0,hints:0};
  assert.equal(conflict(puzzle,[],wrong),null);
  const result=placeDog(puzzle,state,wrong);
  assert.equal(result.status,'incorrect');assert.equal(result.state.mistakes,1);
  assert.deepEqual(result.state.dogs,[]);assert.deepEqual(result.state.marks,[]);
});
test('manual crosses can cover the true answer without costing a life',()=>{
  const puzzle=levels[0], index=puzzle.solution[0];
  const state={level:0,dogs:[],marks:[],elapsed:0,mistakes:0,hints:0};
  const marked=markCells(puzzle,state,[index],true);
  assert.deepEqual(marked.marks,[index]);assert.equal(marked.mistakes,0);
  assert.deepEqual(markCells(puzzle,marked,[index],true).marks,[]);
  const dog=placeDog(puzzle,marked,index);
  assert.equal(dog.status,'correct');assert.deepEqual(dog.state.marks,[]);
  assert.deepEqual(dog.state.dogs,[index]);assert.equal(dog.state.mistakes,0);
});
test('three wrong dog attempts lock placements and crosses until a full reset',()=>{
  const puzzle=levels[0],wrong=puzzle.regions.findIndex((_,i)=>!puzzle.solution.includes(i));
  let state={level:0,dogs:[],marks:[],elapsed:0,mistakes:0,hints:0};
  for(let i=0;i<3;i++)state=placeDog(puzzle,state,wrong).state;
  assert.equal(state.mistakes,3);
  assert.equal(placeDog(puzzle,state,puzzle.solution[0]).status,'blocked');
  assert.deepEqual(markCells(puzzle,state,[wrong],true).marks,[]);
  assert.equal(validSave(levels,state),true);
  assert.equal(placeDog(puzzle,JSON.parse(JSON.stringify(state)),puzzle.solution[0]).status,'blocked');
  assert.equal(placeDog(puzzle,{...state,mistakes:0,dogs:[],marks:[],elapsed:0,hints:0},puzzle.solution[0]).status,'correct');
});
test('drag marks are idempotent and cannot overwrite a found dog',()=>{
  const puzzle=levels[0],index=puzzle.solution[0];
  let state={level:0,dogs:[index],marks:[],elapsed:0,mistakes:1,hints:0};
  state=markCells(puzzle,state,[0,1,2,index]);
  const previous=[...state.marks];
  state=markCells(puzzle,state,[2,1,0,index]);
  assert.deepEqual(state.marks,previous);assert.equal(state.marks.includes(index),false);
  assert.equal(state.mistakes,1);assert.deepEqual(state.dogs,[index]);
});
test('invalid, overlapping and out-of-range saved positions are rejected',()=>{
  const save={level:0,dogs:[],marks:[],elapsed:0,mistakes:0};
  assert.equal(validSave(levels,save),true);
  for(const bad of [null,{...save,level:60},{...save,dogs:[-1]},{...save,marks:[25]},{...save,dogs:[0,0]},{...save,dogs:[0],marks:[0]},{...save,elapsed:-1},{...save,mistakes:4},{...save,dogs:[0,1]}])assert.equal(validSave(levels,bad),false);
});
test('duplicate dogs cannot count as completion',()=>{
  assert.equal(solved(levels[0],Array(5).fill(0)),false);
});
