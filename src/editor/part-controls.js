const sides={key:'sides',label:'Sides',min:12,max:48,default:24,options:[12,24,48],unit:''};
const pitch=Math.atan(.28)*180/Math.PI;
export function partControls(type,parameters={}){
 if(type==='rock')return [{key:'roughness',label:'Rock roughness',min:0,max:.4,step:.01,default:.16,unit:''},{key:'taper',label:'Rock taper',min:0,max:.85,step:.05,default:.4,unit:''},{key:'seed',label:'Rock variation',min:1,max:9999,step:1,default:1,unit:''}];
 if(type==='yavin-gallery')return [{key:'bayWidth',label:'Gallery width',min:10,max:28,step:.5,default:16,unit:'m'},{key:'bayDepth',label:'Gallery depth',min:4,max:12,step:.5,default:7,unit:'m'},{key:'terraceHeight',label:'Terrace height',min:3.6,max:8,step:.1,default:4.2,unit:'m'},{key:'passageWidth',label:'Underpass width',min:2.4,max:5,step:.1,default:3.6,unit:'m'},{key:'passageHeight',label:'Underpass height',min:2.4,max:5,step:.1,default:3.2,unit:'m'},{key:'pierHeight',label:'Back pier height',min:0,max:5,step:.25,default:3,unit:'m'}];
 if(type==='block')return [{key:'parapetHeight',label:'Roof rim height',min:0,max:2,step:.05,default:0,unit:'m'},{key:'parapetThickness',label:'Roof rim thickness',min:.05,max:1,step:.05,default:.3,unit:'m'},{key:'baseSlopeHeight',label:'Base slope height',min:0,max:2,step:.05,default:0,unit:'m'},{key:'baseSlopeProjection',label:'Base slope projection',min:0,max:1.5,step:.05,default:.3,unit:'m'}].filter(c=>!c.key.startsWith('baseSlope')||parameters.baseSlopeHeight!==undefined||parameters.baseSlopeProjection!==undefined);
 if(type==='round')return [sides];
 if(type==='ring-body')return [sides,{key:'wallThickness',label:'Wall thickness',min:2,max:45,step:1,default:15,unit:'%'}];
 if(type==='jp-base')return [{key:'batter',label:'Foundation slope',min:0,max:.22,step:.01,default:.22,unit:''}];
 if(type==='jp-half-roof')return [{key:'roofInnerSpan',label:'Inner edge width',min:0,max:1,step:.05,default:1,unit:''}];
 if(['temple-roof-complete','temple-roof-half'].includes(type))return [
  {key:'roofPitch',label:'Roof pitch',min:5,max:55,step:1,default:pitch,unit:'°'},
  {key:'roofThickness',label:'Roof thickness',min:.02,max:.15,step:.01,default:.04,unit:''}
 ];
 if(/^(doric|ionic|corinthian)(-smooth)?$/.test(type)||type==='column-drum')return [
  {key:'shaftFullness',label:'Shaft fullness',min:0,max:.12,step:.005,default:.035,unit:''},
  ...(!type.endsWith('-smooth')?[{key:'fluteDepth',label:'Flute depth',min:0,max:.14,step:.01,default:.07,unit:''}]:[])
 ];
 return [];
}
export function validateParameters(type,parameters){
 if(!parameters||typeof parameters!=='object'||Array.isArray(parameters))throw Error('Invalid part controls.');
 const controls=partControls(type,parameters);
 for(const [key,value] of Object.entries(parameters)){
  const c=controls.find(c=>c.key===key);
  if(!c||!Number.isFinite(value)||value<c.min||value>c.max||c.options&&!c.options.includes(value))throw Error('Invalid part control: '+key);
 }
 if(type==='yavin-gallery'&&(parameters.passageHeight??3.2)>(parameters.terraceHeight??4.2)-.65)throw Error('Leave at least 0.65 m of stone above the underpass. Raise the terrace or lower the passage.');
 return {...parameters};
}
