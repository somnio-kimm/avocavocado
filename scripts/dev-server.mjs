import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve, sep, extname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8'};
export async function startServer(port = 0) {
  const server = createServer(async (request, response) => {
    try {
      const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
      const packages = pathname.startsWith('/language-packages/');
      const base = resolve(root, packages ? 'language-packages' : 'web');
      const relative = packages ? pathname.slice('/language-packages/'.length) : pathname.slice(1) || 'index.html';
      const path = resolve(base, relative);
      if (!path.startsWith(base + sep)) {response.writeHead(403);response.end();return;}
      const data = await readFile(path);
      response.writeHead(200, {'Content-Type':types[extname(path)] || 'application/octet-stream','Content-Length':data.length,'Cache-Control':'no-cache'});response.end(data);
    } catch {response.writeHead(404);response.end('Not found');}
  });
  await new Promise((resolve, reject) => {server.once('error', reject);server.listen(port, '127.0.0.1', resolve);});
  return server;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const server = await startServer(Number(process.env.PORT || 4188));
  console.log(`Learn Language: http://127.0.0.1:${server.address().port}`);
}
