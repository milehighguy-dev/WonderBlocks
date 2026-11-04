import {assemblyLabel} from '../core/assemblies.js';

export function describeSelection(parts){
 if(!parts.length)return {name:'Nothing selected',detail:'Click an object in the scene or choose it from the Scene list.'};
 if(parts.length===1){const p=parts[0];return {name:p.name,detail:p.assemblyId?'Part of '+(p.assemblyName||'an object group'):'Whole object selected'};}
 const group=parts[0].assemblyId;
 return {name:group&&parts.every(p=>p.assemblyId===group)?assemblyLabel(parts):parts.length+' objects selected',detail:parts.length+' objects · moving or scaling affects the entire selection'};
}

// One view follows the viewport when an editor moves it into its workspace.
// Updates preserve focused controls and only announce real context changes.
export function createEditingContext(host){
 const el=(tag,cls,text)=>{const node=document.createElement(tag);node.className=cls;if(text)node.textContent=text;return node;};
 const panel=el('section','editing-context');panel.setAttribute('aria-label','Editing context');
 const status=el('div','editing-context-status');status.setAttribute('role','status');status.setAttribute('aria-live','polite');status.setAttribute('aria-atomic','true');
 const mode=el('span','editing-context-mode'),name=el('strong','editing-context-name'),detail=el('span','editing-context-detail'),hint=el('span','editing-context-hint');status.append(mode,name,detail,hint);
 const actions=el('div','editing-context-actions');
 let current={},signature='';const buttons={};
 for(const key of ['frame','save','cancel','done']){const button=el('button','context-'+key);button.type='button';button.setAttribute('data-context-action',key);button.onclick=()=>current[key]?.action?.();actions.append(button);buttons[key]=button;}
 panel.append(status,actions);host.append(panel);
 return {panel,update(context){
  current=context;const next=JSON.stringify([context.mode,context.label,context.name,context.detail,context.hint,...Object.keys(buttons).map(k=>[context[k]?.label,context[k]?.shortLabel,context[k]?.subtitle,!!context[k]?.disabled])]);if(next===signature)return;signature=next;
  panel.dataset.mode=context.mode;mode.textContent=context.label;name.textContent=context.name;name.title=context.name;detail.textContent=context.detail||'';status.title=[context.name,context.detail,context.hint].filter(Boolean).join(' · ');hint.textContent=context.hint||'';hint.hidden=!context.hint;
  for(const [key,button] of Object.entries(buttons)){const option=context[key];button.hidden=!option;button.textContent=option?.shortLabel||option?.label||'';if(option?.subtitle)button.append(el('small','context-action-subtitle',option.subtitle));button.title=[option?.label,option?.subtitle].filter(Boolean).join(' · ');button.disabled=!!option?.disabled;button.setAttribute('aria-label',option?.label||key);}
 }};
}
