import {solved, validSave, placeDog, markCells} from './engine.js';
import {createGestures} from './gestures.js?v=5';
import {nextHint, applyHint} from './hints.js';
const $ = id => document.getElementById(id);
const palette = ['#efa5b3','#abcfa2','#f6cd70','#9dc9e6','#bfb0de','#e6b28c','#a9d3cb','#e3bbd3'];
const names = ['粉紅','綠色','黃色','藍色','紫色','橘色','青綠','玫瑰'];
const storageKey = 'woofdoku-v1';
let levels, history=[], state, settings={numbers:false}, completed={}, messageTimer, pointer=null, strokeSaved=false, highlighted=[];
const fresh = level => ({level,puzzleRevision:levels?.[level]?.revision??1,dogs:[],marks:[],elapsed:0,mistakes:0,hints:0});
const level = () => levels[state.level];
const time = s => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
const locked = () => !state || state.mistakes>=3 || solved(level(),state.dogs);
const gestures=createGestures({onMark:tapMark,onDog:putDog,onStroke:indices=>applyMarks(indices,false,true)});

function save() {
  try { localStorage.setItem(storageKey,JSON.stringify({state,settings,completed})); }
  catch { document.querySelector('.save-note').textContent='瀏覽器目前無法保存進度，關閉後會重置'; }
}
function message(text) { clearTimeout(messageTimer);$('message').textContent=text;messageTimer=setTimeout(()=>{$('message').textContent='';},5500); }
function stopGestures(){gestures.reset();if(pointer&&$('board').hasPointerCapture(pointer.id))$('board').releasePointerCapture(pointer.id);pointer=null;strokeSaved=false;}
function openDialog(label,html) {
  stopGestures();
  $('modal').classList.toggle('is-gameover',state?.mistakes>=3);
  $('dialog-label').textContent=label;$('dialog-content').innerHTML=html;
  if (!$('modal').open) $('modal').showModal();
}
function closeDialog(){if(state?.mistakes>=3)return;$('modal').close();}
function render() {
  const puzzle=level(), n=puzzle.size;
  const focused=document.activeElement?.dataset.index;
  $('level-number').textContent=String(state.level+1).padStart(2,'0');
  $('difficulty').textContent=`${n===5?'初次散步':n===6?'公園探險':n===7?'森林漫遊':'山丘挑戰'} · ${n} × ${n}`;
  $('timer').textContent=time(state.elapsed);
  $('hearts').innerHTML=Array.from({length:3},(_,i)=>`<svg class="${i>=3-state.mistakes?'lost':''}" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21C9 18 2 14 2 8a5 5 0 0 1 10-2 5 5 0 0 1 10 2c0 6-7 10-10 13z"/></svg>`).join('');
  $('hearts').setAttribute('aria-label',`剩餘 ${3-state.mistakes} 次機會`);
  $('dog-count').textContent=`找到 ${state.dogs.length} / ${n} 隻`;
  $('board').style.setProperty('--n',n);
  $('board').innerHTML=puzzle.regions.map((region,i)=>{
    const dog=state.dogs.includes(i),mark=state.marks.includes(i);
    const desc=dog?'已有狗狗':mark?'已標記叉叉':'空白';
    return `<button class="cell ${dog?'dog':mark?'marked':''} ${highlighted.includes(i)?'hinted':''}" style="--cell:${palette[region]}" data-index="${i}" aria-label="第 ${Math.floor(i/n)+1} 行第 ${i%n+1} 列，${names[region]}色塊，${desc}。空白鍵標記叉叉，D 鍵放狗狗" aria-pressed="${dog||mark}" ${locked()?'disabled':''}>${dog?'<img class="dog-token" src="assets/dog-cartoon.png" alt="">':mark?'<span class="cross-icon" aria-hidden="true"></span>':''}${settings.numbers?`<span class="region-number" aria-hidden="true">${region+1}</span>`:''}</button>`;
  }).join('');
  if(focused!==undefined) $('board').querySelector(`[data-index="${focused}"]`)?.focus({preventScroll:true});
  $('undo').disabled=!history.length || locked();
  $('hint').disabled=locked();
  const total=Object.keys(completed).length;
  $('completed-count').textContent=`${total} / ${levels.length} 關`;
  $('overall-progress').style.width=`${total/levels.length*100}%`;
}
function renderMarks(previousMarks){
  const old=new Set(previousMarks),now=new Set(state.marks),puzzle=level(),n=puzzle.size;
  for(const index of new Set([...previousMarks,...state.marks])){
    if(old.has(index)===now.has(index))continue;
    const cell=$('board').querySelector(`[data-index="${index}"]`);
    if(!cell){render();return;}
    const marked=now.has(index);
    cell.classList.toggle('marked',marked);cell.classList.remove('error');
    if(marked&&!cell.querySelector('.cross-icon'))cell.insertAdjacentHTML('afterbegin','<span class="cross-icon" aria-hidden="true"></span>');
    if(!marked)cell.querySelector('.cross-icon')?.remove();
    cell.setAttribute('aria-pressed',String(marked));
    cell.setAttribute('aria-label',`第 ${Math.floor(index/n)+1} 行第 ${index%n+1} 列，${names[puzzle.regions[index]]}色塊，${marked?'已標記叉叉':'空白'}。空白鍵標記叉叉，D 鍵放狗狗`);
  }
  $('undo').disabled=!history.length||locked();
}

