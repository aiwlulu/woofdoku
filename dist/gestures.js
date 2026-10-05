// Commit the first tap immediately. The timer only remembers the double-tap
// window; a second tap rolls back that first toggle before validating a dog.
export function createGestures({onMark,onDog,onStroke,schedule=setTimeout,cancel=clearTimeout,delay=320}) {
  let pending=null,visited=null;
  function clear(){if(pending?.timer!==null&&pending?.timer!==undefined)cancel(pending.timer);pending=null;}
  function tap(index){
    if(pending?.index===index){const rollback=pending.rollback;clear();if(typeof rollback==='function')rollback();onDog(index);return;}
    clear();
    const rollback=onMark(index);
    const item={index,timer:null,rollback};pending=item;
    item.timer=schedule(()=>{if(pending===item)pending=null;},delay);
  }
  function beginStroke(){
    clear();
    visited=new Set();
  }
  function stroke(indices){
    if(!visited)return;
    const fresh=indices.filter(i=>!visited.has(i));fresh.forEach(i=>visited.add(i));
    if(fresh.length)onStroke(fresh);
  }
  return {tap,beginStroke,stroke,endStroke(){visited=null;},prepareTap(index){if(pending?.index===index){cancel(pending.timer);pending.timer=null;}},reset(){clear();visited=null;}};
}
