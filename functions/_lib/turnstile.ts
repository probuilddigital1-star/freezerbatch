const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

interface TurnstileSiteverifyResponse {
  success?: unknown;
  'error-codes'?: unknown;
}
export type TurnstileResult =
  | { ok: true }
  | { ok: false; reason: 'invalid' | 'timeout' | 'unavailable' };

export interface VerifyTurnstileOptions {
  secret: string;
  token: string;
  remoteIp?: string;
  fetchFn?: typeof fetch;
  timeoutMs?: number;
}

export async function verifyTurnstile({
  secret,
  token,
  remoteIp,
  fetchFn = fetch,
  timeoutMs = 4_000,
}: VerifyTurnstileOptions): Promise<TurnstileResult> {
  if (!secret || !token) return { ok: false, reason: 'invalid' };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const body = new URLSearchParams({ secret, response: token });
  if (remoteIp) body.set('remoteip', remoteIp);

  try {
    const response = await fetchFn(SITEVERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      signal: controller.signal,
    });
    if (!response.ok) return { ok: false, reason: 'unavailable' };

    const result = (await response.json()) as TurnstileSiteverifyResponse;
    return result.success === true
      ? { ok: true }
      : { ok: false, reason: 'invalid' };
  } catch (error) {
    if (controller.signal.aborted || (error instanceof Error && error.name === 'AbortError')) {
      return { ok: false, reason: 'timeout' };
    }
    return { ok: false, reason: 'unavailable' };
  } finally {
    clearTimeout(timeout);
  }
}