function snapshot(){ history.push({dogs:[...state.dogs],marks:[...state.marks]});if(history.length>100)history.shift(); }
function applyMarks(indices,toggle=false,stroke=false) {
  if(locked() || $('modal').open)return;
  const next=markCells(level(),state,indices,toggle);
  if(next.marks.length===state.marks.length&&next.marks.every(i=>state.marks.includes(i)))return;
  if(!stroke||!strokeSaved){snapshot();if(stroke)strokeSaved=true;}
  const previousMarks=state.marks;state=next;renderMarks(previousMarks);save();
}
function tapMark(index){
  if(locked()||$('modal').open)return;
  const previousMarks=[...state.marks],previousHistory=[...history],previousLevel=state.level;
  applyMarks([index],true);
  return ()=>{
    if(state.level!==previousLevel)return;
    const currentMarks=state.marks;state={...state,marks:previousMarks};history=previousHistory;
    renderMarks(currentMarks);save();
  };
}

function putDog(index) {
  if(locked() || $('modal').open)return;
  const result=placeDog(level(),state,index);
  if(result.status==='existing'||result.status==='blocked')return;
  if(result.status==='incorrect'){
    state=result.state;highlighted=[];save();render();
    message(`這格沒有狗狗，剩下 ${3-state.mistakes} 次機會`);
    $('board').querySelector(`[data-index="${index}"]`)?.classList.add('error');
    if(state.mistakes>=3)lose();
    return;
  }
  snapshot();state=result.state;highlighted=[];message('找到一隻狗狗！');save();render();checkWin();
}
function checkWin(delay=0){
  if(!solved(level(),state.dogs))return;
  const old=completed[state.level];
  if(!old || state.elapsed<old.time)completed[state.level]={time:state.elapsed,hints:state.hints,revision:level().revision??1};
  save();render();
  const winningLevel=state.level;
  const showResult=()=>{
    if(state.level!==winningLevel||!solved(level(),state.dogs)||$('modal').open)return;
  const last=state.level===levels.length-1;
  openDialog('GOOD JOB',`<div class="win-content"><img class="win-mascot" src="assets/dog-cartoon.png" alt="開心的狗狗"><h2>每隻狗狗都有位子了！</h2><p>${last?'60 關都探索完成了，也可以回頭挑戰自己的紀錄。':'這一關完成了，準備好帶狗狗繼續散步嗎？'}</p><div class="result-stats"><span>用時 ${time(state.elapsed)}</span><span>提示 ${state.hints} 次</span></div><button class="primary" id="next-level">${last?'選擇其他關卡':'下一關'}</button><button class="secondary" id="stay">留在這一關</button></div>`);
  $('next-level').onclick=()=>last?showLevels():loadLevel(state.level+1);
  $('stay').onclick=closeDialog;
  if(!matchMedia('(prefers-reduced-motion: reduce)').matches){for(let i=0;i<24;i++){const piece=document.createElement('span');piece.className='confetti';piece.style.left=`${Math.random()*100}%`;piece.style.background=palette[i%8];piece.style.animationDelay=`${Math.random()*.3}s`;document.body.append(piece);setTimeout(()=>piece.remove(),2300);}}
  };
  if(delay)setTimeout(showResult,delay);else showResult();
}

