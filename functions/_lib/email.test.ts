import { describe, expect, it, vi } from 'vitest';
import {
  handleEmailRequest,
  onRequest,
  onRequestPost,
  type EmailFunctionEnv,
  type EmailHandlerDependencies,
} from '../api/email';

const requestId = '123e4567-e89b-42d3-a456-426614174000';
const env: EmailFunctionEnv = {
  TURNSTILE_SECRET_KEY: 'turnstile-binding-value',
  N8N_WEBHOOK_URL: 'https://upstream.invalid/email',
  N8N_WEBHOOK_SECRET: 'webhook-binding-value',
};

function validPayload(overrides: Record<string, unknown> = {}) {
  return {
    action: 'unsubscribe',
    requestId,
    email: 'person@example.com',
    page: '/unsubscribe',
    turnstileToken: 'browser-token',
    website: '',
    ...overrides,
  };
}

function requestFor(
  payload: unknown,
  options: { method?: string; contentType?: string; contentLength?: string } = {},
): Request {
  const body = typeof payload === 'string' ? payload : JSON.stringify(payload);
  const headers = new Headers();
  if (options.contentType !== null) {
    headers.set('Content-Type', options.contentType ?? 'application/json; charset=utf-8');
  }
  if (options.contentLength !== undefined) {
    headers.set('Content-Length', options.contentLength);
  }
  return new Request('https://freezerbatchcocktails.com/api/email', {
    method: options.method ?? 'POST',
    headers,
    body: options.method === 'GET' ? undefined : body,
  });
}

function successfulDependencies(): EmailHandlerDependencies {
  return {
    turnstileFetchFn: vi.fn(async () => Response.json({ success: true })) as typeof fetch,
    fetchFn: vi.fn(async () => new Response(null, { status: 204 })) as typeof fetch,
  };
}

async function responseBody(response: Response) {
  return response.json() as Promise<Record<string, unknown>>;
}

