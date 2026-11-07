import { existsSync } from 'node:fs';

const WINDOWS = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
];

const UNIX = [
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
];

export function findChrome(explicit?: string): string {
  if (explicit) {
    if (!existsSync(explicit)) throw new Error(`Chrome not found at ${explicit}`);
    return explicit;
  }
  if (process.env.CHROME_PATH && existsSync(process.env.CHROME_PATH)) {
    return process.env.CHROME_PATH;
  }
  for (const candidate of [...WINDOWS, ...UNIX]) {
    if (existsSync(candidate)) return candidate;
  }
  throw new Error(
    'Could not find Chrome/Edge. Pass --chrome <path> or set CHROME_PATH.',
  );
}
