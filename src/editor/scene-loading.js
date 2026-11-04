export function createSceneLoading(){
 const dialog=document.getElementById('scene-loading'),bar=dialog.querySelector('progress'),title=dialog.querySelector('h2'),name=dialog.querySelector('[data-loading-name]'),stage=dialog.querySelector('[data-loading-stage]'),detail=dialog.querySelector('[data-loading-detail]'),percent=dialog.querySelector('[data-loading-percent]');let previousFocus=null;
 dialog.addEventListener('cancel',event=>event.preventDefault());
 return {
  start(sceneName=''){if(!dialog.open){previousFocus=document.activeElement;dialog.showModal();}title.textContent='Loading scene';name.textContent=sceneName;bar.hidden=false;bar.removeAttribute('value');percent.textContent='';stage.textContent='Preparing scene…';detail.textContent='';document.getElementById('viewport')?.setAttribute('aria-busy','true');},
  update(value,label,description=''){const n=Math.max(0,Math.min(100,Math.round(value)));bar.value=n;percent.textContent=n+'%';if(stage.textContent!==label)stage.textContent=label;detail.textContent=description;bar.setAttribute('aria-valuetext',description?label+' · '+description:label);},
  async paint(){await new Promise(resolve=>{if(document.visibilityState==='hidden')setTimeout(resolve,16);else requestAnimationFrame(()=>requestAnimationFrame(resolve));});},
  finish(){document.getElementById('viewport')?.setAttribute('aria-busy','false');dialog.close();if(previousFocus?.isConnected)previousFocus.focus({preventScroll:true});previousFocus=null;}
 };
}
