// Shared presentation only: keep the existing controls and their event handlers.
export function organizeEditor(panel,kind){
 panel.classList.add('workbench-editor',kind+'-editor');
 const aside=panel.querySelector('aside'),intro=aside.querySelector(':scope > p');
 if(intro){const help=document.createElement('details');help.className='editor-help';const summary=document.createElement('summary');summary.textContent='How to use '+(kind==='platform'?'platforms':'the room editor');intro.before(help);help.append(summary,intro);}
 const legend=document.createElement('div');legend.className='handle-legend';legend.setAttribute('aria-label','Viewport controls');
 legend.innerHTML=kind==='platform'?'<span><i class="gold"></i>Depth</span><span><i class="purple"></i>Width</span><span><i class="green"></i>Extend / turn</span>':'<span><i class="gold"></i>Walls</span><span><i class="purple"></i>Height</span><span><i class="green"></i>Extend</span>';
 aside.querySelector('h2').after(legend);
 if(kind==='platform'){
  const group=(start,end,title,collapsed=false)=>{const first=aside.querySelector(start),last=aside.querySelector(end);if(!first||!last)return;const items=[];let n=first;while(n){items.push(n);if(n===last)break;n=n.nextElementSibling;}const box=document.createElement(collapsed?'details':'section');box.className='editor-group';const heading=document.createElement(collapsed?'summary':'h3');heading.textContent=title;first.before(box);box.append(heading,...items);};
  group('[data-sections]','label:has([data-rotation])','Selected section');
  const oldHeading=aside.querySelector(':scope > h3');if(oldHeading)oldHeading.remove();
  group('label:has([data-turn-style])','[data-capsule]','Extend platform');
  group('label:has([data-style])','label:has([data-y])','Surface & structure',true);
  const dimensions=document.createElement('div');dimensions.className='dimension-pair';const width=aside.querySelector('label:has([data-width])'),depth=aside.querySelector('label:has([data-depth])');width.before(dimensions);dimensions.append(width,depth);
  const geometry=document.createElement('details');geometry.className='editor-secondary';geometry.innerHTML='<summary>Corner radius & rotation</summary>';const radius=aside.querySelector('label:has([data-radius])'),rotation=aside.querySelector('label:has([data-rotation])');radius.before(geometry);geometry.append(radius,rotation);
  const select=aside.querySelector('label:has([data-section])');select.classList.add('section-picker');
  aside.querySelector('[data-remove]').classList.add('quiet-danger');
 }
 const actions=document.createElement('div');actions.className='editor-history';
 const undo=aside.querySelector('[data-undo]'),redo=aside.querySelector('[data-redo]');undo.before(actions);actions.append(undo);if(redo)actions.append(redo);
 undo.textContent='↶ Undo';undo.title='Undo (Ctrl+Z)';if(redo){redo.textContent='↷ Redo';redo.title='Redo (Ctrl+Shift+Z or Ctrl+Y)';}
}

// Run once after the interior editor has created every tool, so later additions
// do not displace the everyday sizing and opening controls.
export function organizeInteriorTools(panel){const aside=panel.querySelector('aside');if(!aside?.children)return;const take=(selector,label=false)=>{const node=panel.querySelector(selector);return label?node?.closest('label'):node;},finish=take('.interior-3d-finish'),group=(title,nodes,collapsed=false)=>{const box=document.createElement(collapsed?'details':'section');box.className='editor-group';const heading=document.createElement(collapsed?'summary':'h3');heading.textContent=title;box.append(heading,...nodes.filter(Boolean));aside.insertBefore(box,finish);return box;};
 const help=take('.editor-help'),legend=take('.handle-legend'),history=take('.editor-history'),status=take('[data-status]'),outlineContainer=take('[data-draw-outline]')?.closest('.opening-tools'),openingContainer=take('[data-place="door"]')?.closest('.opening-tools');
 const shape=[take('[data-place="divider"]'),take('[data-place="corner"]'),take('[data-draw-outline]'),take('[data-close-outline]'),take('[data-remove-corner]'),take('[data-outline-angle]',true),take('[data-outline-help]')];
 const curves=[take('[data-curve-faces]'),take('[data-curve-count]'),take('[data-select-all-faces]'),take('[data-curve-amount]',true),take('[data-apply-curve]'),take('[data-straighten]'),take('[data-curve-help]')];
 group('Building style',[take('[data-building-style-tools]')]);
 group('Room & dimensions',[take('[data-level]',true),take('.floor-actions'),take('[data-floor-elevation]',true),take('[data-room]',true),take('[data-height="wallHeight"]',true),take('[data-height="ceilingHeight"]',true),take('[data-wall-thickness]',true),take('[data-thickness-help]'),take('[data-elevation]',true)]);
 group('Stairs between floors',[take('.interior-stair-tools')]);
 group('Doors & windows',[openingContainer]);
 group('Extend & connect',[take('[data-extend-kind]',true),take('[data-add]'),take('[data-side]',true),take('[data-route-kind]',true),take('[data-route]')]);
 group('Shape walls',shape);group('Curved walls',curves,true);
 group('View & snapping',[take('[data-frame]'),take('[data-hull-snap]',true),take('[data-shell]',true),take('[data-hull-help]'),take('[data-plan]'),legend,help],true);
 if(outlineContainer&&!outlineContainer.children.length)outlineContainer.remove();if(history)aside.insertBefore(history,finish);if(status)aside.insertBefore(status,finish);
}
