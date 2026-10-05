export function conflict(level, dogs, index) {
  const n = level.size, r = Math.floor(index/n), c = index%n;
  for (const other of dogs) {
    if (other === index) continue;
    const rr = Math.floor(other/n), cc = other%n;
    if (rr === r) return '同一行只能放一隻狗狗';
    if (cc === c) return '同一列只能放一隻狗狗';
    if (level.regions[other] === level.regions[index]) return '同一個色塊只能放一隻狗狗';
    if (Math.abs(rr-r) <= 1 && Math.abs(cc-c) <= 1) return '狗狗不能相鄰，斜角也算';
  }
  return null;
}
export function solved(level, dogs) {
  return dogs.length === level.size && new Set(dogs).size === dogs.length && dogs.every(i => !conflict(level,dogs,i));
}
export function placeDog(level, state, index) {
  if (state.mistakes >= 3 || solved(level, state.dogs)) return {status:'blocked',state};
  if (!Number.isInteger(index) || index < 0 || index >= level.size**2) return {status:'blocked',state};
  if (state.dogs.includes(index)) return {status:'existing',state};
  if (!level.solution.includes(index)) return {status:'incorrect',state:{...state,mistakes:state.mistakes+1}};
  return {status:'correct',state:{...state,dogs:[...state.dogs,index],marks:state.marks.filter(i=>i!==index)}};
}
export function markCells(level, state, indices, toggle=false) {
  if (state.mistakes>=3 || solved(level,state.dogs)) return state;
  const marks=new Set(state.marks);
  for (const index of new Set(indices)) {
    if (!Number.isInteger(index) || index<0 || index>=level.size**2 || state.dogs.includes(index)) continue;
    if(toggle && marks.has(index)) marks.delete(index); else marks.add(index);
  }
  return {...state,marks:[...marks]};
}
export function validSave(levels, value) {
  if (!value || !Number.isInteger(value.level) || value.level < 0 || value.level >= levels.length) return false;
  const n = levels[value.level].size;
  return ['dogs','marks'].every(key=>Array.isArray(value[key]) && value[key].every(i=>Number.isInteger(i)&&i>=0&&i<n*n)) &&
    new Set(value.dogs).size===value.dogs.length && new Set(value.marks).size===value.marks.length &&
    value.dogs.every(i=>!value.marks.includes(i)&&levels[value.level].solution.includes(i)) &&
    Number.isFinite(value.elapsed)&&value.elapsed>=0&&Number.isInteger(value.mistakes)&&value.mistakes>=0&&value.mistakes<=3;
}