function lose(){openDialog('START AGAIN','<h2>三次機會用完了</h2><p>這一局結束了。重新開始會清空本關的狗狗、叉叉與計時，恢復三次機會。</p><button class="primary" id="retry">重新開始這一關</button>');$('retry').onclick=()=>loadLevel(state.level);}
function loadLevel(index){stopGestures();state=fresh(index);history=[];highlighted=[];closeDialog();message('');save();render();}
function showLevels(){openDialog('YOUR WALK','<h2>選個地方散步</h2><p>1 至 15 關是 5 × 5，之後每 15 關增加一格。已完成的關卡會顯示勾號。</p><div class="level-grid">'+levels.map((p,i)=>`<button data-level="${i}" class="${i===state.level?'current':''} ${completed[i]?'completed':''}" aria-label="第 ${i+1} 關，${p.size} 乘 ${p.size}${completed[i]?'，已完成':''}">${i+1}</button>`).join('')+'</div>');$('dialog-content').querySelectorAll('[data-level]').forEach(b=>b.onclick=()=>{const index=Number(b.dataset.level);if(index===state.level)closeDialog();else loadLevel(index);});}
function showHelp(){openDialog('HOW TO PLAY','<h2>給狗狗一點空間</h2><ol class="rule-list"><li>每一行、每一列，都要剛好有一隻狗狗。</li><li>每個顏色色塊，也要剛好有一隻狗狗。</li><li>狗狗不能相鄰，包含上下、左右與斜角。</li></ol><p>單擊標叉叉，再單擊取消。按住滑動可以連續標叉叉，不驗證對錯。雙擊放狗狗，會驗證該格是否為答案；錯三次就必須重新開始。</p><p>免費提示不限次數。先修正錯誤叉叉，再提示可排除位置與原因；所有可排除格子都標完後才提示狗狗。按確認才套用，也可以只看提示、自己操作。機會用完後只能重玩。</p><p>電腦可用方向鍵移動、空白鍵或 X 鍵標叉叉、D 鍵放狗狗。</p><button class="primary" id="help-done">開始推理</button>');$('help-done').onclick=closeDialog;}
function showSettings(){openDialog('SETTINGS','<h2>照你的步調玩</h2><label class="setting-row"><span>顯示色塊編號<small>用數字輔助辨識不同區域</small></span><input type="checkbox" id="numbers-toggle" '+(settings.numbers?'checked':'')+'></label><p>叉叉由你手動標記。提示免費且不限次數。進度保存在目前的裝置與瀏覽器，清除網站資料後也會清除。</p><button class="primary" id="settings-done">完成</button>');$('numbers-toggle').onchange=e=>{settings.numbers=e.target.checked;save();render();};$('settings-done').onclick=closeDialog;}

function flashCells(indices){
  highlighted=[...indices];render();
  const cells=highlighted.join(',');
  setTimeout(()=>{if(highlighted.join(',')===cells){highlighted=[];render();}},2200);
}
function hintPreview(hint){
  const puzzle=level(), n=puzzle.size;
  return `<div class="hint-preview" style="--n:${n}" aria-hidden="true">${puzzle.regions.map((region,i)=>{
    const target=hint.indices.includes(i),source=hint.sourceIndices.includes(i);
    const dog=state.dogs.includes(i)||(target&&hint.kind==='dog');
    const mark=state.marks.includes(i)||(target&&hint.kind==='cross');
    return `<div class="hint-preview-cell ${target?'preview-target':''} ${source?'preview-source':''} ${target&&hint.kind==='remove'?'preview-remove':''}" style="--cell:${palette[region]}">${dog?'<img src="assets/dog-cartoon.png" alt="">':mark?'<span class="cross-icon"></span>':''}</div>`;
  }).join('')}</div>`;
}
function showHint(){
  if(locked())return;stopGestures();
  const hint=nextHint(level(),state);if(!hint)return;
  state.hints++;save();
  const n=level().size;
  const locations=hint.indices.slice(0,4).map(i=>`${Math.floor(i/n)+1} 行 ${i%n+1} 列`).join('、');
  const action=hint.kind==='remove'?'確認移除這個叉叉':hint.kind==='dog'?'確認放狗狗':`確認標記 ${hint.indices.length} 個叉叉`;
  const note=hint.kind==='remove'?'紅框是建議移除的叉叉':hint.kind==='dog'?'閃動的格子是狗狗的位置':'粗框中的叉叉是建議標記的位置';
  openDialog('FREE HINT',`<div class="hint-rule">${hint.rule}</div><h2>${hint.title}</h2>${hintPreview(hint)}<p class="hint-preview-label">${note}</p><p class="hint-positions">${locations}${hint.indices.length>4?`，共 ${hint.indices.length} 格`:''}</p><p>${hint.reason}</p><button class="primary" id="hint-apply">${action}</button><button class="secondary" id="hint-view">只看提示，我自己操作</button>`);
  $('hint-view').onclick=()=>{closeDialog();flashCells(hint.indices);message(hint.kind==='remove'?'單擊閃動的格子，移除叉叉':hint.kind==='dog'?'雙擊閃動的格子，放狗狗':'單擊或滑動，在閃動的格子標叉叉');};
  $('hint-apply').onclick=()=>{
    if(locked())return;
    const next=applyHint(level(),state,hint);
    if(next===state){closeDialog();return;}
    snapshot();state=next;closeDialog();save();flashCells(hint.indices);
    message(hint.kind==='remove'?'已移除叉叉，不扣次數':hint.kind==='dog'?'已放上狗狗':`已標記 ${hint.indices.length} 個叉叉`);
    if(solved(level(),state.dogs))checkWin(550);
  };
}

