import * as THREE from '../../vendor/three.module.js';
export const NEW_YORK_PARTS=[
 ['ny-mansard','Mansard roof','#667d7b'],['ny-deco-crown','Fluted Deco crown','#c6baa1'],['ny-terrace-crown','Terraced crown','#c6baa1'],['ny-cupola','Octagonal cupola','#809792'],['ny-lantern','Open rooftop lantern','#b8bcae'],['ny-barrel','Barrel vault roof','#748c90'],['ny-sawtooth','Sawtooth factory roof','#7b8989'],['ny-pinnacles','Corner pinnacle crown','#b9b6a7'],
 
 ['ny-cornice','City cornice','#cfc4ab'],['ny-parapet','Rooftop parapet','#b9b2a1'],['ny-mast','Art Deco mooring mast','#c4c8c6'],['ny-spire','Broadcast antenna','#bac4c8'],
 ['ny-entry','Deco entrance portal','#c7b891'],['ny-water-tank','Rooftop water tower','#896b50'],['ny-hvac','Rooftop plant unit','#8c9695'],['ny-fire-escape','Fire escape landing','#49545a'],['ny-awning','Shop awning','#52796b'],
 ['ny-crosswalk','Zebra crossing','#e7e3cb'],['ny-lamp','Street lamp','#48575b'],['ny-taxi','Yellow taxi','#e2b63f']
].map(([id,name,color])=>({id,name,color,category:'New York',icon:'◇'}));
export function buildNewYork(type,group,material){
 const dark=new THREE.MeshStandardMaterial({color:'#354249',roughness:.85}),glass=new THREE.MeshStandardMaterial({color:'#527783',roughness:.4,metalness:.2});
 const used=new Set();
 const mesh=(g,x=0,y=0,z=0,mat=material)=>{const m=new THREE.Mesh(g,mat);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;group.add(m);used.add(mat);return m;};
 const box=(w,h,d,x=0,y=h/2,z=0,mat=material)=>mesh(new THREE.BoxGeometry(w,h,d),x,y,z,mat);
 const cyl=(r1,r2,h,y,mat=material,n=8)=>mesh(new THREE.CylinderGeometry(r1,r2,h,n,1),0,y,0,mat);
 const rim=(w,d,y,h,t=.08)=>{box(w,h,t,0,y,d/2);box(w,h,t,0,y,-d/2);box(t,h,d-t,t/2-w/2,y);box(t,h,d-t,w/2-t/2,y);};
 const frustum=(bottom,top,height,y)=>{const g=new THREE.CylinderGeometry(top/Math.SQRT2,bottom/Math.SQRT2,height,4,1);g.rotateY(Math.PI/4);return mesh(g,0,y+height/2);};
 switch(type){
 case 'ny-mansard':frustum(2,1.3,.65,0);box(1.3,.08,1.3,0,.69);for(const x of [-.5,.5])for(const sign of [-1,1]){box(.30,.32,.18,x,.29,sign*.87,glass);box(.36,.055,.25,x,.475,sign*.87);}break;
 case 'ny-deco-crown':frustum(2,1.3,.7,0);for(const x of [-.7,0,.7])for(const z of [-.7,.7]){box(.1,.85,.1,x,.425,z);frustum(.2,0,.2,.85).position.x=x;group.children.at(-1).position.z=z;}box(1.35,.07,1.35,0,.735);break;
 case 'ny-terrace-crown':for(let i=0;i<3;i++){const w=2-i*.45;box(w,.22,w,0,i*.3+.11);rim(w,w,i*.3+.26,.08,.06);}break;
 case 'ny-cupola':cyl(.62,.62,.65,.325);cyl(.62,.7,.08,.69);cyl(.18,.7,.5,.98);cyl(0,.18,.3,1.38);break;
 case 'ny-lantern':box(1.5,.12,1.5);for(const x of [-.57,.57])for(const z of [-.57,.57])box(.1,.8,.1,x,.52,z);frustum(1.6,.3,.5,.92);break;
 case 'ny-barrel':{const shape=new THREE.Shape();shape.moveTo(-1,0);for(let i=0;i<=8;i++){const a=Math.PI-i*Math.PI/8;shape.lineTo(Math.cos(a),Math.sin(a)*.65);}shape.lineTo(1,0);shape.closePath();const g=new THREE.ExtrudeGeometry(shape,{depth:2,bevelEnabled:false,steps:1});g.translate(0,0,-1);mesh(g);break;}
 case 'ny-sawtooth':{const s=new THREE.Shape();s.moveTo(-1,0);for(let i=0;i<3;i++){const x=-1+i*2/3;s.lineTo(x,.12);s.lineTo(x+.55,.65);s.lineTo(x+2/3,.12);}s.lineTo(1,0);s.closePath();const g=new THREE.ExtrudeGeometry(s,{depth:2,steps:1,bevelEnabled:false});g.translate(0,0,-1);mesh(g);break;}
 case 'ny-pinnacles':rim(2,2,.12,.24);for(const x of [-.9,.9])for(const z of [-.9,.9]){box(.24,.5,.24,x,.25,z);const m=frustum(.35,0,.55,.5);m.position.x=x;m.position.z=z;}break;
 case 'ny-cornice':box(2,.09,2);box(2.08,.08,2.08,0,.13);break;
 case 'ny-parapet':rim(2,2,.10,.2);break;
 case 'ny-mast':box(1,.22,1);box(.78,.65,.78,0,.545);cyl(.25,.38,.75,1.245);cyl(.16,.25,.4,1.82);break;
 case 'ny-spire':cyl(.055,.1,1.5,.75);cyl(.01,.045,.65,1.825);for(const y of [.35,.85,1.3])box(.3,.04,.08,0,y);break;
 case 'ny-entry':for(const x of [-.65,.65])box(.22,1.3,.3,x);box(1.52,.2,.3,0,1.3);box(1.7,.1,.38,0,1.45);break;
 case 'ny-water-tank':for(const x of [-.32,.32])for(const z of [-.32,.32])box(.06,.6,.06,x,.3,z,dark);cyl(.48,.48,.85,1.025);cyl(0,.53,.35,1.625);break;
 case 'ny-hvac':box(1,.6,.75);box(.8,.02,.5,0,.615,0,dark);for(const x of [-.3,0,.3])box(.03,.3,.02,x,.35,.385,dark);break;
 case 'ny-fire-escape':box(1.5,.07,.7);box(1.5,.04,.04,0,.55,.33);for(const x of [-.7,0,.7])box(.035,.5,.035,x,.3,.33);for(const x of [-.5,-.2])box(.03,1,.035,x,-.43,.27);for(let i=0;i<5;i++)box(.33,.025,.04,-.35,-.1-i*.18,.27);break;
 case 'ny-awning':{const m=box(2,.08,.7,0,.14,.3);m.rotation.x=.18;box(2,.15,.035,0,.08,.65);break;}
 case 'ny-crosswalk':for(let i=0;i<6;i++)box(.16,.008,1.8,-.8+i*.32,.004);break;
 case 'ny-lamp':cyl(.025,.045,1.8,.9);box(.65,.045,.05,.25,1.8);box(.24,.06,.14,.5,1.77,0,glass);break;
 case 'ny-taxi':box(.75,.25,1.5,0,.23);box(.64,.22,.7,0,.465,-.08,glass);box(.2,.06,.22,0,.605,-.08);for(const x of [-.37,.37])for(const z of [-.48,.48]){const m=mesh(new THREE.CylinderGeometry(.14,.14,.08,6),x,.16,z,dark);m.rotation.z=Math.PI/2;}break;
 }
 for(const mat of [dark,glass])if(!used.has(mat))mat.dispose();
}
