import {conflict, solved, markCells, placeDog} from './engine.js';

const colors=['粉紅色','綠色','黃色','藍色','紫色','橘色','青綠色','玫瑰色'];
const row=(level,i)=>Math.floor(i/level.size);
const col=(level,i)=>i%level.size;
const position=(level,i)=>`第 ${row(level,i)+1} 行、第 ${col(level,i)+1} 列`;
const adjacent=(level,a,b)=>a!==b&&Math.abs(row(level,a)-row(level,b))<=1&&Math.abs(col(level,a)-col(level,b))<=1;

// Search actual constraints, rather than labeling a guessed square as wrong.
// Returns one complete placement, or null if the assumptions are impossible.
export function findCompletion(level, dogs=[], banned=[]) {
  const n=level.size, bans=new Set(banned),fixed=new Map();
  for(const index of dogs){
    if(bans.has(index)||conflict(level,dogs,index))return null;
    fixed.set(row(level,index),col(level,index));
  }
  function visit(r,usedCols,usedRegions,path){
    if(r===n)return path.map((c,rr)=>rr*n+c);
    const choices=fixed.has(r)?[fixed.get(r)]:Array.from({length:n},(_,c)=>c);
    for(const c of choices){
      const i=r*n+c,region=level.regions[i];
      if(bans.has(i)||usedCols.has(c)||usedRegions.has(region)||(r&&Math.abs(c-path[r-1])<=1))continue;
      const result=visit(r+1,new Set([...usedCols,c]),new Set([...usedRegions,region]),[...path,c]);
      if(result)return result;
    }
    return null;
  }
  return visit(0,new Set(),new Set(),[]);
}

function units(level){
  const n=level.size,result=[];
  for(let id=0;id<n;id++){
    result.push({type:'row',id,label:`第 ${id+1} 行`,cells:Array.from({length:n},(_,c)=>id*n+c)});
    result.push({type:'col',id,label:`第 ${id+1} 列`,cells:Array.from({length:n},(_,r)=>r*n+id)});
    result.push({type:'region',id,label:`${colors[id]}區域`,cells:level.regions.map((v,i)=>v===id?i:-1).filter(i=>i>=0)});
  }
  return result;
}