function showRestart(){
  if(state.mistakes>=3){lose();return;}
  openDialog('START AGAIN','<h2>重新玩這一關？</h2><p>本關的狗狗、叉叉與計時會重新開始，恢復三次機會。已完成的關卡紀錄會保留。</p><button class="primary" id="confirm-restart">重新開始</button><button class="secondary" id="cancel-restart">繼續推理</button>');
  $('confirm-restart').onclick=()=>loadLevel(state.level);$('cancel-restart').onclick=closeDialog;
}
function showMenu(){
  openDialog('MENU',`<h2>遊戲選單</h2><div class="menu-stats"><span>本關 ${time(state.elapsed)}</span><span>完成 ${Object.keys(completed).length} / ${levels.length} 關</span></div><div class="menu-actions"><button id="menu-levels">選擇關卡</button><button id="menu-help">玩法說明</button><button id="menu-settings">顯示設定</button><button id="menu-restart">重新開始這一關</button></div><p>單擊或滑動標叉叉，雙擊放狗狗。免費提示不限次數，錯三次只能整關重玩。</p>`);
  $('menu-levels').onclick=showLevels;$('menu-help').onclick=showHelp;$('menu-settings').onclick=showSettings;$('menu-restart').onclick=showRestart;
}

function cellsAlong(x1,y1,x2,y2){
  const rect=$('board').getBoundingClientRect(),n=level().size;
  const steps=Math.max(1,Math.ceil(Math.hypot(x2-x1,y2-y1)/(rect.width/n/3)));
  const indices=[];
  for(let i=0;i<=steps;i++){
    const x=x1+(x2-x1)*i/steps,y=y1+(y2-y1)*i/steps;
    if(x<rect.left||x>=rect.right||y<rect.top||y>=rect.bottom)continue;
    const col=Math.min(n-1,Math.floor((x-rect.left)/rect.width*n));
    const row=Math.min(n-1,Math.floor((y-rect.top)/rect.height*n));
    indices.push(row*n+col);
  }
  return indices;
}
function pointerMove(e){
  if(!pointer || pointer.id!==e.pointerId)return;
  if(!pointer.drag&&Math.hypot(e.clientX-pointer.startX,e.clientY-pointer.startY)>8){
    pointer.drag=true;strokeSaved=false;gestures.beginStroke();gestures.stroke([pointer.index]);
  }
  if(pointer.drag)gestures.stroke(cellsAlong(pointer.x,pointer.y,e.clientX,e.clientY));
  pointer.x=e.clientX;pointer.y=e.clientY;
}
try {
  const response=await fetch('./levels.json?v=3');if(!response.ok)throw new Error('levels');levels=await response.json();
  state=fresh(0);
  try{
    const data=JSON.parse(localStorage.getItem(storageKey));
    if(data){
      if(data.state&&Number.isInteger(data.state.level)&&levels[data.state.level]&&Array.isArray(data.state.dogs))data.state.dogs=data.state.dogs.filter(i=>levels[data.state.level].solution.includes(i));
      if(data.state&&Number.isInteger(data.state.level)&&levels[data.state.level])state=fresh(data.state.level);
      if(validSave(levels,data.state)&&(data.state.puzzleRevision??1)===(levels[data.state.level].revision??1))state={...fresh(data.state.level),...data.state,hints:Number.isInteger(data.state.hints)&&data.state.hints>=0?data.state.hints:0};
      if(data.settings)settings={numbers:data.settings.numbers===true};
      if(data.completed&&typeof data.completed==='object')for(const [key,value] of Object.entries(data.completed)){if(/^\d+$/.test(key)&&Number(key)<levels.length&&value&&Number.isFinite(value.time)&&value.time>=0&&(value.revision??1)===(levels[Number(key)].revision??1))completed[key]=value;}
    }
  }catch{}
  $('board').addEventListener('pointerdown',e=>{
    const cell=e.target.closest('[data-index]');
    if(!cell||e.button!==0||!e.isPrimary||pointer||locked()||$('modal').open)return;
    pointer={id:e.pointerId,index:Number(cell.dataset.index),startX:e.clientX,startY:e.clientY,x:e.clientX,y:e.clientY,drag:false};
    gestures.prepareTap(Number(cell.dataset.index));
    $('board').setPointerCapture(e.pointerId);
  });
  $('board').addEventListener('pointermove',pointerMove);
  $('board').addEventListener('pointerup',e=>{
    if(!pointer||pointer.id!==e.pointerId)return;
    pointerMove(e);
    const ended=pointer;pointer=null;
    if($('board').hasPointerCapture(e.pointerId))$('board').releasePointerCapture(e.pointerId);
    if(ended.drag)gestures.endStroke();else gestures.tap(ended.index);
    strokeSaved=false;
  });
  $('board').addEventListener('pointercancel',stopGestures);
  $('board').addEventListener('lostpointercapture',e=>{if(pointer?.id===e.pointerId)stopGestures();});
  $('board').addEventListener('click',e=>{
    // Keyboard and assistive-technology activation emits click with no pointer detail.
    if(e.detail===0&&e.pointerType!== 'touch'&&e.pointerType!=='mouse'&&e.pointerType!=='pen'){
      const cell=e.target.closest('[data-index]');if(cell)applyMarks([Number(cell.dataset.index)],true);
    }
  });
  $('board').addEventListener('dblclick',e=>e.preventDefault());
  $('board').addEventListener('keydown',e=>{
    const cell=e.target.closest('[data-index]');if(!cell||$('modal').open)return;
    const n=level().size,i=Number(cell.dataset.index),r=Math.floor(i/n),c=i%n;
    const moves={ArrowLeft:r*n+Math.max(0,c-1),ArrowRight:r*n+Math.min(n-1,c+1),ArrowUp:Math.max(0,r-1)*n+c,ArrowDown:Math.min(n-1,r+1)*n+c};
    if(e.key in moves){e.preventDefault();$('board').querySelector(`[data-index="${moves[e.key]}"]`)?.focus();}
    if(e.key.toLowerCase()==='d'&&!e.repeat){e.preventDefault();gestures.reset();putDog(i);}
    if(e.key.toLowerCase()==='x'&&!e.repeat){e.preventDefault();gestures.reset();applyMarks([i],true);}
  });
  $('undo').onclick=()=>{stopGestures();if(!history.length||locked())return;Object.assign(state,history.pop());highlighted=[];save();render();message('已復原上一步，錯誤次數不會恢復');};
  $('hint').onclick=showHint;
  $('menu').onclick=showMenu;$('level-picker').onclick=showLevels;$('close-modal').onclick=closeDialog;
  $('modal').addEventListener('cancel',e=>{if(state.mistakes>=3)e.preventDefault();});
  $('modal').addEventListener('click',e=>{if(e.target===$('modal')&&state.mistakes<3){const rect=$('modal').getBoundingClientRect();if(e.clientX<rect.left||e.clientX>rect.right||e.clientY<rect.top||e.clientY>rect.bottom)closeDialog();}});
  render();save();if(state.mistakes>=3)lose();
  const frame=document.querySelector('.board-frame');
  const fitBoard=()=>{const mobile=matchMedia('(max-width:760px),(hover:none) and (max-height:600px)').matches;if(mobile){const size=Math.max(0,Math.floor(Math.min(frame.clientWidth-12,frame.clientHeight-12)));$('board').style.setProperty('--board-size',size+'px');}else $('board').style.removeProperty('--board-size');};
  new ResizeObserver(fitBoard).observe(frame);window.addEventListener('resize',fitBoard);window.visualViewport?.addEventListener('resize',fitBoard);fitBoard();
  setInterval(()=>{if(!document.hidden&&!$('modal').open&&!locked()){state.elapsed++;$('timer').textContent=time(state.elapsed);if(state.elapsed%5===0)save();}},1000);
  window.addEventListener('pagehide',()=>{stopGestures();save();});document.addEventListener('visibilitychange',()=>{if(document.hidden){stopGestures();save();}});
} catch {
  $('board').innerHTML='<p class="load-error">關卡載入失敗，請確認網路後重新整理。</p>';
  for(const id of ['undo','hint','level-picker','menu'])$(id).disabled=true;
}
