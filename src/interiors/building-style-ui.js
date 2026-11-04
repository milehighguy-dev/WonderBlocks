import {applyBuildingStyle,MOS_BUILDING_STYLE} from './building-style.js';

export function buildingStyleControls({container,plan,edit}){
 const panel=document.createElement('section');panel.dataset.buildingStyleTools='';panel.innerHTML=`<label>Building style<select data-building-style><option value="default">Default</option><option value="mos-eisley">Mos Eisley</option></select></label><p class="muted">Applies finishes to the whole building. Rooms, doors and windows stay editable.</p><details data-style-dimensions><summary>Roof rim &amp; sloped base</summary>${[['rimHeight','Roof rim height',0,2],['rimThickness','Roof rim thickness',.05,1],['baseHeight','Base slope height',0,2],['baseProjection','Base slope projection',0,1.5]].map(([k,label,min,max])=>`<label>${label} (m)<input data-style-field="${k}" type="number" min="${min}" max="${max}" step=".05"></label>`).join('')}</details>`;
 container.prepend(panel);
 panel.querySelector('select').onchange=e=>edit(()=>applyBuildingStyle(plan(),e.target.value));
 for(const input of panel.querySelectorAll('input'))input.onchange=()=>edit(()=>{plan().buildingStyle[input.dataset.styleField]=Number(input.value);});
 return {sync(){const style=plan().buildingStyle;panel.querySelector('select').value=style?.type||'default';panel.querySelector('details').hidden=!style;for(const input of panel.querySelectorAll('input'))input.value=(style||MOS_BUILDING_STYLE)[input.dataset.styleField];}};
}
