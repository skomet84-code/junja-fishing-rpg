/* Fixed-scale game shell for iOS Safari and Kakao WKWebView.
   Single-finger map tapping/dragging, skill buttons and internal modal
   scrolling remain untouched. Only multi-touch page zoom is blocked. */
(()=>{
 const game=document.getElementById('game');
 if(!game)return;
 const belongsToGame=node=>node instanceof Element&&!!node.closest('#game');
 const blockPinch=event=>{
  if(event.cancelable&&belongsToGame(event.target))event.preventDefault();
 };
 for(const name of ['gesturestart','gesturechange','gestureend'])
  document.addEventListener(name,blockPinch,{passive:false,capture:true});
 document.addEventListener('touchmove',event=>{
  if(event.touches?.length>1&&event.cancelable&&belongsToGame(event.target))event.preventDefault();
 },{passive:false,capture:true});
 game.addEventListener('dblclick',event=>{
  if(event.cancelable&&!event.target.closest('input,textarea,select,.modal,.load-card'))
   event.preventDefault();
 },{passive:false});
})();
