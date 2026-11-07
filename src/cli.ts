#!/usr/bin/env node
import { writeFileSync } from 'node:fs';
import { scan } from './scan.js';
import { renderReport } from './report.js';
import type { ScanOptions } from './types.js';

const VERSION = '0.1.0';

function usage(): void {
  process.stdout.write(`apirecon ${VERSION} — see the API behind the page

Usage:
  apirecon <url> [options]

Options:
  -o, --out <file>      write the HTML report (default: apirecon-<host>.html)
      --json <file>     also write the raw scan as JSON
      --timeout <ms>    navigation timeout (default: 45000)
      --headed          show the browser window
      --chrome <path>   Chrome/Edge executable
      --no-graphql      skip GraphQL introspection
  -h, --help            show this help
  -v, --version         print the version

Examples:
  apirecon https://example.com
  apirecon https://app.example.com --out report.html --json scan.json
  apirecon http://127.0.0.1:8787 --headed

Only scan applications you own or have permission to test.
`);
}

interface CliOptions {
  url: string;
  out?: string;
  json?: string;
  timeout: number;
  headed: boolean;
  chrome?: string;
  graphql: boolean;
}

function parseArgs(argv: string[]): CliOptions | null {
  const options: CliOptions = {
    url: '',
    timeout: 45_000,
    headed: false,
    graphql: true,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    switch (arg) {
      case '-h':
      case '--help':
        usage();
        return null;
      case '-v':
      case '--version':
        process.stdout.write(`${VERSION}\n`);
        return null;
      case '-o':
      case '--out':
        options.out = argv[++i];
        break;
      case '--json':
        options.json = argv[++i];
        break;
      case '--timeout':
        options.timeout = Number(argv[++i]);
        break;
      case '--headed':
        options.headed = true;
        break;
      case '--chrome':
        options.chrome = argv[++i];
        break;
      case '--no-graphql':
        options.graphql = false;
        break;
      default:
        if (arg.startsWith('-')) {
          throw new Error(`unknown option ${arg}`);
        }
        options.url = arg;
    }
  }

  if (!options.url) {
    usage();
    throw new Error('missing URL');
  }
  if (!/^https?:\/\//i.test(options.url)) {
    options.url = `https://${options.url}`;
  }
  return options;
}

async function main(): Promise<void> {
  let options: CliOptions | null;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    process.stderr.write(`${(error as Error).message}\n`);
    process.exitCode = 2;
    return;
  }
  if (!options) return;

  const scanOptions: ScanOptions = {
    url: options.url,
    timeoutMs: options.timeout,
    headless: !options.headed,
    chromePath: options.chrome,
    graphql: options.graphql,
  };

  process.stdout.write(`scanning ${options.url} ...\n`);

  try {
    const result = await scan(scanOptions);
    const host = new URL(result.finalUrl).host.replace(/[^a-z0-9.-]/gi, '_');
    const out = options.out ?? `apirecon-${host}.html`;

    writeFileSync(out, renderReport(result), 'utf8');
    if (options.json) {
      writeFileSync(options.json, JSON.stringify(result, null, 2), 'utf8');
    }

    process.stdout.write(
      [
        '',
        `endpoints : ${result.stats.endpoints}`,
        `requests  : ${result.stats.requests}`,
        `hosts     : ${result.stats.hosts}`,
        `js files  : ${result.stats.jsFiles}`,
        `graphql   : ${result.stats.graphql}`,
        `time      : ${(result.durationMs / 1000).toFixed(1)}s`,
        '',
        `report    : ${out}`,
        options.json ? `json      : ${options.json}` : '',
        '',
      ]
        .filter(Boolean)
        .join('\n'),
    );
  } catch (error) {
    process.stderr.write(`error: ${(error as Error).message}\n`);
    process.exitCode = 1;
  }
}

void main();
