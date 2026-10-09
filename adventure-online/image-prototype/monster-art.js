// Stable, name-driven illustrated families. The server remains authoritative
// for the actual enemy identity, HP, level, target and rewards.
export function monsterIllustration(name){
 const n=String(name||'');
 if(/버섯|독균|곰팡|포자/.test(n))return 'mushroom';
 if(/멧돼지|야수|마수|산돼지/.test(n))return 'boar';
 if(/늑대|암영 짐승|그림자 짐승|추적자/.test(n))return 'wolf';
 if(/고목|수호수|나무 정령|숲수호|초원수호/.test(n))return 'treant';
 return null; // golem, dragon and squirrel preserve matching hand-painted source atlas
}
