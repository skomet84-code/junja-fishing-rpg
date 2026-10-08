// Deliberately independent of the server's per-skill cooldown and cast animation.
export function createCombatQueue(maxSkill=6,capacity=2,lifetime=3) {
 const buffer=[];
 function expire(time){while(buffer.length&&buffer[0].expires<time)buffer.shift();}
 return {
  enqueue(index,time){
   expire(time);
   if(!Number.isInteger(index)||index<0||index>maxSkill||buffer.some(x=>x.index===index)||buffer.length>=capacity)return false;
   buffer.push({index,expires:time+lifetime});return true;
  },
  peek(time){expire(time);return buffer[0]?.index??null;},
  shift(time){expire(time);return buffer.shift()?.index??null;},
  position(index,time){expire(time);return buffer.findIndex(x=>x.index===index)+1;},
  clear(){buffer.length=0;},
  snapshot(time){expire(time);return buffer.map(x=>x.index);}
 };
}
