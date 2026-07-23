import { describe, expect, it, vi } from 'vitest';
import { verifyTurnstile } from './turnstile';

describe('verifyTurnstile', () => {
  it('returns success for a successful Siteverify response', async () => {
    const fetchFn = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      expect(init?.method).toBe('POST');
      expect(init?.headers).toEqual({
        'Content-Type': 'application/x-www-form-urlencoded',
      });
      const body = init?.body as URLSearchParams;
      expect(body.get('secret')).toBe('binding-value');
      expect(body.get('response')).toBe('browser-token');
      expect(body.get('remoteip')).toBe('192.0.2.1');
      return Response.json({ success: true });
    }) as typeof fetch;

    await expect(
      verifyTurnstile({
        secret: 'binding-value',
        token: 'browser-token',
        remoteIp: '192.0.2.1',
        fetchFn,
      }),
    ).resolves.toEqual({ ok: true });
  });

  it('returns invalid for a failed challenge without exposing error details', async () => {
    const fetchFn = vi.fn(async () =>
      Response.json({ success: false, 'error-codes': ['invalid-input-response'] }),
    ) as typeof fetch;
    await expect(
      verifyTurnstile({ secret: 'binding-value', token: 'bad-token', fetchFn }),
    ).resolves.toEqual({ ok: false, reason: 'invalid' });
  });

  it('returns unavailable for a non-success Siteverify response', async () => {
    const fetchFn = vi.fn(async () => new Response(null, { status: 503 })) as typeof fetch;
    await expect(
      verifyTurnstile({ secret: 'binding-value', token: 'token', fetchFn }),
    ).resolves.toEqual({ ok: false, reason: 'unavailable' });
  });

  it('aborts and returns timeout when Siteverify takes too long', async () => {
    const fetchFn = vi.fn(
      async (_input: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener(
            'abort',
            () => reject(new DOMException('Timed out', 'AbortError')),
            { once: true },
          );
        }),
    ) as typeof fetch;

    await expect(
      verifyTurnstile({
        secret: 'binding-value',
        token: 'token',
        fetchFn,
        timeoutMs: 5,
      }),
    ).resolves.toEqual({ ok: false, reason: 'timeout' });
  });
});
