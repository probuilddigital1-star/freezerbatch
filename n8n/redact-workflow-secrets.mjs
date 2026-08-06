// Shared redaction for anything derived from a live n8n export.
//
// The live "Authorize and Normalize Request" node hardcodes the webhook secret as a string
// literal, because this n8n Cloud plan has no Variables/env feature licensed. Any artifact
// built from a live export therefore carries a production credential, and the repo rule is
// absolute: no secrets in the repo, env bindings by name only.
//
// Every script that writes an export-derived file into the repo must run redactNode() over
// the nodes and assertNoSecrets() over the result. Both throw rather than write on doubt.

// Literal-secret shapes worth catching. Deliberately broad: a false positive costs one
// manual look, a false negative costs a rotation.
const SECRET_PATTERNS = [
  // Any *secret*/*token*-ish identifier assigned a quoted literal. \w* on both sides so
  // camelCase like previousSecret or newSecretValue cannot slip past the word boundary —
  // "previousSecret" has no \b before "Secret", which let the rotation shape leak.
  /\b(\w*[sS]ecret\w*|apiKey|api_key|\w*[tT]oken\w*|password|passphrase)\s*=\s*(['"`])([^'"`]{12,})\2/gi,
  // Resend keys
  /\bre_[A-Za-z0-9_-]{12,}\b/g,
  // Bearer literals
  /\bBearer\s+[A-Za-z0-9._-]{16,}/gi,
];

const ENV_REFERENCE = "$env.N8N_WEBHOOK_SECRET";

export function redactJsCode(code) {
  if (typeof code !== 'string') return code;
  let out = code;

  // The specific known case: restore the env-binding form the repo requires, and say so.
  out = out.replace(
    /const expectedSecret\s*=\s*(['"])([^'"]+)\1\s*;([^\n]*)/,
    `const expectedSecret = ${ENV_REFERENCE}; // NOTE: the live node hardcodes this literal` +
      ` (no Variables feature on this plan). Never commit the literal — see n8n/SECURITY.md.`,
  );

  // Rotation-transition shape: previousSecret holds the outgoing literal while both are
  // accepted. Rewrite it to a named reference the same way as expectedSecret.
  out = out.replace(
    /const previousSecret\s*=\s*(['"])([^'"]+)\1\s*;([^\n]*)/,
    `const previousSecret = $env.N8N_WEBHOOK_SECRET_PREVIOUS;` +
      ` // NOTE: the live node hardcodes this literal during rotation. Never commit it.`,
  );

  // Anything else that still looks like a literal secret becomes an obvious placeholder.
  for (const rx of SECRET_PATTERNS) {
    out = out.replace(rx, (match) => (/\$env\./.test(match) ? match : '<<REDACTED-SECRET>>'));
  }
  return out;
}

export function redactNode(node) {
  if (node?.parameters?.jsCode) {
    node.parameters.jsCode = redactJsCode(node.parameters.jsCode);
  }
  return node;
}

// Last line of defence. Runs over the serialised artifact immediately before writing.
export function assertNoSecrets(serialised, label = 'artifact') {
  const findings = [];
  for (const rx of SECRET_PATTERNS) {
    for (const m of serialised.matchAll(rx)) {
      if (/\$env\./.test(m[0]) || /REDACTED/.test(m[0])) continue;
      findings.push(m[0].slice(0, 24) + '…');
    }
  }
  if (findings.length) {
    throw new Error(
      `refusing to write ${label}: it still contains ${findings.length} literal secret(s). ` +
        `First: ${findings[0]}`,
    );
  }
}
