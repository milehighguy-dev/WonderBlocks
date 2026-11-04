export function matchesSearch(query,fields){const normalize=value=>String(value??'').toLowerCase().replaceAll('_',' ').replaceAll('-',' ');const text=fields.map(normalize).join(' ');return normalize(query).trim().split(/\s+/).every(word=>text.includes(word));}

export function editingText(target){return !!target?.isContentEditable||!!target?.matches?.('input,textarea,select,[contenteditable=true]');}

// Text and numeric fields keep native text Undo. Discrete controls such as
// sliders and selects use the editor history without requiring a canvas click.
export function historyShortcut(event){
 if(!(event.ctrlKey||event.metaKey)||event.altKey)return null;
 const key=event.key?.toLowerCase();if(key!=='z'&&key!=='y')return null;
 const target=event.target,tag=String(target?.tagName||target?.tag||'').toUpperCase();
 if(target?.isContentEditable||tag==='TEXTAREA'||tag==='INPUT'&&!['range','color','checkbox','radio','button','submit','reset'].includes(target.type||'text'))return null;
 if(!tag&&target?.matches?.('textarea,input:not([type=range]):not([type=color]):not([type=checkbox]):not([type=radio]),[contenteditable=true]'))return null;
 return key==='y'||event.shiftKey?'redo':'undo';
}

export function numericTransform(value,key){
 if(typeof value!=='string'||!value.trim())return null;
 const number=Number(value);return Number.isFinite(number)&&Math.abs(number)<=1000&&(key!=='scale'||Math.abs(number)>=.05)?number:null;
}

// Enter places an unambiguous result. With several matches, focus the first
// card so the user can choose rather than silently placing the wrong object.
export function bindPaletteSearch(input,cards){
 input.addEventListener('keydown',event=>{
  if(event.altKey||event.ctrlKey||event.metaKey)return;
  const results=cards().filter(card=>!card.disabled&&!card.hidden);
  if(event.key==='Escape'){if(input.value){input.value='';input.oninput?.();}else input.blur?.();}
  else if(event.key==='ArrowDown'&&results.length)results[0].focus();
  else if(event.key==='ArrowUp'&&results.length)results.at(-1).focus();
  else if(event.key==='Enter'&&results.length){if(results.length===1){results[0].click();input.blur?.();}else results[0].focus();}
  else return;
  event.preventDefault();event.stopPropagation();
 });
}

// Popovers dismiss before scene shortcuts, so Escape closes a menu rather than
// unexpectedly cancelling the entire room or platform editing session.
export function installEditorPopovers(root=globalThis.document,events=globalThis.window){
 const selector='.viewport-view-options,.placement-options,.floor-workspace>details',menus=()=>[...root.querySelectorAll(selector)];
 const close=except=>{for(const menu of menus())if(menu!==except)menu.open=false;};
 root.addEventListener('pointerdown',event=>{for(const menu of menus())if(menu.open&&!menu.contains(event.target))menu.open=false;},true);
 root.addEventListener('toggle',event=>{if(event.target.matches?.(selector)&&event.target.open)close(event.target);},true);
 events.addEventListener('keydown',event=>{if(event.key!=='Escape')return;const modal=root.querySelector('dialog[open]'),menu=menus().find(m=>m.open&&m.getClientRects().length&&(!modal||modal.contains(m)));if(!menu)return;close();menu.querySelector('summary')?.focus();event.preventDefault();event.stopImmediatePropagation();},true);
 return close;
}
