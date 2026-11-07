import type { ScanResult } from './types.js';

export function renderReport(data: ScanResult): string {
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  return PAGE.replace('__DATA__', () => json);
}

const PAGE = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>API Recon</title>
<style>
  :root {
    --bg: #08080a;
    --panel: #0d0b0d;
    --panel2: #110d0f;
    --line: #2a1416;
    --line2: #3a1a1e;
    --red: #e5484d;
    --red2: #ff8080;
    --text: #f5f5f5;
    --dim: #8a8a93;
    --dim2: #52525b;
  }
  * { box-sizing: border-box; }
  html, body { margin: 0; background: var(--bg); color: var(--text); }
  body {
    font: 14px/1.5 "Segoe UI", Inter, system-ui, sans-serif;
    background:
      radial-gradient(900px 400px at 10% -10%, rgba(229,72,77,.12), transparent 60%),
      var(--bg);
    min-height: 100vh;
  }
  a { color: var(--red2); }
  header {
    display: flex; align-items: center; justify-content: space-between; gap: 16px;
    padding: 22px 28px; border-bottom: 1px solid var(--line);
  }
  .brand { display: flex; align-items: center; gap: 10px; font-weight: 700; letter-spacing: -.02em; font-size: 17px; }
  .dot { width: 10px; height: 10px; border-radius: 50%; background: var(--red); box-shadow: 0 0 14px var(--red); }
  .meta { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; font: 12px "Cascadia Code", Consolas, monospace; color: var(--dim); }
  .meta strong { color: var(--text); font-weight: 500; }
  main { max-width: 1180px; margin: 0 auto; padding: 26px 24px 60px; }
  .cards { display: grid; grid-template-columns: repeat(6, 1fr); gap: 12px; margin-bottom: 22px; }
  .card {
    background: linear-gradient(180deg, var(--panel2), var(--panel));
    border: 1px solid var(--line); border-radius: 12px; padding: 14px 16px;
  }
  .card .n { font: 600 24px/1.1 "Segoe UI", sans-serif; }
  .card .l { color: var(--dim); font-size: 11px; text-transform: uppercase; letter-spacing: .08em; margin-top: 6px; }
  .panel { background: var(--panel); border: 1px solid var(--line); border-radius: 14px; overflow: hidden; }
  .toolbar { display: flex; flex-wrap: wrap; gap: 10px; padding: 14px; border-bottom: 1px solid var(--line); align-items: center; }
  input[type="search"] {
    flex: 1 1 240px; min-width: 200px; background: #0a0809; border: 1px solid var(--line2);
    color: var(--text); border-radius: 9px; padding: 9px 12px; outline: none; font: 13px "Cascadia Code", Consolas, monospace;
  }
  input[type="search"]:focus { border-color: var(--red); }
  .chips { display: flex; gap: 6px; flex-wrap: wrap; }
  .chip {
    border: 1px solid var(--line2); background: transparent; color: var(--dim); border-radius: 20px;
    padding: 6px 11px; font: 11px "Cascadia Code", Consolas, monospace; cursor: pointer;
  }
  .chip.on { border-color: var(--red); color: var(--text); background: rgba(229,72,77,.12); }
  table { width: 100%; border-collapse: collapse; }
  th, td { text-align: left; padding: 10px 14px; border-bottom: 1px solid #1a1012; vertical-align: top; }
  th { color: var(--dim2); font: 10px "Cascadia Code", Consolas, monospace; text-transform: uppercase; letter-spacing: .1em; }
  tr.row { cursor: pointer; }
  tr.row:hover td { background: #120b0d; }
  .m { font: 10px "Cascadia Code", Consolas, monospace; padding: 3px 7px; border-radius: 5px; border: 1px solid var(--line2); color: var(--dim); }
  .m.GET { color: #9be9a8; border-color: #1f4a2a; }
  .m.POST { color: #ffc9c9; border-color: #4a1f22; }
  .m.PUT, .m.PATCH { color: #ffd8a8; border-color: #4a3a1f; }
  .m.DELETE { color: #ff8080; border-color: #4a1f22; }
  .path { font: 12.5px "Cascadia Code", Consolas, monospace; word-break: break-all; }
  .host { color: var(--dim2); font: 11px "Cascadia Code", Consolas, monospace; }
  .src { font: 10px "Cascadia Code", Consolas, monospace; color: var(--dim2); }
  .src.network { color: var(--red2); }
  .status-2 { color: #9be9a8; } .status-3 { color: #ffd8a8; } .status-4, .status-5 { color: #ff8080; }
  .detail td { background: #0b090a; border-bottom: 1px solid var(--line2); }
  .detail pre {
    margin: 8px 0; padding: 12px; background: #080607; border: 1px solid var(--line);
    border-radius: 8px; color: var(--dim); overflow: auto; font: 11.5px/1.6 "Cascadia Code", Consolas, monospace;
  }
  .detail .kv { color: var(--dim); font: 12px "Cascadia Code", Consolas, monospace; }
  .detail .kv b { color: var(--text); font-weight: 500; }
  button.copy {
    background: rgba(229,72,77,.14); border: 1px solid var(--red); color: var(--text);
    border-radius: 7px; padding: 5px 10px; font-size: 11px; cursor: pointer; margin-top: 4px;
  }
  h2 { font-size: 15px; margin: 28px 0 12px; color: var(--text); }
  h2 span { color: var(--dim2); font-weight: 400; font-size: 12px; margin-left: 8px; }
  .gql { display: grid; gap: 10px; }
  .gql .box { background: var(--panel); border: 1px solid var(--line); border-radius: 12px; padding: 14px 16px; }
  .gql .ep { font: 12px "Cascadia Code", Consolas, monospace; color: var(--red2); word-break: break-all; }
  .gql .row { display: flex; gap: 18px; flex-wrap: wrap; margin-top: 8px; color: var(--dim); font-size: 12px; }
  .gql .fields { color: var(--dim); font: 11.5px "Cascadia Code", Consolas, monospace; margin-top: 6px; word-break: break-word; }
  .empty { padding: 30px; text-align: center; color: var(--dim); }
  footer { text-align: center; color: var(--dim2); font: 11px "Cascadia Code", Consolas, monospace; padding: 20px; }
  @media (max-width: 860px) { .cards { grid-template-columns: repeat(3, 1fr); } }
  @media (max-width: 520px) { .cards { grid-template-columns: repeat(2, 1fr); } header { flex-direction: column; align-items: flex-start; } }
</style>
</head>
<body>
<header>
  <div class="brand"><span class="dot"></span> API Recon</div>
  <div class="meta">
    <strong id="target"></strong>
    <span id="sub"></span>
  </div>
</header>
<main>
  <section class="cards" id="cards"></section>

  <section class="panel">
    <div class="toolbar">
      <input id="q" type="search" placeholder="filter by path, host, status... ( / )">
      <div class="chips" id="methods"></div>
      <div class="chips" id="sources"></div>
    </div>
    <table>
      <thead>
        <tr><th style="width:70px">method</th><th>path</th><th style="width:70px">status</th><th style="width:90px">type</th><th style="width:80px">size</th><th style="width:80px">source</th></tr>
      </thead>
      <tbody id="rows"></tbody>
    </table>
    <div class="empty" id="empty" hidden>nothing matches the filter</div>
  </section>

  <section id="gql-wrap" hidden>
    <h2>GraphQL <span id="gql-count"></span></h2>
    <div class="gql" id="gql"></div>
  </section>
</main>
<footer>generated by apirecon — offline report, no data leaves this file</footer>

<script>
const DATA = __DATA__;
const state = { q: '', method: 'ALL', source: 'any' };
const byId = (id) => document.getElementById(id);

function esc(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function human(n) {
  if (n == null) return '—';
  if (n < 1024) return n + ' B';
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
  return (n / 1024 / 1024).toFixed(1) + ' MB';
}
function curl(e) {
  let cmd = 'curl -X ' + e.method + " '" + e.url + "'";
  if (e.contentType) cmd += " -H 'content-type: " + e.contentType.split(';')[0] + "'";
  if (e.postData) cmd += " --data '" + e.postData.replace(/'/g, "'\\\\''") + "'";
  return cmd;
}

byId('target').textContent = DATA.finalUrl;
byId('sub').textContent = new Date(DATA.startedAt).toLocaleString() + ' · ' + (DATA.durationMs / 1000).toFixed(1) + 's';

const cards = [
  [DATA.stats.endpoints, 'endpoints'],
  [DATA.stats.requests, 'requests'],
  [DATA.stats.hosts, 'hosts'],
  [DATA.stats.jsFiles, 'js files'],
  [DATA.stats.graphql, 'graphql'],
  [(DATA.durationMs / 1000).toFixed(1) + 's', 'scan time'],
];
byId('cards').innerHTML = cards.map(function (c) {
  return '<div class="card"><div class="n">' + c[0] + '</div><div class="l">' + c[1] + '</div></div>';
}).join('');

const methods = ['ALL'].concat(Array.from(new Set(DATA.endpoints.map(function (e) { return e.method; }))).sort());
byId('methods').innerHTML = methods.map(function (m) {
  return '<button class="chip' + (m === 'ALL' ? ' on' : '') + '" data-m="' + m + '">' + m + '</button>';
}).join('');
byId('methods').addEventListener('click', function (event) {
  const button = event.target.closest('[data-m]');
  if (!button) return;
  state.method = button.dataset.m;
  Array.from(byId('methods').children).forEach(function (el) { el.classList.toggle('on', el === button); });
  render();
});

const sources = ['any', 'network', 'js'];
byId('sources').innerHTML = sources.map(function (s) {
  return '<button class="chip' + (s === 'any' ? ' on' : '') + '" data-s="' + s + '">' + s + '</button>';
}).join('');
byId('sources').addEventListener('click', function (event) {
  const button = event.target.closest('[data-s]');
  if (!button) return;
  state.source = button.dataset.s;
  Array.from(byId('sources').children).forEach(function (el) { el.classList.toggle('on', el === button); });
  render();
});

byId('q').addEventListener('input', function (event) {
  state.q = event.target.value.toLowerCase();
  render();
});
document.addEventListener('keydown', function (event) {
  if (event.key === '/' && document.activeElement !== byId('q')) {
    event.preventDefault();
    byId('q').focus();
  }
});

function visible(e) {
  if (state.method !== 'ALL' && e.method !== state.method) return false;
  if (state.source !== 'any' && e.source !== state.source) return false;
  if (!state.q) return true;
  return (e.method + ' ' + e.host + e.path + ' ' + (e.status || '')).toLowerCase().indexOf(state.q) >= 0;
}

function render() {
  const rows = DATA.endpoints.filter(visible);
  byId('empty').hidden = rows.length > 0;
  byId('rows').innerHTML = rows.map(function (e, i) {
    const status = e.status || '';
    const cls = status ? 'status-' + String(status)[0] : '';
    return '<tr class="row" data-i="' + DATA.endpoints.indexOf(e) + '">' +
      '<td><span class="m ' + esc(e.method) + '">' + esc(e.method) + '</span></td>' +
      '<td><div class="path">' + esc(e.path) + '</div><div class="host">' + esc(e.host) + '</div></td>' +
      '<td class="' + cls + '">' + esc(status || '—') + '</td>' +
      '<td class="src">' + esc(e.mime || '—') + '</td>' +
      '<td class="src">' + human(e.size) + '</td>' +
      '<td class="src ' + (e.source === 'network' ? 'network' : '') + '">' + esc(e.source) + '</td>' +
      '</tr>';
  }).join('');
}

byId('rows').addEventListener('click', function (event) {
  const tr = event.target.closest('tr.row');
  if (!tr) return;
  const next = tr.nextElementSibling;
  if (next && next.classList.contains('detail')) { next.remove(); return; }
  const e = DATA.endpoints[Number(tr.dataset.i)];
  const detail = document.createElement('tr');
  detail.className = 'detail';
  const payload = e.postData ? '<pre>' + esc(e.postData) + '</pre>' : '<div class="kv">no request body</div>';
  detail.innerHTML = '<td colspan="6">' +
    '<div class="kv"><b>' + esc(e.method) + '</b> ' + esc(e.url) + '</div>' +
    '<div class="kv">status <b>' + esc(e.status || '—') + '</b> · type <b>' + esc(e.mime || '—') + '</b> · size <b>' + human(e.size) + '</b></div>' +
    payload +
    '<pre>' + esc(curl(e)) + '</pre>' +
    '<button class="copy">copy cURL</button>' +
    '</td>';
  tr.after(detail);
  detail.querySelector('.copy').addEventListener('click', function () {
    navigator.clipboard.writeText(curl(e)).then(function () {
      detail.querySelector('.copy').textContent = 'copied';
    });
  });
});

if (DATA.graphql.length) {
  byId('gql-wrap').hidden = false;
  byId('gql-count').textContent = DATA.graphql.length + ' endpoint(s)';
  byId('gql').innerHTML = DATA.graphql.map(function (g) {
    const q = g.queries.length ? g.queries.join(', ') : '—';
    const m = g.mutations.length ? g.mutations.join(', ') : '—';
    return '<div class="box"><div class="ep">' + esc(g.endpoint) + '</div>' +
      '<div class="row"><span>' + g.types + ' types</span><span>queries: ' + g.queries.length + '</span><span>mutations: ' + g.mutations.length + '</span></div>' +
      '<div class="fields"><b>query</b> ' + esc(q) + '</div>' +
      '<div class="fields"><b>mutation</b> ' + esc(m) + '</div></div>';
  }).join('');
}

render();
</script>
</body>
</html>`;
