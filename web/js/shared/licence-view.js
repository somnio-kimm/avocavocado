export function openLicenceSheet({labels,licenses=[]}){
 const overlay=document.createElement('div');overlay.className='detail-overlay';
 overlay.innerHTML='<section class="detail-sheet lic-sheet" role="dialog" aria-modal="true"><div class="lic-head"><span></span><button type="button" class="lic-x">×</button></div><div class="lic-scroll"></div><button type="button" class="primary btn-primary lic-done"></button></section>';
 overlay.querySelector('.lic-head span').textContent=labels.licence;
 for(const licence of new Map(licenses.map(item=>[item.identifier+'\n'+item.notice,item])).values()){const block=document.createElement('pre');block.className='lic-body';block.textContent=licence.notice;overlay.querySelector('.lic-scroll').append(block);for(const link of licence.links||[]){const row=document.createElement('p'),anchor=document.createElement('a');anchor.textContent=link.title;anchor.href=link.url;anchor.target='_blank';anchor.rel='noopener noreferrer';row.append(anchor);overlay.querySelector('.lic-scroll').append(row);}}
 if(!licenses.length){const p=document.createElement('p');p.textContent=labels.licenceEmpty;overlay.querySelector('.lic-scroll').append(p);}
 const previousFocus=document.activeElement;const close=()=>{overlay.remove();previousFocus?.focus();};
 overlay.querySelector('.lic-x').onclick=close;overlay.querySelector('.lic-done').textContent=labels.done;overlay.querySelector('.lic-done').onclick=close;
 overlay.onclick=event=>{if(event.target===overlay)close();};
 overlay.onkeydown=event=>{if(event.key==='Escape'){event.preventDefault();close();}if(event.key==='Tab'){const buttons=[...overlay.querySelectorAll('button,a[href]')],first=buttons[0],last=buttons.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}}};
 document.body.append(overlay);overlay.querySelector('.lic-x').focus();return close;
}
