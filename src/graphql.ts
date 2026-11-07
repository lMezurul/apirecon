import type { Page } from 'puppeteer-core';
import type { GraphQLSchema } from './types.js';

const INTROSPECTION = `query IntrospectionQuery {
  __schema {
    queryType { name fields { name } }
    mutationType { name fields { name } }
    types { name }
  }
}`;

interface IntrospectionReply {
  ok: boolean;
  text: string;
}

export async function introspect(
  page: Page,
  endpoint: string,
): Promise<GraphQLSchema | null> {
  const reply = await page.evaluate(
    async ({ endpoint, query }): Promise<IntrospectionReply> => {
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          credentials: 'include',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ query }),
        });
        return { ok: res.ok, text: await res.text() };
      } catch (error) {
        return { ok: false, text: String(error) };
      }
    },
    { endpoint, query: INTROSPECTION },
  );

  if (!reply.ok) return null;

  try {
    const json = JSON.parse(reply.text) as {
      data?: {
        __schema?: {
          queryType?: { fields?: { name: string }[] } | null;
          mutationType?: { fields?: { name: string }[] } | null;
          types?: { name: string }[];
        };
      };
    };
    const schema = json.data?.__schema;
    if (!schema) return null;

    const names = (fields?: { name: string }[] | null) =>
      (fields ?? []).map((f) => f.name).slice(0, 40);

    return {
      endpoint,
      types: schema.types?.length ?? 0,
      queries: names(schema.queryType?.fields),
      mutations: names(schema.mutationType?.fields),
    };
  } catch {
    return null;
  }
}
