import test from 'node:test';
import assert from 'node:assert/strict';
import {registerWorldLayer,nextWorldSequence,remapWorldLayer,registerLayerRequest} from '../src/swbf2/swbf2-layer-registration.js';
const layer=(name,id)=>`Layer("${name}", ${id}, 0)\n{\n\tDescription("keep");\n}\n`;
const index=`Version(1);\nNextID(1);\n${layer('[Base]',0)}${layer('conquest',1)}${layer('trees',5)}GameMode("Common")\n{\n\tLayer(0);\n\tLayer(5);\n}\nGameMode("conquest")\n{\n\tLayer(1);\n}\n`;
test('registration uses an unused ID, preserves authored layers/modes and loads shared scenery once in Common',()=>{
 const output=registerWorldLayer(index);assert.equal(output.id,2);assert.equal(output.reused,false);assert.match(output.text,/NextID\(6\)/);assert.ok(output.text.includes(layer('conquest',1)));assert.ok(output.text.includes(layer('trees',5)));assert.match(output.text,/GameMode\("Common"\)[\s\S]*?Layer\(2\)/);assert.match(output.text,/GameMode\("conquest"\)\n\{\n\tLayer\(1\);\n\}/);
 assert.equal(registerWorldLayer(output.text).text,output.text,'repeat export does not duplicate/reformat declarations');
});
test('existing Wonderblocks ID/name is reused and mode-specific duplicates move into Common',()=>{
 const source=index.replace('GameMode("Common")',layer('WonderBlocks',7)+'GameMode("Common")').replace('Layer(1);','Layer(1);\n\tLayer(7);');const output=registerWorldLayer(source);
 assert.equal(output.id,7);assert.equal(output.name,'WonderBlocks');assert.equal(output.reused,true);assert.equal((output.text.match(/Layer\(7\)/g)||[]).length,1);assert.equal(registerWorldLayer(output.text).text,output.text);
});
test('base-only worlds gain a Common group; comments, descriptions, unknown settings, BOM and newlines survive',()=>{
 const source='\uFEFFVersion(1);\r\nNextID(1);\r\n'+layer('[Base]',0).replaceAll('\n','\r\n')+'// Layer("fake", 1, 0) {}\r\nCustom(9);\r\n';const output=registerWorldLayer(source);
 assert.equal(output.id,1);assert.ok(output.text.startsWith('\uFEFF'));assert.ok(output.text.includes('// Layer("fake", 1, 0) {}\r\nCustom(9);'));assert.match(output.text,/GameMode\("Common"\)\r\n\{\r\n\tLayer\(0\);\r\n\tLayer\(1\);/);assert.equal(registerWorldLayer(output.text).text,output.text);
});
test('malformed/ambiguous indexes and exhausted layer slots fail before registration',()=>{
 for(const source of [index+'{',index+layer('duplicate',1),index+layer('trees',6),index.replace('Layer(5);','Layer(63);'),index.replace(layer('[Base]',0),''),index.replace('NextID(1);','')])assert.throws(()=>registerWorldLayer(source));
 assert.throws(()=>registerWorldLayer('Version(1); NextID(64);\n'+Array.from({length:64},(_,i)=>layer(i?'L'+i:'[Base]',i)).join('')),/64-layer limit/);
});
test('object sequences avoid base and other layers while quoted/commented declarations are ignored',()=>{
 const start=nextWorldSequence(['NextSequence(100); Object("old", "building", 150) { SeqNo(170); }','// SeqNo(900);\nDescription("NextSequence(800); Object(0)");\nNextSequence(120);']);assert.equal(start,171);
 const text='Version(3);\nNextSequence(3);\nObject("first", "block", 1)\n{\n Layer(1);\n SeqNo(1);\n Description("Layer(1); SeqNo(1);");\n}\nObject("second", "block", 2)\n{\n Layer(1);\n SeqNo(2);\n}\n';const output=remapWorldLayer(text,{id:7,sequenceStart:start});assert.match(output,/Object\("first", "block", 171\)/);assert.match(output,/Object\("second", "block", 172\)/);assert.match(output,/NextSequence\(173\)/);assert.equal((output.match(/Layer\(7\)/g)||[]).length,2);assert.ok(output.includes('Description("Layer(1); SeqNo(1);")'));
});
test('native bundle requests add the layer to PC/common world resources without touching other platforms or duplicating it',()=>{
 const source='ucft\n{\n REQN { "texture" "keep" }\n REQN { "world" "platform=ps2" "WON" }\n REQN\n {\n  "world"\n  "WON"\n }\n}\n// keep trailing comment\n',updated=registerLayerRequest(source,'won','WON_wonderblocks');assert.ok(updated.includes('REQN { "world" "platform=ps2" "WON" }'));assert.ok(updated.includes('"WON_wonderblocks"'));assert.equal(registerLayerRequest(updated,'WON','WON_wonderblocks'),updated);assert.equal(registerLayerRequest(source,'other','other_wonderblocks'),null);
});
