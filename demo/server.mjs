import { createServer } from 'node:http';

const PORT = Number(process.env.PORT ?? 8787);

const schema = {
  __schema: {
    queryType: {
      name: 'Query',
      fields: [
        { name: 'viewer' },
        { name: 'product' },
        { name: 'products' },
        { name: 'cart' },
      ],
    },
    mutationType: {
      name: 'Mutation',
      fields: [{ name: 'addToCart' }, { name: 'checkout' }],
    },
    types: [
      'Query',
      'Mutation',
      'User',
      'Product',
      'Cart',
      'CartItem',
      'Order',
      'Money',
      'Image',
    ].map((name) => ({ name })),
  },
};

const page = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Northwind Supply вЂ” demo shop</title>
<style>
  body { margin:0; font:15px/1.5 system-ui, sans-serif; background:#0c0d10; color:#e8e8ea; }
  header { display:flex; justify-content:space-between; padding:18px 28px; border-bottom:1px solid #22242a; }
  main { padding:40px 28px; max-width:900px; }
  h1 { font-size:34px; margin:0 0 8px; }
  p { color:#9aa0aa; }
  .grid { display:grid; grid-template-columns:repeat(3,1fr); gap:16px; margin-top:28px; }
  .card { border:1px solid #22242a; border-radius:12px; padding:16px; background:#111318; }
  .price { color:#ff8080; }
</style>
</head>
<body>
<header><strong>Northwind Supply</strong><span>cart В· account</span></header>
<main>
  <h1>Everything for the workshop</h1>
  <p id="status">loading productsвЂ¦</p>
  <div class="grid" id="products"></div>
</main>
<script src="/static/app.js"></script>
</body>
</html>`;

const appJs = `
const state = { products: [], cart: null };

fetch('/api/v1/products?limit=12')
  .then((r) => r.json())
  .then((data) => {
    state.products = data.items;
    document.getElementById('status').textContent = data.items.length + ' products';
    document.getElementById('products').innerHTML = data.items
      .map((p) => '<div class="card"><b>' + p.name + '</b><div class="price">$' + p.price + '</div></div>')
      .join('');
  });

fetch('/api/v1/cart', { headers: { 'x-session': 'demo' } })
  .then((r) => r.json())
  .then((cart) => { state.cart = cart; });

document.addEventListener('click', () => {
  fetch('/api/v2/events', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ event: 'click', path: location.pathname }),
  });
});

fetch('/graphql', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ query: '{ viewer { id name } }' }),
});

setTimeout(() => document.body.click(), 600);

// internal endpoints that never fire on this page
const admin = ['/api/internal/metrics', '/api/v1/admin/audit', '/api/v1/users/{id}/orders'];
window.__admin = admin;
`;

const json = (res, status, body) => {
  const text = JSON.stringify(body);
  res.writeHead(status, { 'content-type': 'application/json', 'content-length': Buffer.byteLength(text) });
  res.end(text);
};

createServer((req, res) => {
  const url = new URL(req.url ?? '/', `http://127.0.0.1:${PORT}`);
  const path = url.pathname;

  if (path === '/') {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end(page);
    return;
  }

  if (path === '/static/app.js') {
    res.writeHead(200, { 'content-type': 'text/javascript; charset=utf-8' });
    res.end(appJs);
    return;
  }

  if (path === '/api/v1/products') {
    json(res, 200, {
      items: [
        { id: 1, name: 'Claw hammer', price: 24 },
        { id: 2, name: 'Torque wrench', price: 89 },
        { id: 3, name: 'Safety goggles', price: 15 },
      ],
    });
    return;
  }

  if (path === '/api/v1/cart') {
    json(res, 200, { id: 'cart_1', items: [{ sku: 'H-1', qty: 2 }], total: 48 });
    return;
  }

  if (path === '/api/v2/events' && req.method === 'POST') {
    const text = '{\"accepted\":true}';
    res.writeHead(202, { 'content-type': 'application/json', 'content-length': Buffer.byteLength(text) });
    res.end(text);
    return;
  }

  if (path === '/graphql' && req.method === 'POST') {
    json(res, 200, { data: schema.__schema ? { __schema: schema.__schema } : null });
    return;
  }

  json(res, 404, { error: 'not found', path });
}).listen(PORT, '127.0.0.1', () => {
  console.log(`demo shop: http://127.0.0.1:${PORT}`);
});


