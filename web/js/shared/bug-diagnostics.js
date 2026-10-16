// Archived shared-runtime module; provenance is recorded in docs/archived-ui-source.json.
// Only non-identifying app/device details are included in the user-reviewed form.
export const WEB_BUILD = 'avocavocado-preview';
const text = value => String(value ?? 'Unavailable').replace(/[\r\n]+/g,' ').slice(0,300);

export function browserOS(nav = {}) {
  const ua = nav.userAgent || '';
  let match = ua.match(/(?:iPhone OS|CPU (?:iPhone )?OS) ([\d_]+)/);
  if(match)return `iOS ${match[1].replaceAll('_','.')} (browser-reported)`;
  match=ua.match(/Android ([\d.]+)/);
  if(match)return `Android ${match[1]} (browser-reported)`;
  // iPad desktop mode masks the actual iPadOS version as macOS.
  if(nav.platform==='MacIntel' && nav.maxTouchPoints>1)return 'iPadOS (version unavailable in browser)';
  if(/Windows/.test(ua))return 'Windows (version unavailable in browser)';
  if(/Macintosh|Mac OS X/.test(ua))return 'macOS (version unavailable in browser)';
  if(/Linux/.test(ua))return 'Linux (version unavailable in browser)';
  return 'Unavailable';
}

export async function collectBugDiagnostics({app,webVersion,uiLanguage,theme,studyLevel,studyLanguage},env=globalThis,timeoutMs=1500) {
  const nav=env.navigator || {}, cap=env.Capacitor;
  const native=cap?.isNativePlatform?.()===true;
  let info={},status=native?'Unavailable':'Not applicable (web)',timer;
  if(native && cap?.Plugins?.StudyDiagnostics?.getInfo) {
    try {
      info=await Promise.race([
        cap.Plugins.StudyDiagnostics.getInfo(),
        new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('Timeout')),timeoutMs);})
      ]) || {};
      status='Available';
    } catch { status='Unavailable; browser fallback'; }
    finally {clearTimeout(timer);}
  }
  const view=env.visualViewport,screen=env.screen || {};
  const lines=[
    ['App',app],
    ['App version',native?(info.appVersion || 'Unavailable'):webVersion],
    ['App build',native?(info.appBuild || 'Unavailable'):'Not applicable (web)'],
    ['App ID',native?(info.appId || 'Unavailable'):'Not applicable (web)'],
    ['Web app version',webVersion],
    ['Web content build',WEB_BUILD],
    ['OS',info.os?`${info.os} ${info.osVersion || '(version unavailable)'}`:browserOS(nav)],
    ...(info.androidApi!==undefined?[['Android API level',info.androidApi]]:[]),
    ['Device model',info.model?`${info.manufacturer || ''} ${info.model}`.trim():'Unavailable in browser'],
    ...(typeof info.simulator==='boolean'?[['Simulator',info.simulator?'Yes':'No']]:[]),
    ['Runtime',native?'Capacitor (native)':'Web browser'],
    ['Native diagnostics',status],
    ['Screen','Settings'],
    ['UI language',uiLanguage],
    ['Device language',nav.language],
    ['Theme',theme],
    ['System color scheme',env.matchMedia?.('(prefers-color-scheme: dark)').matches?'Dark':'Light'],
    ['Study language',studyLanguage],
    ['Study level',Array.isArray(studyLevel)?studyLevel.join(', '):studyLevel],
    ['Screen size (CSS px)',`${screen.width ?? '?'} x ${screen.height ?? '?'}`],
    ['Viewport (CSS px)',`${Math.round(view?.width ?? env.innerWidth ?? 0)} x ${Math.round(view?.height ?? env.innerHeight ?? 0)}`],
    ['Pixel ratio',env.devicePixelRatio],
    ['Online',typeof nav.onLine==='boolean'?(nav.onLine?'Yes':'No'):'Unavailable'],
    ['User agent',nav.userAgent],
    ['Report time (UTC)',new Date().toISOString()]
  ];
  return lines.map(([label,value])=>`${label}: ${text(value)}`).join('\n');
}
