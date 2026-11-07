import test from 'node:test';
import assert from 'node:assert/strict';
import { renderReport } from '../dist/report.js';

const data = {
  target: 'https://example.com',
  finalUrl: 'https://example.com/',
  startedAt: '2026-01-01T00:00:00.000Z',
  durationMs: 1200,
  pages: [{ url: 'https://example.com/', title: 'Example' }],
  endpoints: [
    {
      method: 'GET',
      url: 'https://example.com/api/v1/users',
      host: 'example.com',
      path: '/api/v1/users',
      status: 200,
      mime: 'application/json',
      size: 42,
      source: 'network',
    },
  ],
  graphql: [
    {
      endpoint: 'https://example.com/graphql',
      types: 9,
      queries: ['viewer'],
      mutations: ['login'],
    },
  ],
  scripts: ['https://example.com/app.js'],
  stats: { requests: 1, endpoints: 1, hosts: 1, jsFiles: 1, graphql: 1 },
};

test('renders the scan data into the report', () => {
  const html = renderReport(data);
  assert.ok(html.includes('https://example.com/api/v1/users'));
  assert.ok(html.includes('viewer'));
  assert.ok(html.includes('Example'));
});

test('does not let a payload close the script tag', () => {
  const html = renderReport({ ...data, target: '</script><script>alert(1)</script>' });
  assert.ok(!html.includes('</script><script>alert(1)'));
});
