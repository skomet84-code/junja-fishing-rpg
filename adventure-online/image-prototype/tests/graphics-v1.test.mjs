import test from 'node:test';
import assert from 'node:assert/strict';
import {characterCell,characterColumn,monsterCell,newArtRequested} from '../graphics-v1.js';
import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
test('four jobs use distinct positions with 3 stable animated poses',()=>{
 assert.deepEqual(['warrior','rogue','mage','healer'].map(characterColumn),[0,1,2,3]);
 for(const job of ['warrior','rogue','mage','healer']){
  const idle=characterCell(job,'idle',0),stride=characterCell(job,'walk',1),attack=characterCell(job,'attack',1);
  assert.ok(idle&&stride&&attack);assert.equal(idle.row,0);assert.equal(stride.row,1);assert.equal(attack.row,2);
  assert.notEqual(idle.backgroundPosition,stride.backgroundPosition);
 }
 assert.equal(characterCell('invalid'),null);
});
test('illustrated monster names map to nine correct family cells',()=>{
 const cases=[['숲 다람쥐',0],['독버섯',1],['초원 슬라임',2],['늑대',3],['멧돼지',4],['동굴 박쥐',5],['고목 정령',6],['바위 골렘',7]];
 for(const [name,index] of cases){const m=monsterCell(name,'grove');assert.equal(m?.index,index,name);}
 assert.equal(monsterCell('숲의 수호자','grove',true)?.index,8);
 assert.equal(monsterCell('태초의 수호자','origin',true),null,'do not incorrectly re-skin late-game bosses');
 assert.equal(monsterCell('태초 드래곤','origin'),null,'unmatched higher-zone assets remain original');
});
test('legacy rollback switch available without touching player data',()=>{
 assert.equal(newArtRequested('?graphics=legacy'),false);
 assert.equal(newArtRequested('?graphics=v1'),true);
 assert.equal(newArtRequested(''),true);
});
test('binary atlases and game HTML live together in one served assets folder',()=>{
 for(const name of ['characters-v1.webp','monsters-v1.webp']){
  const data=fs.readFileSync(path.join(root,'assets',name));
  assert.equal(data.toString('ascii',0,4),'RIFF',name);
  assert.equal(data.toString('ascii',8,12),'WEBP',name);
  assert.ok(data.byteLength<80_000,'mobile sheets must stay light');
 }
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 assert.match(html,/graphics-v1\.css/);
 assert.match(html,/graphics1/);
});
