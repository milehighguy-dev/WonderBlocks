import {makePart,validateProject} from '../../src/core/model.js';
import {YAVIN_PRESETS} from '../../src/parts/yavin-presets.js';
import {FLORA_TREE_PRESETS} from '../../src/flora/flora-tree-presets.js';
import {defaultFlora,addFloraAsset} from '../../src/flora/flora.js';
import {defaultInterior} from '../../src/interiors/interior.js';
import {preparePatternScaling} from '../../src/materials/pattern-scaling.js';
import {prepareExampleCopies} from '../../src/editor/example-copies.js';

// Three playable crossings precede the dressing: bridge, high aqueduct and creek.
export function yavinRainwell(){
 const parts=[];let district='01 · The ravine';
 const add=(type,name,position,scale=[1,1,1],preset='yavin-stone',color='#ffffff',angle=0)=>{const p=makePart(type,{id:'rainwell-'+parts.length,name,position,scale,rotation:[0,angle,0],color,interiorProp:type!=='interior',surface:{preset,scale:.25}});parts.push(p);return p;};
 const box=(name,p,s,finish='yavin-stone',color='#ffffff')=>add('block',name,p,s,finish,color);
 const route=(name,p,width,segments,angle=Math.PI,ground=0)=>{const r=add('stair-route',name,p,[1,1,1],'yavin-floor','#ffffff',angle);r.route={width,thickness:.3,gap:.2,groundHeight:ground,segments:segments.flatMap(s=>s.run>30?Array.from({length:Math.ceil(s.run/30)},()=>({...structuredClone(s),run:s.run/Math.ceil(s.run/30)})):[s])};return r;};
 const flat=(run,extra={})=>({kind:'landing',run,rise:0,steps:1,turn:'straight',...extra});
 const stair=(run,rise,steps,extra={})=>({kind:'stairs',run,rise,steps,turn:'straight',...extra});
 const stairRail={style:'posts',sides:'both',height:1.05,postWidth:.12,railWidth:.12,railHeight:.12,spacing:2,color:'#ffffff',surface:{preset:'yavin-stone',scale:.25}};
 const ruin=(name,a,b,height=2.5,screen=false)=>{const p=add('wall-route',name,a,[1,1,1],'yavin-wall','#ffffff',Math.atan2(b[0]-a[0],b[2]-a[2])),s=structuredClone(YAVIN_PRESETS[screen?2:3].preset.route.segments[0]);s.run=Math.hypot(b[0]-a[0],b[2]-a[2]);s.railing.height=height;p.route={width:.65,thickness:.2,gap:.2,segments:[s]};return p;};
 const object=(name,build)=>{const start=parts.length;build();const members=parts.slice(start);if(members.length>1)for(const p of members){p.assemblyId='rainwell-object-'+members[0].id;p.assemblyName=name+' · '+district.replace(/^\d+ · /,'');}};
 const torch=(x,y,z)=>object('Votive lamp',()=>{box('Carved votive plinth',[x,y,z],[.65,1.5,.65]);add('orb','Amber offering light',[x,y+1.65,z],[.3,.3,.3],'plain','#e3c476');});
 const well=(name,x,y,z,size=4)=>object(name,()=>{add('ring-body',name+' · stone basin',[x,y,z],[size,.65,size],'yavin-wall','#ffffff').parameters={sides:24,wallThickness:15};add('round',name+' · still water',[x,y+.27,z],[size*.66,.08,size*.66],'plain','#427f70');});
 const normalizePlant=(flora,prefix)=>{const nodes=[...flora.branches,...flora.organs],ids=new Map(nodes.map((n,i)=>[n.id,prefix+'-'+i]));for(const n of nodes)for(const key of ['id','parent','branch','parentOrgan'])if(ids.has(n[key]))n[key]=ids.get(n[key]);return JSON.parse(JSON.stringify(flora));};

 // Solid banks have actual stair slots; the lower lane is not buried in terrain.
 box('Southern jungle bank',[0,-6,56],[140,6,44],'forest-floor','#9baf7c');
 box('Southern bank · far west shoulder',[-54,-6,29],[32,6,10],'forest-floor','#9baf7c');
 box('Southern bank · middle shoulder',[-3,-6,29],[58,6,10],'forest-floor','#9baf7c');
 box('Southern bank · east shoulder',[52,-6,29],[36,6,10],'forest-floor','#9baf7c');
 box('Temple upland',[0,-6,-52],[140,10,56],'forest-floor','#9aaa7c');
 box('Temple bank · west shoulder',[-22,-6,-16],[96,10,16],'forest-floor','#9aaa7c');
 box('Temple bank · east shoulder',[52,-6,-16],[36,10,16],'forest-floor','#9aaa7c');
 box('Ravine bed',[0,-6,8],[140,2,32],'rift-stone','#a0a48b');
 box('Jade creek · water',[0,-3.3,8],[140,.12,17],'plain','#487e70');
 for(const side of [-1,1])for(let i=0;i<13;i++){const x=-65+i*10,z=side<0?-7:23;const p=add('hex','Mossy broken river escarpment',[x,-4,z],[8+(i%3),side<0?7.7:3.7,3.5+(i%2)],'rift-stone','#9ea58a',i*.49);p.shape={taper:.12,bulge:.1,twist:0};if(x>24&&x<36||x>-40&&x<-30&&side>0)parts.pop();}

 district='02 · Pilgrim approach';
 box('Processional paving',[0,-.02,58],[12,.08,34],'yavin-floor');
 box('Gate apron',[0,-.02,72],[30,.08,9],'yavin-floor');
 for(const x of [-12,12]){object('Ruined gate pillar',()=>{box('Broken gate footing',[x,0,68],[6,1.2,6]);box('Gate shoulder',[x,1.2,68],[4.4,3.8,4.4],'yavin-wall');box('Gate head',[x,5,68],[3.2,x<0?5:7,3.2],'yavin-wall');box('Gate capital',[x,x<0?9.7:11.7,68],[4,.45,4]);});torch(x,0,62);}
 well('Pilgrim cistern',17,0,48,5);
 ruin('East garden · broken screen',[20,0,57],[43,0,57],2.8);
 ruin('East garden · outer ruin',[45,0,57],[45,0,39],3.1);
 for(const [x,z] of [[-8,55],[8,47],[-9,38],[19,39],[39,48]]){box('Fallen carved masonry',[x,0,z],[2.5,1.1,1.5],'yavin-wall');torch(x+1.6,0,z);}
 const approach=route('Great stair · three flights',[0,0,40],8,[stair(4,4/3,8,{fillToGround:true}),flat(2,{fillToGround:true}),stair(4,4/3,8,{fillToGround:true}),flat(2,{fillToGround:true}),stair(4,4/3,8,{fillToGround:true})]);

 district='03 · The carved bridge';
 const bridge=add('stair-route','Rainwell bridge · broad Temple crossing',[0,4,24],[1,1,1],'yavin-bridge-stone','#ffffff',Math.PI);bridge.route=structuredClone(YAVIN_PRESETS[5].preset.route);bridge.route.width=10;bridge.route.segments[0].run=16;bridge.route.segments.push(structuredClone(bridge.route.segments[0]));
 for(let z=2.25;z<32;z+=4.5)box('Bridge slab · riverbed foundation',[0,-4,24-z],[15.4,3.3,1.5],'yavin-bridge-stone');
 box('North bridge threshold',[0,3.8,-10],[14,.2,4],'yavin-bridge-paving');
 for(const x of [-9,9])object('Bridge sentinel',()=>{box('North bridge sentinel foot',[x,4,-12],[2.5,.65,2.5]);add('taper','Weathered bridge sentinel',[x,4.65,-12],[2.1,6.4,2.1],'yavin-wall');box('Sentinel crown',[x,11.05,-12],[2.7,.4,2.7]);});

 district='04 · The high aqueduct';
 const aqueduct=add('stair-route','High aqueduct · alternate covered and open spans',[-25,12,34],[1,1,1],'yavin-aqueduct-stone','#ffffff',Math.PI);aqueduct.route={width:4.2,thickness:.5,gap:.2,groundHeight:-4,segments:[]};
 for(const [covered,run] of [[true,10],[false,18],[true,10],[false,22],[true,6]]){const s=structuredClone(YAVIN_PRESETS[covered?6:4].preset.route.segments[0]);s.run=run;s.fillToGround=covered;aqueduct.route.segments.push(s);}
 route('Aqueduct ascent · sheltered west approach',[-25,0,62],4.2,[stair(12,6,32,{fillToGround:true,railing:stairRail}),flat(4,{fillToGround:true}),stair(12,6,32,{fillToGround:true,railing:stairRail})]);
 route('Aqueduct descent · temple terrace',[-25,12,-32],4.2,[stair(8,-3,16,{fillToGround:true,railing:stairRail}),flat(2,{fillToGround:true}),stair(8,-3,16,{fillToGround:true,railing:stairRail})],Math.PI,4);
 box('West terrace link · meets grand stair landing',[-17.5,4,-23],[27,2,3],'yavin-floor');

 district='05 · Creek route';
 route('East creek descent',[30,0,34],5,[stair(10,-1.8,10,{fillToGround:true})],Math.PI,-4);
 route('East ford · beneath the upper approaches',[30,-1.8,24],5,[flat(32,{fillToGround:true})],Math.PI,-4);
 route('East creek ascent · cut into north bank',[30,-1.8,-8],5,[stair(5.5,2.9,16,{fillToGround:true}),flat(2,{fillToGround:true}),stair(5.5,2.9,16,{fillToGround:true})],Math.PI,-4);
 box('East creek stair · exit landing',[30,2.8,-22.5],[10,1.2,3],'yavin-floor');
 route('Cross-creek underpass · between bridge slabs',[-36,-1.8,15],3,[flat(72,{fillToGround:true})],Math.PI/2,-4);
 route('West creek stair and underpass entry',[-35,0,34],3,[stair(10,-1.8,10,{fillToGround:true}),flat(9,{fillToGround:true})],Math.PI,-4);
 for(const [x,z] of [[-48,4],[-44,18],[45,1],[53,15],[-55,10]])add('hex','River-worn moss boulder',[x,-3.1,z],[3.8,2.6,3.2],'rift-stone','#929e82',x*.1);

 district='06 · The stepped sanctuary';
 box('First temple terrace',[-2,4,-48.5],[58,2,43]);
 box('First terrace · notched eastern approach',[-4,4,-25.25],[54,2,3.5]);
 box('Second temple terrace',[0,6,-49.5],[46,2,37],'yavin-wall');
 box('Sanctuary plinth',[0,8,-51.5],[38,2,29]);
 route('Sanctuary stair · three human-scale flights',[0,4,-16],8,[stair(6,2,12,{fillToGround:true}),flat(1.5,{fillToGround:true}),stair(6,2,12,{fillToGround:true}),flat(1.5,{fillToGround:true}),stair(6,2,12,{fillToGround:true})],Math.PI,4);
 const hall=add('interior','Rainwell sanctuary · walkable hall',[0,10,-48]),plan=defaultInterior();plan.height=8.2;plan.thickness=.5;plan.slab=.25;plan.rooms=[{id:'rainwell-sanctuary-room',x:-10,z:-11,w:20,d:22}];plan.doors=[{id:'rainwell-front-door',axis:'x',line:11,offset:0,width:5.5,height:6.2,kind:'door'},{id:'rainwell-west-door',axis:'z',line:-10,offset:0,width:3,height:3.5,kind:'door'},{id:'rainwell-east-door',axis:'z',line:10,offset:0,width:3,height:3.5,kind:'door'}];plan.finishes={floor:{color:'#ffffff',preset:'yavin-floor',scale:.25},wall:{color:'#ffffff',preset:'yavin-stone',scale:.25},outside:{color:'#ffffff',preset:'yavin-wall',scale:.2},ceiling:{color:'#ffffff',preset:'yavin-stone',scale:.25},roof:{color:'#ffffff',preset:'yavin-stone',scale:.25}};hall.interior=plan;
 for(const x of [-7,7])for(const z of [-41,-48,-55])object('Sanctuary stone pier',()=>{add('taper','Sanctuary stone pier',[x,10,z],[1.6,7.3,1.6],'yavin-wall');box('Sanctuary pier capital',[x,17.3,z],[2.5,.55,2.5]);});
 for(const side of [-1,1])for(const z of [-39,-45,-51,-57])object('Temple buttress',()=>{box('Temple exterior buttress',[side*11.3,10,z],[2.2,8.2,2.4]);box('Buttress crown',[side*11.3,17.7,z],[2.8,.6,3]);});
 well('The Rainwell',0,10,-51,6);
 for(const x of [-4,4])for(const z of [-44,-54])torch(x,10,z);
 object('Sanctuary stepped roof',()=>{box('Sanctuary roof cornice',[0,18.2,-48],[24,.6,26],'yavin-wall');
 add('pyramid','Great Temple · stepped crown',[0,18.8,-48],[24,12,26],'yavin-stone');
 box('Crown shrine',[0,30.8,-48],[5,3.2,5],'yavin-wall');box('Crown shrine cap',[0,34,-48],[6,.7,6]);});
 for(const x of [-16,16]){ruin('Temple terrace · stepped side screen',[x,10,-38],[x,10,-62],3,true);torch(x,10,-37);}
 for(const x of [-13,13])torch(x,6,-25);

 const portal=add('stair-route','Sanctuary · battered entrance passage',[0,10,-36.75],[1,1,1],'yavin-stone','#ffffff',Math.PI);portal.route=structuredClone(YAVIN_PRESETS[1].preset.route);portal.route.width=5.5;portal.route.segments[0].run=2.5;portal.route.segments[0].hallway.height=6;
 box('Sanctuary door · carved lintel',[0,16.2,-36.75],[8.5,.8,1.4],'yavin-wall');
 district='07 · Ruined galleries';
 for(const [x,y,z,w] of [[-42,0,48,18],[38,4,-37,24]]){const p=add('yavin-gallery','Ruined gallery · open underpass',[x,y,z]);p.parameters={bayWidth:w,bayDepth:10,terraceHeight:4.2,passageWidth:4.2,passageHeight:3.5,pierHeight:3.2};for(const dx of [-(w/2-2),w/2-2])route('Gallery stair approach',[x+dx,y,z+13],3,[stair(8,4.2,23,{fillToGround:true})],Math.PI,y);}
 ruin('Western ruin enclosure',[-53,0,34],[-53,0,59],3.8);ruin('Eastern terrace enclosure',[52,4,-30],[52,4,-55],3.5);ruin('North courtyard · west fallen wall',[-19,4,-15],[-9,4,-15],2.5);ruin('North courtyard · east fallen wall',[9,4,-18],[21,4,-18],2.5);
 for(const [x,y,z] of [[-34,0,68],[25,0,65],[-16,4,-9],[17,4,-12],[35,4,-58],[-28,4,-60]]){add('taper','Broken votive column',[x,y,z],[1.3,2.5+(Math.abs(x)%3),1.3],'yavin-wall');box('Fallen column fragment',[x+2,y,z+1],[2.6,.8,1.2]);}

 district='08 · Jungle canopy';
 const trees=[[-61,0,63],[-48,0,73],[-30,0,77],[35,0,77],[55,0,68],[64,0,45],[-62,0,39],[-57,0,27],[58,0,27],[-62,4,-17],[-53,4,-34],[-62,4,-59],[-49,4,-74],[-29,4,-76],[30,4,-77],[48,4,-69],[62,4,-49],[62,4,-25],[51,4,-9],[-51,4,-6],[-65,0,7],[65,0,7],[65,0,75],[-65,4,-76]];
 for(const [i,position] of trees.entries()){const def=FLORA_TREE_PRESETS.find(p=>p.id===(i%3?'yavin-temple-broadleaf':'yavin-slender-grove')),p=add('flora','Yavin jungle canopy '+(i+1),position,[1,1,1],'plain','#ffffff',i*2.399);p.flora=normalizePlant(structuredClone(def.floraPreset),p.id);const size=.7+(i%5)*.09;p.scale=[size, size*(1+(i%3)*.08),size];}
 district='09 · Jungle undergrowth';
 for(const [i,position] of [[-15,0,62],[23,0,62],[-16,0,46],[12,0,37],[40,0,39],[47,0,52],[-47,0,38],[-32,0,40],[-29,0,67],[-35,0,72],[35,0,71],[52,0,60],[-46,-2,18],[-45,-2,0],[43,-2,17],[49,-2,-1],[-18,4,-10],[18,4,-9],[-30,4,-18],[39,4,-25],[49,4,-22],[-28,6,-35],[-28,6,-59],[25,8,-53],[28,4,-72],[-30,4,-70],[54,4,-64],[12,10,-63]].entries()){const p=add('flora','Jungle undergrowth '+(i+1),position),f=defaultFlora(),o=addFloraAsset(f,f.branches[0].id,'yavin-fine-leaves',0);f.detail='swbf2';Object.assign(o.billboard,{count:22,radius:1.5,height:.9,minSize:1,maxSize:1.8,heightScale:1,seed:47+i*19,darknessMin:.75,darknessMax:1});o.offset=[0,.65,0];p.flora=normalizePlant(f,p.id);}
 district='09 · Jungle undergrowth';
 for(const [i,position] of [[-10,18.65,-35],[-6,18.65,-35],[6,18.65,-35],[10,18.65,-35],[-13,18.5,-43],[-13,18.5,-52],[13,18.5,-43],[13,18.5,-52],[-12,10,68],[12,12,68],[-27.6,17.45,29],[-22.4,17.45,29],[-27.6,17.45,1],[-22.4,17.45,1],[-47,7.4,43],[43,11.4,-42]].entries()){const p=add('flora','Hanging jungle vines '+(i+1),position),f=defaultFlora(),o=addFloraAsset(f,f.branches[0].id,'dagobah-vines',0);f.detail='swbf2';Object.assign(o.billboard,{count:15,radius:1.1,height:.1,minSize:.85,maxSize:1.2,heightScale:4,seed:83+i*23,darknessMin:.8,darknessMax:1});o.offset=[0,0,0];p.flora=normalizePlant(f,p.id);}
 district='10 · Scale reference';add('character-reference','Pilgrim · character scale',[0,0,65]);
 // Keep the creek and underpasses above the editor's ground plane.
 for(const p of parts){p.position[1]+=6;if(p.route?.groundHeight!==undefined)p.route.groundHeight+=6;}
 const prepared=preparePatternScaling({format:'open-building-studio',version:1,name:'Yavin · Temple of the Rainwell',parts});
 return validateProject(prepareExampleCopies(prepared,'rainwell-copy'));
}