describe('handleEmailRequest request boundary', () => {
  it('exports both the POST handler and the all-method fallback', () => {
    expect(onRequestPost).toBe(onRequest);
  });

  it('returns the C4 method response for non-POST requests', async () => {
    const response = await handleEmailRequest(requestFor('', { method: 'GET' }), env);
    expect(response.status).toBe(405);
    expect(response.headers.get('Allow')).toBe('POST');
    await expect(responseBody(response)).resolves.toEqual({
      ok: false,
      code: 'method_not_allowed',
    });
  });

  it('requires application/json', async () => {
    const response = await handleEmailRequest(
      requestFor(validPayload(), { contentType: 'text/plain' }),
      env,
    );
    expect(response.status).toBe(400);
    await expect(responseBody(response)).resolves.toEqual({
      ok: false,
      code: 'invalid_request',
    });
  });

  it('rejects an oversized Content-Length without reading or parsing the body', async () => {
    const request = {
      method: 'POST',
      headers: new Headers({
        'Content-Type': 'application/json',
        'Content-Length': String(10 * 1_024 + 1),
      }),
      arrayBuffer: vi.fn(async () => {
        throw new Error('body must not be read');
      }),
    } as unknown as Request;

    const response = await handleEmailRequest(request, env);
    expect(response.status).toBe(413);
    expect(request.arrayBuffer).not.toHaveBeenCalled();
  });

  it('rejects an actual body over 10 KB before JSON parsing', async () => {
    const response = await handleEmailRequest(
      requestFor(`{"website":"","padding":"${'x'.repeat(10 * 1_024)}"}`),
      env,
    );
    expect(response.status).toBe(413);
    await expect(responseBody(response)).resolves.toEqual({
      ok: false,
      code: 'payload_too_large',
    });
  });

  it('returns a quiet success for a non-empty honeypot and performs no fetch', async () => {
    const fetchFn = vi.fn();
    const response = await handleEmailRequest(
      requestFor({ website: 'bot-filled-this' }),
      env,
      { fetchFn: fetchFn as typeof fetch, turnstileFetchFn: fetchFn as typeof fetch },
    );
    expect(response.status).toBe(202);
    await expect(responseBody(response)).resolves.toEqual({ ok: true });
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('maps Turnstile failure to verification_failed and does not call n8n', async () => {
    const upstreamFetch = vi.fn();
    const response = await handleEmailRequest(requestFor(validPayload()), env, {
      turnstileFetchFn: vi.fn(async () => Response.json({ success: false })) as typeof fetch,
      fetchFn: upstreamFetch as typeof fetch,
    });
    expect(response.status).toBe(403);
    await expect(responseBody(response)).resolves.toEqual({
      ok: false,
      code: 'verification_failed',
    });
    expect(upstreamFetch).not.toHaveBeenCalled();
  });

  it('maps Turnstile timeout to verification_failed', async () => {
    const response = await handleEmailRequest(requestFor(validPayload()), env, {
      turnstileFetchFn: vi.fn(
        async (_input: RequestInfo | URL, init?: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            init?.signal?.addEventListener(
              'abort',
              () => reject(new DOMException('Timed out', 'AbortError')),
              { once: true },
            );
          }),
      ) as typeof fetch,
      turnstileTimeoutMs: 5,
    });
    expect(response.status).toBe(403);
    await expect(responseBody(response)).resolves.toEqual({
      ok: false,
      code: 'verification_failed',
    });
  });

  it('validates only after verification and maps invalid payloads to invalid_request', async () => {
    const dependencies = successfulDependencies();
    const response = await handleEmailRequest(
      requestFor(validPayload({ requestId: 'not-a-uuid' })),
      env,
      dependencies,
    );
    expect(response.status).toBe(400);
    await expect(responseBody(response)).resolves.toEqual({
      ok: false,
      code: 'invalid_request',
    });
    expect(dependencies.fetchFn).not.toHaveBeenCalled();
  });
});

describe('handleEmailRequest upstream handoff', () => {
  it('forwards only normalized fields with authenticated request headers', async () => {
    const upstreamFetch = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      expect(headers.get('X-FBC-Webhook-Secret')).toBe(env.N8N_WEBHOOK_SECRET);
      expect(headers.get('X-FBC-Request-Id')).toBe(requestId);
      expect(JSON.parse(String(init?.body))).toEqual({
        action: 'unsubscribe',
        requestId,
        email: 'person@example.com',
        page: '/unsubscribe',
      });
      expect(init?.signal).toBeInstanceOf(AbortSignal);
      return new Response(null, { status: 204 });
    });

    const response = await handleEmailRequest(
      requestFor(
        validPayload({
          email: ' Person@Example.COM ',
          unknown: 'strip this',
          turnstileToken: 'do not forward this',
        }),
      ),
      env,
      {
        turnstileFetchFn: vi.fn(async () => Response.json({ success: true })) as typeof fetch,
        fetchFn: upstreamFetch as typeof fetch,
      },
    );
    expect(response.status).toBe(202);
    await expect(responseBody(response)).resolves.toEqual({ ok: true });
    expect(upstreamFetch).toHaveBeenCalledOnce();
  });

  it.each([400, 404, 429, 500])(
    'maps upstream status %i to upstream_unavailable without echoing details',
    async (status) => {
      const response = await handleEmailRequest(requestFor(validPayload()), env, {
        turnstileFetchFn: vi.fn(async () => Response.json({ success: true })) as typeof fetch,
        fetchFn: vi.fn(async () => new Response('sensitive upstream detail', { status })) as typeof fetch,
      });
      expect(response.status).toBe(502);
      await expect(responseBody(response)).resolves.toEqual({
        ok: false,
        code: 'upstream_unavailable',
      });
    },
  );

  it('aborts a slow upstream and returns upstream_unavailable', async () => {
    const response = await handleEmailRequest(requestFor(validPayload()), env, {
      turnstileFetchFn: vi.fn(async () => Response.json({ success: true })) as typeof fetch,
      fetchFn: vi.fn(
        async (_input: RequestInfo | URL, init?: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            init?.signal?.addEventListener(
              'abort',
              () => reject(new DOMException('Timed out', 'AbortError')),
              { once: true },
            );
          }),
      ) as typeof fetch,
      upstreamTimeoutMs: 5,
    });
    expect(response.status).toBe(502);
    await expect(responseBody(response)).resolves.toEqual({
      ok: false,
      code: 'upstream_unavailable',
    });
  });

  it('fails closed when required upstream bindings are absent', async () => {
    const dependencies = successfulDependencies();
    const response = await handleEmailRequest(requestFor(validPayload()), {
      ...env,
      N8N_WEBHOOK_SECRET: '',
    }, dependencies);
    expect(response.status).toBe(502);
    expect(dependencies.fetchFn).not.toHaveBeenCalled();
  });
});
