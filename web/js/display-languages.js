/** Add a display locale here once its interface translations are available. */
export const displayLanguages = [
  {id:'en', label:'English'},
  {id:'ko', label:'Korean · 한국어'},
];
export function displayLanguageOptions(selected) {
  return displayLanguages.map(({id,label}) => `<option value="${id}"${id===selected?' selected':''}>${label}</option>`).join('');
}
