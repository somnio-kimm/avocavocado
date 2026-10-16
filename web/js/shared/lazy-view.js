// Archived shared-runtime module; provenance is recorded in docs/archived-ui-source.json.
/** Load a screen only when opened; cancelled loads cannot replace a newer screen. */
export function lazyView(load, name, labels) {
  return (host, ...args) => {
    let active = true, dispose = () => {};
    const show = async () => {
      host.dataset.viewState = 'loading';
      const message = document.createElement('p');
      message.className = 'loading-state';
      message.setAttribute('role', 'status');
      message.textContent = labels().loading;
      host.replaceChildren(message);
      try {
        const module = await load();
        if (!active) return;
        host.replaceChildren();
        const cleanup = module[name](host, ...args) || (() => {});
        if (!active) { cleanup(); return; }
        dispose = cleanup;
        host.dataset.viewState = 'ready';
      } catch {
        if (!active) return;
        const text = document.createElement('p'), retry = document.createElement('button');
        text.textContent = labels().error;
        retry.textContent = labels().retry;
        retry.className = 'btn-primary primary';
        retry.onclick = () => location.reload();
        host.replaceChildren(text, retry);
        host.dataset.viewState = 'error';
      }
    };
    show();
    return () => { active = false; dispose(); };
  };
}
