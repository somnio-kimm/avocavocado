import {escapeHtml as e} from './ui.js';
export function formatBytes(bytes,locale='en-GB'){
 if(!Number.isFinite(bytes))return '';
 const unit=bytes>=1000000?'MB':bytes>=1000?'kB':'B',divisor=unit==='MB'?1000000:unit==='kB'?1000:1;
 return `${new Intl.NumberFormat(locale,{maximumFractionDigits:1}).format(bytes/divisor)} ${unit}`;
}
/** A language library, not a list of internal dependency files. */
export function renderPackageLibrary(host,{languages,target,labels:t,languageName,onOpen,onDownload,onRemove,onCancel,busy,progress,message}){
 const language=languages.find(item=>item.target===target);
 const size=bytes=>formatBytes(bytes,t.locale),description=item=>item.downloaded?item.explanations.filter(row=>row.installed).map(row=>languageName(row.language)).join(' · '):t.notDownloaded;
 const operation=busy?`<section class="set-card package-progress" aria-live="polite"><p id="library-progress-label">${e(progress?.text||t.loading)}</p><progress id="library-progress" max="1" value="${progress?.fraction||0}"></progress><button type="button" id="cancel-package" class="set-textbtn">${t.cancel}</button></section>`:'';
 host.innerHTML=`<div class="language-library">${language?`<h2 class="library-title">${e(languageName(language.target,true))}</h2><section class="set-card explanation-list">${language.explanations.map(row=>`<div class="explanation-row" data-explanation="${e(row.language)}" ${row.installed?`data-package="${e(row.installed.id)}"`:`data-available="${e(row.descriptor?.id||'')}"`}><div><strong>${e(languageName(row.language))} ${t.explanationSuffix}</strong><p class="package-size">${row.legacy?t.legacyPackage:row.installed?t.installed:t.notDownloaded}${!row.installed||row.update?` · ${e(size(row.downloadBytes))}`:''}</p></div><div class="package-actions">${row.installed?`<button type="button" class="remove-package" data-remove="${e(row.language)}" ${busy?'disabled':''}>${t.remove}</button>`:''}${!row.installed||row.update?`<button type="button" class="download-package" data-download="${e(row.language)}" ${busy?'disabled':''}>${row.update?t.update:t.download}</button>`:''}</div></div>`).join('')}</section>${operation}${language.stored?`<button type="button" class="set-danger set-action-button remove-language" id="remove-language" ${busy?'disabled':''}>${e(t.removeLanguage.replace('{language}',languageName(target)))}</button>`:''}`:`${languages.map(item=>`<button type="button" class="set-card language-card" data-language="${e(item.target)}"><div><strong>${e(languageName(item.target,true))}</strong><p class="package-size">${item.wordCount?`${new Intl.NumberFormat(t.locale).format(item.wordCount)} ${t.wordCountLabel} · `:''}${e(description(item))}${item.stored?` · ${e(size(item.bytes))}`:''}</p></div><span aria-hidden="true">›</span></button>`).join('')}${operation}`}${message?`<p class="library-message" role="status">${e(message)}</p>`:''}</div>`;
 host.querySelectorAll('[data-language]').forEach(button=>button.onclick=()=>onOpen(button.dataset.language));
 host.querySelectorAll('[data-download]').forEach(button=>button.onclick=()=>onDownload(language.explanations.find(row=>row.language===button.dataset.download)));
 host.querySelectorAll('[data-remove]').forEach(button=>button.onclick=()=>onRemove(target,button.dataset.remove));
 const all=host.querySelector('#remove-language');if(all)all.onclick=()=>onRemove(target);
 const cancel=host.querySelector('#cancel-package');if(cancel)cancel.onclick=onCancel;
 host.dataset.viewState='ready';
}
