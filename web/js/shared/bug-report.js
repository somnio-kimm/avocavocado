import {APP_NAME} from './app-config.js';
export const BUG_REPORT_FORM = 'https://docs.google.com/forms/d/e/1FAIpQLSe_YV5mdjANouZlURD6yebs7bDUr4ZCM2K9QK44z8_dQi_IWA/viewform';

export function prepareBugReport({app,diagnostics=''}) {
  if(![APP_NAME,'Learn Chinese','Learn German'].includes(app))throw new Error('Unknown report app');
  const url = new URL(BUG_REPORT_FORM);
  url.searchParams.set('usp','pp_url');
  url.searchParams.set('hl','en');
  url.searchParams.set('entry.582897232',app);
  const info=String(diagnostics).trim();
  if(info)url.searchParams.set('entry.1656822590',info);
  return {url:url.href};
}
