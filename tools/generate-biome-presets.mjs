// Named biome plants assembled through the ordinary WonderBlocks attachment API.
import fs from 'node:fs';
import {biomeCrownVariants} from '../src/flora/biome-variations.js';
import * as T from '../vendor/three.module.js';
import {defaultFlora,addFloraAsset,floraAttachmentFrame,floraCurve,syncFloraSharedJoints,validateFlora} from '../src/flora/flora.js';
import {FLORA_TREE_PRESETS} from '../src/flora/flora-tree-presets.js';
const tau=Math.PI*2,V=a=>new T.Vector3(...a),clampRadius=r=>Math.max(.015,r);
function radialRotation(yaw,tilt,roll=0){const q=new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),yaw).multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(1,0,0),tilt)).multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(0,0,1),roll)),e=new T.Euler().setFromQuaternion(q);return [e.x,e.y,e.z];}
function origin(h=0,r=.1,green=false){if(h)h=Math.max(.15,h);const f=defaultFlora();f.colors={bark:green?'#648442':'#91816a',leaf:'#ffffff'};if(green)f.finishes={bark:{preset:'plain',scale:1}};if(h)f.branches=[{id:'trunk',name:'Main stem',parent:null,at:0,profile:'flora-basic-branch',nativeShape:true,points:[[0,0,0],[h*.018,h*.3,0],[-h*.015,h*.66,h*.018],[h*.025,h,0]],radii:[r,Math.max(.015,r*.78),Math.max(.015,r*.5),Math.max(.015,r*.12)]}];return f;}
function limb(f,parent,at,points,radii,name='Bough',target=null){
 const b=addFloraAsset(f,parent,'flora-basic-branch',at,0,target||{branch:parent,at}),frame=floraAttachmentFrame(f,b),inverse=frame.clone().invert(),s=Math.cbrt(Math.abs(frame.determinant()));
 b.points=points.map(p=>V(p).applyMatrix4(inverse).toArray());b.points[0]=[0,0,0];b.radii=radii.map(r=>clampRadius(r/s));b.name=name;return b;
}
function organ(f,asset,{branch=f.branches[0].id,at=0,pos=null,scale=[1,1,1],rotation=[0,0,0],billboard=null}={}){
 const o=addFloraAsset(f,branch,asset,at),frame=floraAttachmentFrame(f,o),inv=frame.clone().invert(),inherited=Math.cbrt(Math.abs(frame.determinant()));
 o.offset=pos?V(pos).applyMatrix4(inv).toArray():[0,0,0];o.rotation=rotation.map(a=>Math.atan2(Math.sin(a),Math.cos(a)));o.scale=scale.map(s=>Math.max(.1,s/inherited));
 if(billboard)Object.assign(o.billboard,billboard);
 return o;
}
function leaf(f,branch,at,size,asset='yavin-fine-leaves',seed=1){
 const o=organ(f,asset,{branch,at});Object.assign(o.billboard,{count:10,lowDetailCount:4,radius:size*.48,height:size*.35,minSize:size*.65,maxSize:size,heightScale:.7,seed,atlas:asset.startsWith('biome-')||asset==='endor-redwood-needles'?1:2,anchor:'center',facing:'camera'});return o;
}
function broadleaf({h=12,r=.35,spread=4,branches=8,leafAsset='endor-leaves',shape='round',trunks=1}={}){
 const f=origin(h,r);if(shape==='birch')f.finishes={bark:{preset:'aspen-bark',scale:.55}};
 if(shape==='cypress'){f.branches[0].points=[[0,0,0],[.03,1.5,.03],[.12,4,.08],[-.15,11.5,.2],[.2,h,0]];f.branches[0].radii=[1.05,.48,.3,.2,.05];}
 for(let i=0;i<branches;i++){
  const at=shape==='upright'?.3+i*.6/branches:shape==='cypress'?.68+i*.29/branches:shape==='mangrove'?.5+i*.38/branches:.35+i*.5/branches,a=i*2.399963+.2,root=floraCurve(f,'trunk').getPoint(at),reach=spread*(shape==='upright'?.55:1)*(.7+.3*Math.sin((i+.5)/branches*Math.PI)),rise=shape==='upright'?h*.25:h*.08;
  const tip=[Math.cos(a)*reach,root.y+rise+.3*Math.sin(i),Math.sin(a)*reach],b=limb(f,'trunk',at,[root.toArray(),[Math.cos(a)*reach*.45,root.y+rise*.9,Math.sin(a)*reach*.45],tip],[r*.34,r*.19,.018],'Crown bough '+(i+1));
  leaf(f,b.id,.6,Math.max(.45,spread*.6),leafAsset,401+i*31);leaf(f,b.id,1,Math.max(.45,spread*.67),leafAsset,501+i*31);
 }
 leaf(f,'trunk',1,Math.max(.45,spread*.7),leafAsset,701);
 if(trunks>1)for(let i=1;i<trunks;i++){const a=i*tau/trunks;limb(f,'trunk',0,[[0,0,0],[Math.cos(a)*h*.12,h*.5,Math.sin(a)*h*.12],[Math.cos(a)*h*.18,h*.85,Math.sin(a)*h*.18]],[r*.7,r*.4,.03],'Secondary stem '+i);}
 return f;
}
function conifer({h=14,r=.3,spread=3,tiers=5,form='spruce'}={}){
 const f=origin(h,r);f.colors.bark='#84765d';
 for(let row=0;row<tiers;row++)for(let spoke=0;spoke<4;spoke++){
  const at=form==='pine'?.48+row*.095:.22+row*.14,root=floraCurve(f,'trunk').getPoint(at),a=spoke*tau/4+row*.73,reach=spread*(form==='pine'?.55+.45*Math.sin((row+.75)/tiers*Math.PI):1-row/(tiers+1)),droop=form==='spruce'?-.25:.45;
  const b=limb(f,'trunk',at,[root.toArray(),[Math.cos(a)*reach*.55,root.y+droop,Math.sin(a)*reach*.55],[Math.cos(a)*reach,root.y+.35,Math.sin(a)*reach]],[r*.22,r*.14,.015],'Needle tier '+(row+1));
  for(const t of [.45,.85]){const o=organ(f,'endor-redwood-needles',{branch:b.id,at:t});Object.assign(o.billboard,{count:4,lowDetailCount:2,radius:reach*.22,height:.25,minSize:reach*.7,maxSize:reach*.95,heightScale:.7,atlas:1,seed:800+row*53+spoke*11+(t>.5?3:0),facing:'camera',anchor:'center'});}
 }
 if(form==='pine')leaf(f,'trunk',1,1.1,'endor-redwood-needles',1381);
 return f;
}
function patch(asset,{height=.7,count=7,radius=.45,tint='#ffffff',seed=1121}={}){
 const f=origin();f.colors.leaf=tint;const o=organ(f,asset);Object.assign(o.billboard,{count,lowDetailCount:Math.max(1,Math.ceil(count*.4)),radius,height:.04,minSize:height*.8,maxSize:height,heightScale:1,atlas:1,anchor:'bottom',facing:'upright',seed});return f;
}
function scrub({h=1.2,spread=.8,asset='biome-sprite-cold-leaves',stems=5}={}){
 const f=origin(h*.25,Math.max(.025,h*.035));
 for(let i=0;i<stems;i++){const a=i*2.39996,root=floraCurve(f,'trunk').getPoint(.25),p=[Math.cos(a)*spread,h*(.65+.2*Math.sin(i)),Math.sin(a)*spread],b=limb(f,'trunk',.25,[root.toArray(),[p[0]*.55,h*.55,p[2]*.55],p],[Math.max(.02,h*.025),.02,.015],'Scrub stem '+i);leaf(f,b.id,.8,Math.max(.3,spread*.9),asset,900+i*27);}
 return f;
}
function blades({h=1,width=1,count=9,asset='biome-ribbon-leaf',stem=0,green=true}={}){
 const f=origin(stem,stem?.06:.1,green),branch=f.branches[0].id;
 for(let i=0;i<count;i++){const a=i*2.39996,fern=asset==='flora-fern-frond',nativeLength=fern?2.4:1,tilt=(asset==='biome-banana-leaf'?.85:fern?.55:.18)+(i%3)*.14;organ(f,asset,{branch,at:stem?1:0,scale:[width/nativeLength,h*(.7+.3*Math.sin(i*1.7)**2)/nativeLength,width/nativeLength],rotation:radialRotation(a,tilt,.12*Math.sin(i))});}
 return f;
}
function reed({h=1.6,head='biome-reed-head',count=5,headScale=[1,1,1]}={}){
 const f=origin();f.colors.bark='#74854c';f.finishes={bark:{preset:'plain',scale:1}};
 for(let i=0;i<count;i++){const a=i*2.39996,rr=.22*Math.sqrt((i+.5)/count),x=Math.cos(a)*rr,z=Math.sin(a)*rr,top=h*(.72+.28*Math.sin(i*3+1)**2);organ(f,'biome-herb-stem',{pos:[x,0,z],scale:[head==='biome-cotton-head'?.65:1,top,head==='biome-cotton-head'?.65:1]});organ(f,head,{pos:[x,top,z],scale:headScale});}
 for(let i=0;i<10;i++)organ(f,'biome-sedge-leaf',{scale:[head==='biome-cotton-head'?.3:.8,h*.8,.6],rotation:radialRotation(i*2.39996,.18+(i%3)*.12)});return f;
}
function moss({lichen=false}={}){const f=origin();f.colors.leaf=lichen?'#ffffff':'#7b974b';for(let i=0;i<9;i++){const a=i*2.39996,rr=.25*Math.sqrt(i/9);organ(f,'biome-lichen-lobe',{pos:[Math.cos(a)*rr,0,Math.sin(a)*rr],scale:[.7+(i%3)*.2,lichen?.6:1.3,.7+(i%2)*.2],rotation:[0,a,0]});}return f;}
function cactus(kind){
 if(kind==='barrel'){const f=origin();f.colors.bark='#ffffff';organ(f,'biome-cactus-barrel');return f;}
 if(kind==='pear'){const f=origin();f.colors.bark='#ffffff';for(let i=0;i<7;i++){const a=i*2.39996,level=i<3?0:.55;organ(f,'biome-cactus-pad',{pos:[Math.cos(a)*(i? .25:0),level,Math.sin(a)*(i?.18:0)],scale:[.7+(i%2)*.15,.75,.85],rotation:[0,a,(i%2-.5)*.45]});}return f;}
 const f=origin(4.8,.28,true);for(const [side,at] of [[-1,.35],[1,.55]]){const p=floraCurve(f,'trunk').getPoint(at);limb(f,'trunk',at,[p.toArray(),[side*.8,p.y+.05,0],[side*1.1,p.y+.45,0],[side*1.1,p.y+1.5,0]],[.16,.15,.13,.075],'Upturned cactus arm');}return f;
}
function lily(){const f=origin();organ(f,'biome-lily-pad',{scale:[1.1,1,1.1],rotation:[0,.37,0]});return f;}
function swampLilyBed(){
 const f=origin();
 for(const [x,y,z,size,yaw] of [[-.85,.012,0,2.9,.37],[.85,.024,.5,2.7,2.17],[.1,.036,-.9,2.8,4.51]])organ(f,'biome-lily-pad',{pos:[x,y,z],scale:[size,1,size],rotation:[0,yaw,0]});
 return f;
}
function clone(id,scale=1){const f=structuredClone(FLORA_TREE_PRESETS.find(p=>p.id===id).floraPreset);for(const b of f.branches){b.points=b.points.map(p=>p.map(x=>x*scale));b.radii=b.radii.map(r=>Math.max(.015,r*scale));}for(const o of f.organs){o.offset=o.offset.map(x=>x*scale);o.scale=o.scale.map(x=>Math.max(.1,x*scale));if(o.billboard)o.billboard.lowDetailCount=Math.max(1,Math.ceil(o.billboard.count*.4));}return f;}
function mangrove(){
 const f=broadleaf({h:11.8,r:.23,spread:3.6,branches:9,shape:'mangrove',leafAsset:'yavin-fine-leaves'});
 f.colors.bark='#b4ad9d';f.finishes={bark:{preset:'bf1-naboo-fine-bark',scale:.8}};
 for(let i=0;i<12;i++){const at=.13+(i%4)*.045,base=floraCurve(f,'trunk').getPoint(at),angle=i*2.399963+.7,reach=2.1+.9*Math.sin(i*1.7)**2,x=Math.cos(angle)*reach,z=Math.sin(angle)*reach;
  const root=limb(f,'trunk',at,[base.toArray(),[x*.27,base.y-.18,z*.27],[x*.69,.65+(i%2)*.2,z*.69],[x,-.18,z]],[.13,.09,.048,.02],'Arching prop root '+(i+1));
  if(i%3===0){const at=.58,p=floraCurve(f,root.id).getPoint(at),angle2=angle+.33,reach2=reach*1.06;
   limb(f,root.id,at,[p.toArray(),[Math.cos(angle2)*reach2*.84,.35,Math.sin(angle2)*reach2*.84],[Math.cos(angle2)*reach2,-.18,Math.sin(angle2)*reach2]],[.04,.026,.015],'Forked root '+(i+1));
  }
 }
 return f;
}
function withMoss(f){
 const supports=f.branches.filter(b=>!b.anchor&&b.parent).slice(0,8);
 for(const [i,b] of supports.entries())for(const at of [.58,.9]){
  const o=organ(f,'biome-sprite-spanish-moss',{branch:b.id,at});
  Object.assign(o.billboard,{count:2,lowDetailCount:1,radius:.2,height:.08,minSize:.8+(i%3)*.12,maxSize:1.1+(i%3)*.15,heightScale:2.7,seed:2301+i*17+Math.round(at*10),atlas:1,anchor:'top',facing:'upright'});
 }
 return f;
}
function pandanus(){
 const f=origin(3.8,.14);
 for(let i=0;i<6;i++){const at=.2+(i%2)*.09,p=floraCurve(f,'trunk').getPoint(at),angle=i*tau/6+.3,x=Math.cos(angle)*.95,z=Math.sin(angle)*.95;
  limb(f,'trunk',at,[p.toArray(),[x*.62,p.y*.56,z*.62],[x,-.1,z]],[.075,.052,.022],'Pandanus stilt root '+(i+1));
 }
 for(let i=0;i<22;i++)organ(f,'biome-ribbon-leaf',{branch:'trunk',at:1,scale:[1.4,2.2,1.4],rotation:radialRotation(i*2.39996,.8+(i%3)*.15)});
 return f;
}
function palm(kind){
 const fan=kind==='fan',date=kind==='date',under=kind==='understory',h=fan?7:date?8.5:under?4.2:11,r=date?.33:under?.12:.2,f=origin(h,r);
 const lean=date?.025:fan?.055:under?.08:.17;
 f.branches[0].points=[[0,0,0],[h*lean*.12,h*.28,0],[h*lean*.5,h*.64,-h*.015],[h*lean,h,-h*.025]];
 f.branches[0].radii=[r,r*.84,r*.72,r*.62];
 f.branches[0].name=date?'Date palm stout trunk':fan?'Fan palm trunk':under?'Understory palm stem':'Leaning coconut trunk';
 const count=fan?10:date?18:under?10:12;
 for(let i=0;i<count;i++){
  const yaw=i*2.399963,upper=i%3===0,length=fan?1.85:date?3.4:under?1.7:3.8,tilt=fan?.45+i/(count-1)*1.6:upper?.65:1.32+(i%3)*.22;
  organ(f,fan?'biome-fan-frond':'biome-palm-frond',{branch:'trunk',at:fan?.94+.06*i/(count-1):1,scale:[length*(date?.9:1),length*(.82+.18*Math.sin(i*1.7)**2),length],rotation:radialRotation(yaw,tilt,.15*Math.sin(i))});
 }
 return f;
}
function blackMangrove(){
 const f=broadleaf({h:7.5,r:.26,spread:3.1,branches:7,shape:'mangrove',leafAsset:'yavin-fine-leaves'});
 f.colors.bark='#817c6b';
 for(let i=0;i<10;i++){
  const a=i*2.399963,reach=1.2+(i%4)*.55,x=Math.cos(a)*reach,z=Math.sin(a)*reach;
  limb(f,'trunk',0,[[0,0,0],[x*.55,-.25,z*.55],[x,-.16,z],[x+.03,.24+(i%3)*.07,z]],[.035,.03,.025,.015],'Breathing root pneumatophore '+(i+1));
 }
 return f;
}
function coastalTree(){
 const f=broadleaf({h:6.5,r:.32,spread:3.7,branches:7,leafAsset:'yavin-leaves'});
 f.branches[0].points=[[0,0,0],[.5,1.7,0],[1.4,3.6,.15],[2.8,5.7,.3]];
 for(const b of f.branches.slice(1))for(let j=1;j<b.points.length;j++){const t=j/(b.points.length-1);b.points[j][0]+=1.7*t;b.points[j][1]*=.7;}
 return f;
}
function treelineConifer(){
 const f=conifer({h:4.8,r:.22,spread:1.7,tiers:4});
 f.branches[0].points=[[0,0,0],[-.15,1.5,.05],[.42,3.1,.08],[.8,4.8,.1]];
 const p=floraCurve(f,'trunk').getPoint(.64),b=limb(f,'trunk',.64,[p.toArray(),[-.8,3.5,.3],[-1.1,4.2,.4]],[.11,.07,.025],'Forked treeline leader');
 leaf(f,b.id,.8,1.1,'endor-redwood-needles',3511);return f;
}
function deadwood(kind){
 const fallen=kind==='fallen',f=origin(fallen?0:kind==='broken'?5:9,.4);
 f.woodConstruction='swept';
 f.colors.bark='#8b8275';f.finishes={bark:{preset:'bf2-dagobah-weathered-bark',scale:.8}};
 if(fallen){f.branches=[{id:'trunk',name:'Fallen trunk',parent:null,at:0,profile:'flora-basic-branch',nativeShape:true,points:[[0,.32,0],[2.1,.4,.25],[4.8,.3,.05],[7,.22,-.3]],radii:[.4,.32,.24,.12]}];}
 else{const b=f.branches[0];b.name=kind==='broken'?'Broken main trunk':'Standing weathered snag';b.radii[b.radii.length-1]=kind==='broken'?.23:.07;}
 for(let i=0;i<(kind==='broken'?3:5);i++){
  const at=.35+i*.1,p=floraCurve(f,'trunk').getPoint(at),a=i*2.399963,reach=kind==='broken'?.65:1.25;
  limb(f,'trunk',at,[p.toArray(),[p.x+Math.cos(a)*reach*.6,p.y+(fallen?.45:.3),p.z+Math.sin(a)*reach*.6],[p.x+Math.cos(a)*reach,p.y+(fallen?.8:.6),p.z+Math.sin(a)*reach]],[.1,.065,.025],'Broken branch stub '+(i+1));
 }
 return f;
}
function withVines(f){
 const supports=f.branches.filter(b=>!b.anchor&&b.parent).sort((a,b)=>floraCurve(f,b.id).getPoint(.65).y-floraCurve(f,a.id).getPoint(.65).y).slice(0,3);
 if(!supports.length)return f;
 for(let i=0;i<supports.length;i++){const s=supports[i],p=floraCurve(f,s.id).getPoint(.65),q=[p.x+.2*Math.sin(i),Math.max(.1,p.y-3.3-i*.4),p.z+.25],b=limb(f,s.id,.65,[p.toArray(),[p.x+.35,p.y-.9,p.z+.2],[p.x-.2,p.y-2.2,p.z+.35],q],[.035,.028,.022,.015],'Hanging liana '+i);const o=organ(f,'dagobah-vines',{branch:b.id,at:.35});Object.assign(o.billboard,{count:3,lowDetailCount:1,radius:.18,height:.4,minSize:.45,maxSize:.65,heightScale:3,atlas:2,seed:1100+i,anchor:'top',facing:'upright'});}
 const stem=f.branches.find(b=>!b.anchor),root=floraCurve(f,stem.id).getPoint(.15),points=[root.toArray()];
 for(let i=0;i<6;i++){const p=floraCurve(f,stem.id).getPoint(.18+i*.12),angle=i*1.8;points.push([p.x+Math.cos(angle)*.28,p.y,p.z+Math.sin(angle)*.28]);}
 limb(f,stem.id,.15,points,[.035,.033,.03,.028,.026,.023,.018],'Climbing trunk vine');
 return f;
}
const specs=[];
const add=(id,name,biomes,form,params={},notes='')=>specs.push({id:'biome-'+id,name,biomes:biomes.split(','),form,params,notes});
add('oak','Spreading Oak','woodland,woodland-edge','broadleaf',{h:13,r:.5,spread:5,branches:8});
add('birch','Silver Birch','woodland,riparian','broadleaf',{h:14,r:.23,spread:2.7,branches:7,shape:'birch',leafAsset:'yavin-fine-leaves'});
add('hazel','Hazel Thicket','woodland,woodland-edge','scrub',{h:2.7,spread:1.7,stems:6});
add('wood-fern','Woodland Sword Fern','woodland,foothill','blades',{h:.9,width:1,count:7,asset:'flora-fern-frond'});
add('pine','Scots Pine','foothill,woodland','conifer',{h:16,r:.32,spread:3.8,tiers:5,form:'pine'});
add('spruce','Mountain Spruce','foothill','conifer',{h:14,r:.29,spread:3,tiers:6});
add('rowan','Mountain Rowan','foothill,woodland-edge','broadleaf',{h:8,r:.2,spread:2.7,branches:6,leafAsset:'yavin-fine-leaves'});
add('juniper','Low Juniper','foothill,alpine','scrub',{h:1.1,spread:1.2,asset:'endor-redwood-needles',stems:5});
add('dwarf-willow','Dwarf Willow','tundra,alpine','scrub',{h:.32,spread:.38,asset:'biome-sprite-cold-leaves',stems:4});
add('dwarf-birch','Dwarf Birch','tundra','scrub',{h:.55,spread:.48,asset:'biome-sprite-cold-leaves',stems:5});
add('heather','Alpine Heather','tundra,alpine','patch',{asset:'biome-sprite-heather',height:.8,count:3,radius:.18});
add('cotton-sedge','Cotton Sedge','tundra,marsh','reed',{h:.48,head:'biome-cotton-head',count:5,headScale:[.45,.45,.45]});
add('tussock','Tussock Sedge','tundra,marsh','patch',{asset:'biome-sprite-sedge',height:.42,count:5,radius:.3});
add('saxifrage','Alpine Cushion Flowers','alpine,tundra','patch',{asset:'biome-sprite-meadow-flowers',height:.16,count:5,radius:.24});
add('alpine-grass','Alpine Bunchgrass','alpine,tundra','patch',{asset:'biome-sprite-sedge',height:.23,count:4,radius:.15});
add('lichen','Pioneer Lichen Cushion','alpine,volcanic-margin','moss',{lichen:true},'Lichen is a symbiotic groundcover, placed only on stable exposed substrate.');
add('fescue','Prairie Fescue','prairie,woodland-edge','patch',{asset:'biome-sprite-fescue',height:.5,count:7,radius:.5});
add('bluestem','Tall Bluestem Grass','prairie','patch',{asset:'biome-sprite-bluestem',height:1.25,count:5,radius:.4});
add('meadow-flowers','Meadow Wildflowers','prairie,woodland-edge','patch',{asset:'biome-sprite-meadow-flowers',height:.55,count:8,radius:.65});
add('broom','Meadow Broom Shrub','prairie,woodland-edge','scrub',{h:1.1,spread:.75,asset:'biome-sprite-broadleaf-scrub',stems:5});
add('kapok','Rainforest Kapok','rainforest','clone',{preset:'kapok-mature',scale:.85});
add('fig','Spreading Tropical Fig','rainforest','broadleaf',{h:18,r:.7,spread:6,branches:9,leafAsset:'yavin-leaves',trunks:3});
add('understory-palm','Understory Palm','rainforest,swamp','palm',{kind:'understory'});
add('banana','Broadleaf Banana','rainforest','blades',{h:2.3,width:2.2,count:7,asset:'biome-banana-leaf',stem:1.2});
add('giant-fern','Giant Rainforest Fern','rainforest,swamp','blades',{h:1.6,width:1.6,count:9,asset:'flora-fern-frond'});
add('vined-fig','Tropical Fig with Lianas','rainforest','vined-fig');
add('mangrove','Red Mangrove','swamp,tropical-coast','mangrove');
add('vined-mangrove','Mangrove with Tangled Vines','swamp','vined-mangrove');
add('cypress','Swamp Cypress','swamp,riparian','broadleaf',{h:18,r:.36,spread:3,branches:8,shape:'cypress',leafAsset:'endor-redwood-needles'});
add('pandanus','Stilt-root Pandanus','swamp,tropical-coast','pandanus');
add('cattail','Cattail Clump','marsh,riparian','reed',{h:1.65,count:6});
add('bulrush','Bulrush Clump','marsh,riparian','reed',{h:1.15,head:'biome-reed-head',count:5,headScale:[.7,.3,.7]});
add('reed','Kashyyyk Reed Bed','marsh,riparian','patch',{asset:'biome-sprite-reed',height:1.4,count:5,radius:.5});
add('glasswort','Saltmarsh Glasswort','marsh,tropical-coast','glasswort');
add('willow','Riverbank Weeping Willow','riparian','clone',{preset:'weeping-willow',scale:1});
add('alder','River Alder','riparian,glacier-margin','broadleaf',{h:8,r:.24,spread:2.8,branches:6,trunks:2});
add('poplar','Tall River Poplar','riparian','broadleaf',{h:15,r:.25,spread:2.3,branches:9,shape:'upright',leafAsset:'yavin-fine-leaves'});
add('horsetail','Horsetail Colony','riparian,marsh','horsetail');
add('waterlily','Floating Waterlily Pads','freshwater','lily');
add('swamp-lily-bed','Dense Swamp Lily Bed','freshwater,swamp','swamp-lily');
add('creosote','Desert Creosote Bush','desert','scrub',{h:1.2,spread:.95,asset:'biome-sprite-cold-leaves',stems:6});
add('sagebrush','Silver Desert Sagebrush','desert','patch',{asset:'biome-sprite-sagebrush',height:1.3,count:3,radius:.22});
add('yucca','Desert Yucca','desert','blades',{h:1.25,width:.8,count:16,asset:'biome-yucca-leaf'});
add('barrel-cactus','Ribbed Barrel Cactus','desert','cactus',{kind:'barrel'});
add('prickly-pear','Prickly Pear Cactus','desert,coastal-dune','cactus',{kind:'pear'});
add('column-cactus','Columnar Desert Cactus','desert','cactus',{kind:'column'});
add('date-palm','Oasis Date Palm','oasis','palm',{kind:'date'});
add('tamarisk','Oasis Tamarisk','oasis,riparian-desert','scrub',{h:2.7,spread:1.8,asset:'yavin-fine-leaves',stems:6});
add('sea-oats','Coastal Sea Oats','coastal-dune','patch',{asset:'biome-sprite-sea-oats',height:1.3,count:4,radius:.4});
add('dune-grass','Dune Bunchgrass','coastal-dune','patch',{asset:'biome-sprite-fescue',height:.85,count:6,radius:.45});
add('beach-creeper','Creeping Beach Groundcover','coastal-dune,tropical-coast','patch',{asset:'biome-sprite-cold-leaves',height:.22,count:12,radius:.7});
add('sea-grape','Coastal Sea Grape','tropical-coast','broadleaf',{h:3.5,r:.14,spread:2.1,branches:6,leafAsset:'yavin-leaves'});
add('coconut-palm','Island Coconut Palm','tropical-coast','palm',{kind:'coconut'});
add('black-mangrove','Black Mangrove','swamp,tropical-coast','black-mangrove',{},'Landward swamp margins, with upright breathing roots rather than red-mangrove prop roots.');
add('fan-palm','Coastal Fan Palm','tropical-coast,rainforest','palm',{kind:'fan'});
add('coastal-wind-tree','Wind-shaped Coastal Tree','tropical-coast,woodland-edge','coastal-tree');
add('treeline-conifer','Stunted Treeline Conifer','foothill,alpine','treeline-conifer',{},'Sheltered treeline pockets; leave the main tundra and permanent snow clear.');
add('woodland-sapling','Young Woodland Tree','woodland,woodland-edge','broadleaf',{h:3.4,r:.08,spread:1.1,branches:4,leafAsset:'yavin-fine-leaves'});
add('standing-snag','Standing Dead Snag','woodland,rainforest,foothill,swamp','deadwood',{kind:'snag'});
add('broken-tree','Broken Trunk','woodland,rainforest,swamp','deadwood',{kind:'broken'});
add('fallen-tree','Fallen Tree','woodland,rainforest,foothill,swamp','deadwood',{kind:'fallen'});
add('eelgrass','Sheltered Eelgrass','marine','blades',{h:.55,width:.3,count:9,asset:'biome-ribbon-leaf'});
add('ribbon-seagrass','Ribbon Seagrass','marine','blades',{h:.95,width:.45,count:7,asset:'biome-ribbon-leaf'});
add('pioneer-fern','Pioneer Fern','volcanic-margin,thermal-margin','blades',{h:.45,width:.65,count:5,asset:'flora-fern-frond'});
add('moss','Cool-margin Moss','thermal-margin,riparian','moss');

