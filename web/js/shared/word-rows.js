// Archived shared-runtime module; provenance is recorded in docs/archived-ui-source.json.
/** Keep the whole result set searchable, but add DOM rows in small scroll batches. */
export function mountWordRows(host, words, rowMarkup, {moreLabel,emptyMarkup='',initialCount=80,batchSize=80}={}) {
 let shown=0,alive=true;
 host.innerHTML='<div class="word-row-window"></div><div class="word-list-more"><button type="button" class="btn-small text-button"></button></div>';
 const rows=host.querySelector('.word-row-window'),sentinel=host.querySelector('.word-list-more'),button=sentinel.querySelector('button');
 button.textContent=moreLabel;
 function append(count=batchSize){
  if(!alive)return;
  const end=Math.min(words.length,shown+count);
  rows.insertAdjacentHTML('beforeend',words.slice(shown,end).map(rowMarkup).join(''));
  shown=end;host.dataset.total=words.length;host.dataset.rendered=shown;
  sentinel.hidden=shown>=words.length;
  if(!words.length)rows.innerHTML=emptyMarkup;
  if(sentinel.hidden)observer?.disconnect();
 }
 const observer=typeof IntersectionObserver==='function'?new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting))append();},{rootMargin:'400px'}):null;
 button.onclick=()=>append();append(initialCount);if(!sentinel.hidden)observer?.observe(sentinel);
 return {get count(){return shown;},cleanup(){alive=false;observer?.disconnect();button.onclick=null;}};
}