export function nextHint(level,state){
  if(state.mistakes>=3||solved(level,state.dogs))return null;
  const occupied=new Set(state.dogs),marks=new Set(state.marks),all=level.regions.map((_,i)=>i);
  const groups=units(level);
  const available=i=>!occupied.has(i)&&!marks.has(i)&&!conflict(level,state.dogs,i);
  const wrong=state.marks.find(i=>level.solution.includes(i));

  // Corrections always precede new exclusions or revealing a dog.
  if(wrong!==undefined){
    const closed=groups.find(unit=>unit.cells.includes(wrong)&&unit.cells.every(i=>i===wrong||!available(i)));
    return {
      kind:'remove',indices:[wrong],sourceIndices:closed?.cells.filter(i=>i!==wrong)??[],title:'先檢查這個叉叉',rule:closed?'不能整區排除':'整盤一致性檢查',
      reason:closed?`${closed.label}的其他位置都已排除。若這格也保留叉叉，${closed.label}就沒有位置能放狗狗，與每行、每列、每個色塊各一隻的規則衝突。先移除這個叉叉，不扣次數。`:
        '保留這個叉叉時，整盤沒有任何擺法能同時滿足每行、每列、每個色塊各一隻，以及狗狗不能相鄰的規則。先移除這個叉叉，不扣次數。'
    };
  }

  const unmarked=all.filter(i=>!occupied.has(i)&&!marks.has(i));
  const crossing=(indices,title,rule,reason,sourceIndices=[])=>({kind:'cross',indices,title,rule,reason,sourceIndices});

  // Direct exclusions from a dog already found, one understandable group at a time.
  for(const dog of state.dogs){
    const rules=[
      [i=>row(level,i)===row(level,dog),'同一行只能有一隻',`${position(level,dog)}已經有狗狗。同一行只能有一隻，所以這一行其餘空格都可以標叉叉。`],
      [i=>col(level,i)===col(level,dog),'同一列只能有一隻',`${position(level,dog)}已經有狗狗。同一列只能有一隻，所以這一列其餘空格都可以標叉叉。`],
      [i=>level.regions[i]===level.regions[dog],'每個色塊只能有一隻',`${colors[level.regions[dog]]}區域已經有狗狗。每個色塊只能有一隻，所以這個色塊其餘空格都可以標叉叉。`],
      [i=>adjacent(level,i,dog),'狗狗不能相鄰',`${position(level,dog)}已經有狗狗。牠周圍的八格都不能再放狗狗，包含斜角。`]
    ];
    for(const [matches,rule,reason] of rules){const indices=unmarked.filter(matches);if(indices.length)return crossing(indices,'這些位置可以排除',rule,reason,[dog]);}
  }

  const pending=groups.filter(unit=>!unit.cells.some(i=>occupied.has(i))).map(unit=>({...unit,candidates:unit.cells.filter(available)}));
  // If a row/column/region must put its dog in another unit, that second unit
  // cannot use any of its other cells. No dog location is disclosed yet.
  for(const source of pending){
    if(!source.candidates.length)continue;
    for(const target of pending){
      if(source.type===target.type||!source.candidates.every(i=>target.cells.includes(i)))continue;
      const indices=target.cells.filter(i=>unmarked.includes(i)&&!source.cells.includes(i));
      if(indices.length)return crossing(indices,'這些位置可以排除','位置集中在同一區',`${source.label}剩下的可行位置全部落在${target.label}，所以${target.label}的狗狗必須留給${source.label}。${target.label}中不屬於${source.label}的空格可以標叉叉。`,source.candidates);
    }
  }

  // A square touching every possible position of another unit cannot contain a dog.
  for(const source of pending){
    if(!source.candidates.length)continue;
    const indices=unmarked.filter(i=>!source.cells.includes(i)&&source.candidates.every(c=>adjacent(level,i,c)));
    if(indices.length)return crossing(indices,'這些位置可以排除','會碰到必要的狗狗',`${source.label}必須有一隻狗狗。無論放在目前哪個可行位置，都會與框出的格子相鄰，所以框出的格子不能放狗狗。`,source.candidates);
  }

  // Exhaustive constraint checking supplies a truthful advanced exclusion when
  // the short local rules above cannot establish another one.
  for(const index of unmarked){
    if(!findCompletion(level,[...state.dogs,index],state.marks)){
      return crossing([index],'這個位置可以排除','進階排除',`假設${position(level,index)}放狗狗，剩下的棋盤就找不到能同時滿足行、列、色塊與不相鄰規則的完整擺法。因此這格可以標叉叉。這一步已檢查所有符合目前標記的可能擺法。`);
    }
  }

  // A dog is revealed only after every non-answer square has been crossed out.
  const index=level.solution.find(i=>!occupied.has(i));
  return {kind:'dog',indices:[index],sourceIndices:[],title:'現在可以放狗狗了',rule:'每行必須有一隻',reason:`可以排除的空格都已標完。第 ${row(level,index)+1} 行只剩${position(level,index)}還沒有排除，每行必須有一隻狗狗，因此這格就是狗狗的位置。`};
}

// Opening a hint does not change marks or dogs. Applying it is a separate action.
export function applyHint(level,state,hint){
  if(!hint)return state;
  const current=nextHint(level,state);
  if(!current||current.kind!==hint.kind||JSON.stringify(current.indices)!==JSON.stringify(hint.indices))return state;
  if(hint.kind==='remove')return {...state,marks:state.marks.filter(i=>!hint.indices.includes(i))};
  if(hint.kind==='cross')return markCells(level,state,hint.indices);
  return placeDog(level,state,hint.indices[0]).state;
}