function create(spec){
 const p=spec.params;let f;
 if(spec.form==='broadleaf')f=broadleaf(p);else if(spec.form==='conifer')f=conifer(p);else if(spec.form==='scrub')f=scrub(p);else if(spec.form==='patch'){const {asset,...settings}=p;f=patch(asset,settings);}else if(spec.form==='blades')f=blades(p);else if(spec.form==='reed')f=reed(p);else if(spec.form==='moss')f=moss(p);else if(spec.form==='cactus')f=cactus(p.kind);else if(spec.form==='lily')f=lily();else if(spec.form==='swamp-lily')f=swampLilyBed();else if(spec.form==='clone')f=clone(p.preset,p.scale);
 else if(spec.form==='vined-fig')f=withVines(broadleaf({h:15,r:.6,spread:5,branches:8,leafAsset:'yavin-leaves'}));
 else if(spec.form==='mangrove')f=mangrove();
 else if(spec.form==='vined-mangrove')f=withVines(mangrove());
 else if(spec.form==='pandanus')f=pandanus();
 else if(spec.form==='palm')f=palm(p.kind);
 else if(spec.form==='black-mangrove')f=blackMangrove();
 else if(spec.form==='coastal-tree')f=coastalTree();
 else if(spec.form==='treeline-conifer')f=treelineConifer();
 else if(spec.form==='deadwood')f=deadwood(p.kind);
 else if(spec.form==='glasswort'){f=origin(.35,.025,true);for(let i=0;i<7;i++){const root=floraCurve(f,'trunk').getPoint(.3+i*.08),a=i*2.4;limb(f,'trunk',.3+i*.08,[root.toArray(),[Math.cos(a)*.16,.3+i*.03,Math.sin(a)*.16],[Math.cos(a)*.2,.42+i*.025,Math.sin(a)*.2]],[.018,.017,.015],'Fleshy glasswort shoot');}}
 else if(spec.form==='horsetail'){f=origin(.7,.018,true);for(let row=0;row<4;row++)for(let i=0;i<4;i++){const at=.25+row*.17,p=floraCurve(f,'trunk').getPoint(at),a=i*tau/4;limb(f,'trunk',at,[p.toArray(),[Math.cos(a)*.15,p.y+.07,Math.sin(a)*.15]],[.015,.015],'Horsetail whorl');}}
 else throw Error(spec.form);
 if(spec.id==='biome-cypress'){
  f.colors.bark='#bab5a6';f.finishes={bark:{preset:'bf2-dagobah-weathered-bark',scale:.9}};
  for(let i=0;i<6;i++){const a=i*tau/6+.3,p=floraCurve(f,f.branches[0].id).getPoint(.045),reach=1.3+(i%2)*.25;limb(f,f.branches[0].id,.045,[p.toArray(),[Math.cos(a)*reach*.55,.3,Math.sin(a)*reach*.55],[Math.cos(a)*reach,-.14,Math.sin(a)*reach]],[.22,.13,.025],'Flared cypress root '+i);}
  withMoss(f);
 }
 f.detail='swbf2';syncFloraSharedJoints(f);validateFlora(f);
 const nodes=[...f.branches,...f.organs],ids=new Map(nodes.map((n,i)=>[n.id,'biome-node-'+i]));for(const n of nodes)for(const key of ['id','parent','branch','parentOrgan'])if(ids.has(n[key]))n[key]=ids.get(n[key]);validateFlora(f);
 return {...spec,planet:'Earth',category:'Tree presets',paletteCategory:'Biomes',sourceName:spec.name+' · '+spec.biomes.join(' · ')+' · editable biome flora',floraPreset:f};
}
const basePresets=[];for(const spec of specs){try{basePresets.push(create(spec));}catch(error){throw new Error(spec.id+': '+error.message,{cause:error});}}
const presets=biomeCrownVariants(basePresets);
for(const p of presets){try{
 const f=p.floraPreset;syncFloraSharedJoints(f);
 // Trunk bending also tilts attached roots. Restore their soil contacts in
 // world space, while retaining the arch and the editable parent connection.
 for(const b of f.branches.filter(b=>/prop root|forked root|cypress root|pandanus stilt root/i.test(b.name))){
  const frame=floraAttachmentFrame(f,b),tip=V(b.points.at(-1)).applyMatrix4(frame);tip.y=-.18;b.points[b.points.length-1]=tip.applyMatrix4(frame.clone().invert()).toArray();
 }
 validateFlora(f);
}catch(error){throw new Error(p.id+': '+error.message,{cause:error});}}
fs.writeFileSync(new URL('../src/flora/data/biome-presets-data.js',import.meta.url),'// Generated by tools/generate-biome-presets.mjs through the normal plant editor API.\nexport const BIOME_PRESETS='+JSON.stringify(presets,null,1)+';\n');
fs.writeFileSync(new URL('../assets/biome-flora/plant-index.json',import.meta.url),JSON.stringify(presets.map(({floraPreset,...p})=>({...p,branches:floraPreset.branches.length,organs:floraPreset.organs.length})),null,2));
console.log('Generated '+presets.length+' editable biome plants.');
