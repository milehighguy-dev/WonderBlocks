import {spawn,spawnSync} from 'node:child_process';

// Kill the owned process tree on timeout so a blocked SDK compiler cannot outlive the gate.
export function runProcess(command,args,{cwd,timeout=120000,stdio='inherit',env=process.env}={}){
 return new Promise((resolve,reject)=>{
  const child=spawn(command,args,{cwd,env,stdio,windowsHide:true});let timedOut=false;
  const timer=setTimeout(()=>{
   timedOut=true;
   if(process.platform==='win32')spawnSync('taskkill.exe',['/PID',String(child.pid),'/T','/F'],{windowsHide:true,stdio:'ignore',timeout:5000});
   child.kill('SIGKILL');
  },timeout);
  child.once('error',error=>{clearTimeout(timer);reject(error);});
  child.once('close',(code,signal)=>{
   clearTimeout(timer);
   if(timedOut)reject(Error(command+' timed out after '+timeout+' ms; its process tree was stopped.'));
   else if(code!==0)reject(Error(command+' failed (exit '+code+', signal '+signal+').'));
   else resolve();
  });
 });
}
