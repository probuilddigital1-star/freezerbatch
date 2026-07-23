import { normalizeEmailPayload } from '../_lib/emailPayload';
import { verifyTurnstile } from '../_lib/turnstile';

const MAX_BODY_BYTES = 10 * 1_024;
const UPSTREAM_TIMEOUT_MS = 5_000;

export interface EmailFunctionEnv {
  TURNSTILE_SECRET_KEY: string;
  N8N_WEBHOOK_URL: string;
  N8N_WEBHOOK_SECRET: string;
}

export interface EmailFunctionContext {
  request: Request;
  env: EmailFunctionEnv;
}

export interface EmailHandlerDependencies {
  fetchFn?: typeof fetch;
  turnstileFetchFn?: typeof fetch;
  turnstileTimeoutMs?: number;
  upstreamTimeoutMs?: number;
}

function jsonResponse(
  status: number,
  body: { ok: true } | { ok: false; code: string },
  headers?: HeadersInit,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...headers,
    },
  });
}

function errorResponse(
  status: number,
  code:
    | 'invalid_request'
    | 'verification_failed'
    | 'method_not_allowed'
    | 'payload_too_large'
    | 'upstream_unavailable',
  headers?: HeadersInit,
): Response {
  return jsonResponse(status, { ok: false, code }, headers);
}

function hasHoneypotValue(value: unknown): boolean {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const website = (value as Record<string, unknown>).website;
  return website !== undefined && website !== null && website !== '';
}

async function forwardToUpstream(
  payload: ReturnType<typeof normalizeEmailPayload> & { ok: true },
  env: EmailFunctionEnv,
  fetchFn: typeof fetch,
  timeoutMs: number,
): Promise<boolean> {
  if (!env.N8N_WEBHOOK_URL || !env.N8N_WEBHOOK_SECRET) return false;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchFn(env.N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-FBC-Webhook-Secret': env.N8N_WEBHOOK_SECRET,
        'X-FBC-Request-Id': payload.value.requestId,
      },
      body: JSON.stringify(payload.value),
      signal: controller.signal,
    });
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

export async function handleEmailRequest(
  request: Request,
  env: EmailFunctionEnv,
  dependencies: EmailHandlerDependencies = {},
): Promise<Response> {
  if (request.method !== 'POST') {
    return errorResponse(405, 'method_not_allowed', { Allow: 'POST' });
  }

  const contentType = request.headers.get('Content-Type')?.split(';', 1)[0].trim().toLowerCase();
  if (contentType !== 'application/json') return errorResponse(400, 'invalid_request');

  const contentLengthHeader = request.headers.get('Content-Length');
  if (contentLengthHeader !== null) {
    if (!/^\d+$/u.test(contentLengthHeader)) return errorResponse(400, 'invalid_request');
    if (Number(contentLengthHeader) > MAX_BODY_BYTES) {
      return errorResponse(413, 'payload_too_large');
    }
  }

  let bodyBytes: ArrayBuffer;
  try {
    bodyBytes = await request.arrayBuffer();
  } catch {
    return errorResponse(400, 'invalid_request');
  }
  if (bodyBytes.byteLength > MAX_BODY_BYTES) return errorResponse(413, 'payload_too_large');

  let rawPayload: unknown;
  try {
    const bodyText = new TextDecoder('utf-8', { fatal: true }).decode(bodyBytes);
    rawPayload = JSON.parse(bodyText);
  } catch {
    return errorResponse(400, 'invalid_request');
  }

  if (hasHoneypotValue(rawPayload)) return jsonResponse(202, { ok: true });

  const turnstileToken =
    typeof rawPayload === 'object' &&
    rawPayload !== null &&
    !Array.isArray(rawPayload) &&
    typeof (rawPayload as Record<string, unknown>).turnstileToken === 'string'
      ? (rawPayload as Record<string, string>).turnstileToken
      : '';

  const fetchFn = dependencies.fetchFn ?? fetch;
  const verification = await verifyTurnstile({
    secret: env.TURNSTILE_SECRET_KEY,
    token: turnstileToken,
    remoteIp: request.headers.get('CF-Connecting-IP') ?? undefined,
    fetchFn: dependencies.turnstileFetchFn ?? fetchFn,
    timeoutMs: dependencies.turnstileTimeoutMs,
  });
  if (!verification.ok) return errorResponse(403, 'verification_failed');

  const payload = normalizeEmailPayload(rawPayload);
  if (!payload.ok) return errorResponse(400, 'invalid_request');

  const forwarded = await forwardToUpstream(
    payload,
    env,
    fetchFn,
    dependencies.upstreamTimeoutMs ?? UPSTREAM_TIMEOUT_MS,
  );
  return forwarded
    ? jsonResponse(202, { ok: true })
    : errorResponse(502, 'upstream_unavailable');
}

// A generic route handler is required so non-POST requests receive the C4 405
// response instead of falling through to a platform-generated 404.
export const onRequest = (context: EmailFunctionContext): Promise<Response> =>
  handleEmailRequest(context.request, context.env);

// Cloudflare selects this method-specific export for POST while onRequest remains
// the fallback that produces a contract-compliant 405 for every other method.
export const onRequestPost = onRequest;
