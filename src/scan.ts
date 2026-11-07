import puppeteer, { type Page } from 'puppeteer-core';
import { findChrome } from './chrome.js';
import { introspect } from './graphql.js';
import type { Endpoint, ScanOptions, ScanResult } from './types.js';

const ASSET = /\.(?:js|mjs|css|map|png|jpe?g|gif|svg|ico|webp|woff2?|ttf|eot|mp4|webm|pdf)$/i;

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

async function autoScroll(page: Page): Promise<void> {
  await page
    .evaluate(async () => {
      await new Promise<void>((resolve) => {
        let travelled = 0;
        const step = setInterval(() => {
          window.scrollBy(0, 700);
          travelled += 700;
          if (travelled > document.body.scrollHeight + 1400) {
            clearInterval(step);
            resolve();
          }
        }, 120);
        setTimeout(() => {
          clearInterval(step);
          resolve();
        }, 4000);
      });
    })
    .catch(() => undefined);
}

export async function scan(options: ScanOptions): Promise<ScanResult> {
  const started = Date.now();
  const startedAt = new Date(started).toISOString();

  const browser = await puppeteer.launch({
    executablePath: findChrome(options.chromePath),
    headless: options.headless,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1366, height: 900 });

    const endpoints = new Map<string, Endpoint>();
    let requests = 0;

    page.on('response', (response) => {
      try {
        const request = response.request();
        const type = request.resourceType();
        if (type !== 'xhr' && type !== 'fetch') return;

        const url = response.url();
        if (!/^https?:/i.test(url)) return;
        requests += 1;

        const parsed = new URL(url);
        const headers = response.headers();
        if (ASSET.test(parsed.pathname) && !/json/i.test(headers['content-type'] ?? '')) {
          return;
        }
        requests += 1;

        const decoded = (() => {
          try {
            return decodeURIComponent(parsed.pathname);
          } catch {
            return parsed.pathname;
          }
        })();
        const key = `${request.method()} ${parsed.host}${decoded}`;
        if (endpoints.has(key)) return;

        const postData = request.postData();
        endpoints.set(key, {
          method: request.method(),
          url,
          host: parsed.host,
          path: `${decoded}${parsed.search}`,
          status: response.status(),
          mime: headers['content-type']?.split(';')[0],
          size: headers['content-length']
            ? Number(headers['content-length'])
            : undefined,
          source: 'network',
          postData: postData ? truncate(postData, 2000) : undefined,
          contentType: headers['content-type'],
        });
      } catch {
        // a response can vanish while the page is navigating; ignore it
      }
    });

    await page.goto(options.url, {
      waitUntil: 'domcontentloaded',
      timeout: options.timeoutMs,
    });

    await page
      .waitForNetworkIdle({
        idleTime: 800,
        timeout: Math.min(options.timeoutMs, 20000),
      })
      .catch(() => undefined);

    await autoScroll(page);
    await new Promise((resolve) => setTimeout(resolve, 1200));

    // ---- endpoints hidden in JavaScript bundles -------------------------
    const scriptUrls = await page
      .$$eval('script[src]', (nodes) =>
        nodes.map((node) => (node as HTMLScriptElement).src),
      )
      .catch(() => [] as string[]);

    const scripts = [...new Set(scriptUrls)].filter((url) =>
      /^https?:/i.test(url),
    );

    const sources = await page
      .evaluate(async (urls: string[]) => {
        const out: { url: string; text: string }[] = [];
        for (const url of urls) {
          try {
            const res = await fetch(url, { credentials: 'include' });
            if (!res.ok) continue;
            const text = await res.text();
            if (text.length < 2_000_000) out.push({ url, text });
          } catch {
            // cross-origin bundles without CORS are skipped
          }
        }
        return out;
      }, scripts.slice(0, 40))
      .catch(() => [] as { url: string; text: string }[]);

    const base = page.url();
    const addFromJs = (raw: string) => {
      if (!raw || raw.length > 200 || /[\s<>]/.test(raw)) return;
      const cleaned = raw.replace(/\$\{[^}]*\}/g, '{param}');
      let url: URL;
      try {
        url = new URL(cleaned, base);
      } catch {
        return;
      }
      if (!/^https?:$/.test(url.protocol)) return;
      if (ASSET.test(url.pathname)) return;
      let decodedPath = url.pathname;
      try {
        decodedPath = decodeURIComponent(url.pathname);
      } catch {
        // keep the encoded path
      }
      const looksLikeApi =
        /^\/(?:api|rest|graphql|internal|v\d+)\b/i.test(decodedPath) ||
        /\/(?:api|graphql|rest)\//i.test(decodedPath);
      if (!looksLikeApi) return;
      if (url.host !== new URL(base).host) return;

      const key = `GET ${url.host}${decodedPath}`;
      if (endpoints.has(key)) return;
      const alreadySeen = [...endpoints.values()].some(
        (endpoint) =>
          endpoint.host === url.host &&
          endpoint.path.split('?')[0] === decodedPath,
      );
      if (alreadySeen) return;
      endpoints.set(key, {
        method: 'GET',
        url: url.toString(),
        host: url.host,
        path: `${decodedPath}${url.search}`,
        source: 'js',
      });
    };

    for (const source of sources) {
      for (const match of source.text.matchAll(
        /["'`](\/(?:api|rest|graphql|internal|v\d+)[^"'`\s<>]{1,120})["'`]/g,
      )) {
        addFromJs(match[1]);
      }
      for (const match of source.text.matchAll(
        /["'`](https?:\/\/[^"'`\s<>]{6,200})["'`]/g,
      )) {
        addFromJs(match[1]);
      }
    }

    // ---- GraphQL ---------------------------------------------------------
    const graphql: ScanResult['graphql'] = [];
    if (options.graphql) {
      const candidates = [...endpoints.values()].filter(
        (endpoint) =>
          endpoint.source === 'network' &&
          (/graphql/i.test(endpoint.path) ||
            /"query"\s*:/.test(endpoint.postData ?? '')),
      );
      const seen = new Set<string>();
      for (const candidate of candidates) {
        if (seen.has(candidate.url)) continue;
        seen.add(candidate.url);
        const schema = await introspect(page, candidate.url);
        if (schema) graphql.push(schema);
      }
    }

    const pages = [
      {
        url: page.url(),
        title: await page.title().catch(() => ''),
      },
    ];

    const list = [...endpoints.values()].sort((a, b) =>
      a.path.localeCompare(b.path),
    );

    return {
      target: options.url,
      finalUrl: page.url(),
      startedAt,
      durationMs: Date.now() - started,
      pages,
      endpoints: list,
      graphql,
      scripts,
      stats: {
        requests,
        endpoints: list.length,
        hosts: new Set(list.map((endpoint) => endpoint.host)).size,
        jsFiles: scripts.length,
        graphql: graphql.length,
      },
    };
  } finally {
    await browser.close().catch(() => undefined);
  }
}
