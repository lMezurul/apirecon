export type EndpointSource = 'network' | 'js' | 'graphql';

export interface Endpoint {
  method: string;
  url: string;
  host: string;
  path: string;
  status?: number;
  mime?: string;
  size?: number;
  source: EndpointSource;
  postData?: string;
  contentType?: string;
}

export interface GraphQLSchema {
  endpoint: string;
  types: number;
  queries: string[];
  mutations: string[];
}

export interface PageInfo {
  url: string;
  title: string;
}

export interface ScanStats {
  requests: number;
  endpoints: number;
  hosts: number;
  jsFiles: number;
  graphql: number;
}

export interface ScanResult {
  target: string;
  finalUrl: string;
  startedAt: string;
  durationMs: number;
  pages: PageInfo[];
  endpoints: Endpoint[];
  graphql: GraphQLSchema[];
  scripts: string[];
  stats: ScanStats;
}

export interface ScanOptions {
  url: string;
  timeoutMs: number;
  headless: boolean;
  chromePath?: string;
  graphql: boolean;
}
