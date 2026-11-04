// Read-only PE data survey. No executable code is loaded or run.
const fs=require('node:fs'),crypto=require('node:crypto');
const file=process.argv[2];if(!file)throw Error('Usage: node inspect-editor-data.cjs path/to/reference-executable.exe');
const b=fs.readFileSync(file),pe=b.readUInt32LE(60),opt=pe+24,base=b.readUInt32LE(opt+28),sections=[];
for(let i=0;i<b.readUInt16LE(pe+6);i++){const at=opt+b.readUInt16LE(pe+20)+i*40;const s={name:b.toString('ascii',at,at+8).replace(/\0/g,''),rva:b.readUInt32LE(at+12),size:b.readUInt32LE(at+16),offset:b.readUInt32LE(at+20)};const counts=new Array(256).fill(0);for(const v of b.subarray(s.offset,s.offset+s.size))counts[v]++;s.entropyBits=counts.reduce((h,c)=>c?h-c/s.size*Math.log2(c/s.size):h,0);sections.push(s);}
const hex=v=>'0x'+v.toString(16);
function fileOffset(va){const rva=va-base,s=sections.find(s=>rva>=s.rva&&rva<s.rva+s.size);return s?s.offset+rva-s.rva:null;}
function virtualAddress(offset){const s=sections.find(s=>offset>=s.offset&&offset<s.offset+s.size);return s?base+s.rva+offset-s.offset:null;}
function stringAt(va){const off=fileOffset(va);if(off===null)return null;const end=b.indexOf(0,off),text=b.toString('ascii',off,Math.min(end,off+150));return /^[\x20-\x7e]+$/.test(text)?text:null;}
const strings=[];
for(const m of b.toString('latin1').matchAll(/[\x20-\x7e]{5,160}/g)){
 if(!/editor_sym|deformChannel|symmetricIndex|parentIndex|submeshIndex|orientation %|BakeInfoMap|NormalMap.tga|Diffuse.tga|Baked Texture|Created by .* Editor|BuildingEditor|partsPaintEnv|SnapDistanceZoomFactor/.test(m[0]))continue;
 strings.push({offset:hex(m.index),va:hex(virtualAddress(m.index)),text:m[0]});
}
const hash=crypto.createHash('sha256').update(b).digest('hex');
const report={file,sha256:hash,entryRva:hex(b.readUInt32LE(opt+16)),sections,strings};
// These table boundaries were manually inspected and apply only to this exact build.
if(hash==='e75cbb34396050b15fb1302600968075455eeb0bb1bd6386f8bd7fabebe892c6'){
 report.paintVariablePointerTable=Array.from({length:32},(_,i)=>{const off=0xff2758+i*4,va=b.readUInt32LE(off);return {index:i,entryVA:hex(virtualAddress(off)),stringVA:hex(va),name:stringAt(va)};});
 report.paintBlendPairs=Array.from({length:6},(_,i)=>{const off=0xff27e4+i*8;return {entryVA:hex(virtualAddress(off)),value:b.readUInt32LE(off),name:stringAt(b.readUInt32LE(off+4))};});
}
console.log(JSON.stringify(report,null,2));
