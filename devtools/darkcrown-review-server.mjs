import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
const source=path.resolve(import.meta.dirname,'..');
const pins=JSON.parse(await fs.readFile(path.join(source,'reports/chaos-demon-court/artifacts.json')));
const root=pins.preview.artifactDir, scope=pins.preview.scopePath;
const mime={'.html':'text/html;charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.webmanifest':'application/manifest+json'};
const artifactIndex=await fs.readFile(path.join(root,'index.html'),'utf8');
const styles=[...artifactIndex.matchAll(/<link rel="stylesheet"[^>]+>/g)].map(x=>x[0]).join('\n');
const html='<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><base href="'+scope+'">'+styles+'<style>body{padding:12px}main{max-width:1100px;margin:auto}#artifact{overflow-wrap:anywhere}.controls{display:flex;gap:8px;flex-wrap:wrap}.pairs{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px}.pair{display:flex}.pair img{width:50%;object-fit:contain}article h2{font-size:18px}</style></head><body><main><h1>黯冠王庭 · 固定產物演出自審</h1><p id="artifact"></p><div class="controls"><button id="entry">首次完整登場</button><button id="switch">切池完整登場／重播</button><select id="pick"></select><button id="single">固定單抽</button><button id="ten">固定十連</button><label><input id="reduced" type="checkbox">減少動態</label></div><p>僅播放固定結果；不呼叫抽卡、錢包或收藏服務。</p><div id="pairs" class="pairs"></div></main><script type="module" src="/darkcrown-review.js"></script></body></html>';
http.createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://local'), raw=decodeURIComponent(url.pathname);
  res.setHeader('Cache-Control','no-store');
  if(raw==='/darkcrown-review/'){res.setHeader('Content-Type',mime['.html']);res.end(html);return;}
  if(raw==='/darkcrown-review.js'){res.setHeader('Content-Type',mime['.js']);res.end(await fs.readFile(path.join(source,'reports/chaos-demon-court/pinned-animation-review.js')));return;}
  if(!raw.startsWith(scope)||req.method!=='GET')throw Error();
  const rel=raw.slice(scope.length)||'index.html';
  if(rel.includes('\\')||rel.split('/').some(p=>p==='..'||p.startsWith('.')))throw Error();
  const file=await fs.realpath(path.resolve(root,rel));if(!file.startsWith(root+path.sep))throw Error();
  res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.end(await fs.readFile(file));
 }catch{res.writeHead(404).end();}
}).listen(0,'127.0.0.1',function(){console.log('http://127.0.0.1:'+this.address().port+'/darkcrown-review/');});

