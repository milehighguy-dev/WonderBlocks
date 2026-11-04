import {levelRequests} from './swbf2-navigation-merge.js';

// Preserve authored text while editing the native call-and-scope format. String
// contents and comments must never be mistaken for layer/sequence declarations.
function tokens(text){
 const out=[];let i=0;
 while(i<text.length){
  if(/[\s\uFEFF]/.test(text[i])){i++;continue;}
  if(text.startsWith('//',i)){const end=text.indexOf('\n',i);i=end<0?text.length:end;continue;}
  if(text.startsWith('/*',i)){const end=text.indexOf('*/',i+2);if(end<0)throw Error('Unclosed comment in world source.');i=end+2;continue;}
  const start=i;
  if(text[i]==='"'){i++;let value='',closed=false;while(i<text.length){if(text[i]==='"'){i++;closed=true;break;}if(text[i]==='\\'&&/["\\]/.test(text[i+1]||'')){i++;value+=text[i++];}else value+=text[i++];}if(!closed)throw Error('Unclosed string in world source.');out.push({value,start,end:i,string:true});continue;}
  const match=/^(?:[A-Za-z_][A-Za-z0-9_]*|[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)/.exec(text.slice(i));
  if(match){i+=match[0].length;out.push({value:match[0],start,end:i});}else out.push({value:text[i++],start,end:i});
 }
 return out;
}
function sourceNodes(text){
 const input=tokens(text);let at=0;const fail=()=>{throw Error('Invalid layer index or generated layer source.');};
 const take=value=>{const token=input[at++];if(!token||value!==undefined&&token.value!==value)fail();return token;};
 function list(nested=false){const nodes=[];while(at<input.length&&input[at].value!=='}'){
  const key=take();if(key.string||!/^[a-z_]\w*$/i.test(key.value))fail();take('(');const args=[];
  while(input[at]?.value!==')'){const value=take();if(!value.string&&!/^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(value.value))fail();args.push(value);if(input[at]?.value!==')')take(',');}
  take(')');const node={name:key.value,args,start:key.start,children:null};
  if(input[at]?.value==='{'){node.open=take('{').start;node.children=list(true);node.close=take('}').start;if(input[at]?.value===';')take(';');}else take(';');
  node.end=input[at-1].end;nodes.push(node);
 }if(!nested&&at!==input.length)fail();return nodes;}
 return list();
}
const integer=token=>token&&!token.string&&/^\d+$/.test(token.value)&&Number.isSafeInteger(Number(token.value))?Number(token.value):NaN;
const edit=(text,changes)=>{for(const {start,end=start,value} of [...changes].reverse().sort((a,b)=>b.start-a.start))text=text.slice(0,start)+value+text.slice(end);return text;};
const insertIn=(text,node,line,newline)=>{const start=text.lastIndexOf('\n',node.close-1)+1,indent=text.slice(start,node.close);return /^\s*$/.test(indent)?{start,value:'\t'+line+newline}:{start:node.close,value:newline+'\t'+line+newline};};

export function registerWorldLayer(indexText,{name:requestedName='wonderblocks',description='Wonderblocks scene'}={}){
 if(!/^[a-z0-9_]{1,48}$/i.test(requestedName)||typeof description!=='string'||description.length>160)throw Error('Invalid export layer name.');
 const nodes=sourceNodes(indexText),layers=nodes.filter(n=>n.name==='Layer'),modes=nodes.filter(n=>n.name==='GameMode'),next=nodes.filter(n=>n.name==='NextID'),versions=nodes.filter(n=>n.name==='Version'),used=new Set(),names=new Set();
 if(versions.length!==1||integer(versions[0].args[0])!==1||next.length!==1||next[0].args.length!==1||!Number.isFinite(integer(next[0].args[0])))throw Error('The world .ldx must contain Version(1) and NextID.');
 for(const layer of layers){const id=integer(layer.args[1]),name=layer.args[0]?.value.toLowerCase();if(layer.args.length!==3||!layer.args[0].string||!layer.children||!Number.isFinite(integer(layer.args[2]))||id<0||id>=64||!Number.isFinite(id)||used.has(id)||names.has(name))throw Error('The world .ldx has invalid or duplicate layer IDs/names.');used.add(id);names.add(name);}
 if(!layers.some(n=>n.args[0].value==='[Base]'&&integer(n.args[1])===0))throw Error('The world .ldx is missing its [Base] layer at ID 0.');
 const modeNames=new Set();for(const mode of modes){const name=mode.args[0]?.value.toLowerCase();if(mode.args.length!==1||!mode.args[0]?.string||!mode.children||modeNames.has(name))throw Error('The world .ldx has invalid or duplicate game modes.');modeNames.add(name);for(const ref of mode.children.filter(n=>n.name==='Layer'))if(ref.args.length!==1||!used.has(integer(ref.args[0]))||ref.children)throw Error('A game mode references an undeclared layer.');}
 const own=layers.find(n=>n.args[0].value.toLowerCase()===requestedName.toLowerCase());let id=own?integer(own.args[1]):1;
 if(!own){while(used.has(id)&&id<64)id++;if(id>=64)throw Error('The world has no unused layer ID (64-layer limit).');}
 const newline=indexText.match(/\r\n|\n|\r/)?.[0]||'\n',changes=[],name=own?.args[0].value||requestedName,common=modes.find(n=>n.args[0].value.toLowerCase()==='common');
 if(!own){const declaration=`Layer(${JSON.stringify(requestedName)}, ${id}, 0)${newline}{${newline}\tDescription(${JSON.stringify(description)});${newline}}${newline}${newline}`;changes.push({start:modes[0]?.start??indexText.length,value:(modes.length?'':newline)+declaration});}
 const nextID=Math.max(integer(next[0].args[0]),id+1,...[...used].map(n=>n+1));if(nextID!==integer(next[0].args[0]))changes.push({...next[0].args[0],value:String(nextID)});
 // Common loads shared scenery once for every game mode. Remove only duplicate
 // references to our layer from mode-specific lists when adopting an old layer.
 let inCommon=false;for(const mode of modes)for(const ref of mode.children.filter(n=>n.name==='Layer'&&integer(n.args[0])===id)){if(mode===common&&!inCommon)inCommon=true;else changes.push({start:ref.start,end:ref.end,value:''});}
 if(common&&!inCommon)changes.push(insertIn(indexText,common,`Layer(${id});`,newline));
 if(!common)changes.push({start:indexText.length,value:`${newline}GameMode("Common")${newline}{${newline}\tLayer(0);${newline}\tLayer(${id});${newline}}${newline}`});
 return {text:edit(indexText,changes),id,name,reused:!!own,gameMode:'Common'};
}

export function nextWorldSequence(sources){
 let next=1;for(const text of sources){const input=tokens(text);for(let i=0;i<input.length-2;i++){
  const name=input[i].value;if(input[i].string||input[i+1].value!=='(')continue;
  if(name==='NextSequence'||name==='SeqNo'){const number=integer(input[i+2]);if(Number.isFinite(number))next=Math.max(next,number+(name==='SeqNo'?1:0));}
  if(name==='Object'&&input[i+2]?.string&&input[i+3]?.value===','&&input[i+4]?.string&&input[i+5]?.value===','){const number=integer(input[i+6]);if(Number.isFinite(number))next=Math.max(next,number+1);}
 }}if(next>0x7fffffff)throw Error('World object sequence numbers are exhausted.');return next;
}
export function remapWorldLayer(text,{id,sequenceStart=1}){
 const nodes=sourceNodes(text),objects=nodes.filter(n=>n.name==='Object'),changes=[];let sequence=sequenceStart;
 for(const object of objects){if(!object.children||object.args.length!==3)throw Error('Invalid exported world object.');const number=String(sequence++);changes.push({...object.args[2],value:number});let hasLayer=false;
  for(const child of object.children){if(child.name==='Layer'){if(hasLayer)throw Error('Exported object has duplicate layer IDs.');hasLayer=true;changes.push({...child.args[0],value:String(id)});}if(child.name==='SeqNo')changes.push({...child.args[0],value:number});}
  if(!hasLayer)throw Error('Exported object is missing its layer ID.');
 }
 if(sequence>0x7fffffff)throw Error('World object sequence numbers are exhausted.');
 for(const node of nodes.filter(n=>n.name==='NextSequence'))changes.push({...node.args[0],value:String(sequence)});
 return edit(text,changes);
}

export function registerLayerRequest(text,worldName,layerWorld){
 const requests=levelRequests(text),worlds=requests.filter(r=>r.kind==='world'&&r.pc),target=worlds.find(r=>r.resources.some(name=>name.toLowerCase()===worldName.toLowerCase()));
 if(!target)return null;
 if(worlds.some(r=>r.resources.some(name=>name.toLowerCase()===layerWorld.toLowerCase())))return text;
 const newline=text.match(/\r\n|\n|\r/)?.[0]||'\n';return edit(text,[insertIn(text,{close:target.end-1},`\t"${layerWorld}"`,newline)]);
}
