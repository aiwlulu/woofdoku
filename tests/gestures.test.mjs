import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createGestures} from '../dist/gestures.js';
import {markCells,placeDog} from '../dist/engine.js';
function harness(){
  const events=[],timers=new Map();let id=0;
  const input=createGestures({onMark:i=>{events.push(['mark',i]);return ()=>events.push(['rollback',i]);},onDog:i=>events.push(['dog',i]),onStroke:ids=>events.push(['stroke',ids]),schedule:callback=>{timers.set(++id,callback);return id;},cancel:id=>timers.delete(id)});
  return {input,events,tick(){for(const [id,callback] of [...timers]){timers.delete(id);callback();}}};
}
test('single tap marks immediately, without waiting for any timer',()=>{
  const {input,events,tick}=harness();input.tap(3);assert.deepEqual(events,[['mark',3]]);tick();assert.deepEqual(events,[['mark',3]]);
});
test('a double tap rolls back the first cross and validates one dog only',()=>{
  const {input,events,tick}=harness();input.tap(3);input.tap(3);tick();assert.deepEqual(events,[['mark',3],['rollback',3],['dog',3]]);
});
test('fast taps on different cells mark both immediately',()=>{
  const {input,events,tick}=harness();input.tap(3);input.tap(4);assert.deepEqual(events,[['mark',3],['mark',4]]);tick();assert.deepEqual(events,[['mark',3],['mark',4]]);
});
test('a drag marks each visited cell once and never requests a dog',()=>{
  const {input,events,tick}=harness();input.beginStroke();input.stroke([0,1,2]);input.stroke([1,2,3]);input.stroke([3,2,1]);input.endStroke();tick();assert.deepEqual(events,[['stroke',[0,1,2]],['stroke',[3]]]);
});
test('opening a dialog or cancelling input preserves the already committed single tap',()=>{
  const {input,events,tick}=harness();input.tap(3);input.reset();tick();assert.deepEqual(events,[['mark',3]]);
});
test('holding the second touch does not let the first tap timer swallow a double tap',()=>{
  const {input,events,tick}=harness();input.tap(3);input.prepareTap(3);tick();input.tap(3);assert.deepEqual(events,[['mark',3],['rollback',3],['dog',3]]);
});
test('starting a drag during the double-tap window preserves the prior cross without toggling it twice',()=>{
  const {input,events,tick}=harness();input.tap(3);input.beginStroke();input.stroke([3,4]);input.endStroke();tick();assert.deepEqual(events,[['mark',3],['stroke',[3,4]]]);
});
test('taps outside the double-tap window remain two ordinary cross toggles',()=>{
  const {input,events,tick}=harness();input.tap(3);tick();input.tap(3);assert.deepEqual(events,[['mark',3],['mark',3]]);
});
const level=JSON.parse(fs.readFileSync(new URL('../dist/levels.json',import.meta.url)))[0];
function game(initialMarks=[]){
  let state={dogs:[],marks:initialMarks,elapsed:0,mistakes:0,hints:0},history=[];
  const timers=new Map();let id=0;
  const input=createGestures({
    onMark:index=>{const beforeMarks=[...state.marks],beforeHistory=[...history];history.push({dogs:[...state.dogs],marks:[...state.marks]});state=markCells(level,state,[index],true);return ()=>{state={...state,marks:beforeMarks};history=beforeHistory;};},
    onDog:index=>{const result=placeDog(level,state,index);if(result.status==='correct')history.push({dogs:[...state.dogs],marks:[...state.marks]});state=result.state;},onStroke:indices=>{state=markCells(level,state,indices);},
    schedule:cb=>{timers.set(++id,cb);return id;},cancel:id=>timers.delete(id)
  });
  return {input,get state(){return state;},get history(){return history;},advanceTime(){state.elapsed++;}};
}
test('correct double tap counts as one undo entry, restores a prior cross on undo, and keeps elapsed time',()=>{
  const target=level.solution[0],g=game([target]);g.input.tap(target);assert.deepEqual(g.state.marks,[]);g.advanceTime();g.input.tap(target);
  assert.deepEqual(g.state.dogs,[target]);assert.deepEqual(g.state.marks,[]);assert.equal(g.state.elapsed,1);assert.equal(g.history.length,1);assert.deepEqual(g.history[0].marks,[target]);
});
test('incorrect double tap costs one chance and leaves no cross introduced by its first tap',()=>{
  const target=level.regions.findIndex((_,i)=>!level.solution.includes(i)),g=game();g.input.tap(target);assert.deepEqual(g.state.marks,[target]);g.input.tap(target);
  assert.equal(g.state.mistakes,1);assert.deepEqual(g.state.marks,[]);assert.deepEqual(g.state.dogs,[]);assert.equal(g.history.length,0);
});
test('incorrect double tap on an existing cross preserves that cross',()=>{
  const target=level.regions.findIndex((_,i)=>!level.solution.includes(i)),g=game([target]);g.input.tap(target);g.input.tap(target);
  assert.equal(g.state.mistakes,1);assert.deepEqual(g.state.marks,[target]);assert.equal(g.history.length,0);
});
