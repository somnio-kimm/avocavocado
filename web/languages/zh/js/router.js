let _navigateFn = null;

export function setNavigate(fn) { _navigateFn = fn; }

export function navigate(page, opts = {}) {
  if (_navigateFn) _navigateFn(page, opts);
}
