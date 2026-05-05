/**
 * NOVISS Contact Form — Cloudflare Worker
 *
 * Paste this into your Worker's code editor in the Cloudflare dashboard.
 *
 * Required Worker secrets (set via dashboard → Worker → Settings → Variables → Secrets):
 *   TURNSTILE_SECRET_KEY  — Cloudflare Turnstile secret key
 *   RESEND_API_KEY        — Resend API key
 *   TO_EMAIL              — email address that receives enquiries
 *   ALLOWED_ORIGIN        — your site's origin, e.g. https://mantcib3.github.io
 *
 * NOTE on Resend "from" address:
 *   Until you verify a custom domain in Resend, use "onboarding@resend.dev" —
 *   but that only delivers to the email that registered your Resend account.
 *   Verify noviss-osint.com (or similar) in Resend to use a branded address.
 */

const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const RESEND_SEND_URL      = 'https://api.resend.com/emails';

export default {
    async fetch(request, env) {
        const allowedOrigin = env.ALLOWED_ORIGIN || '*';

        const corsHeaders = {
            'Access-Control-Allow-Origin':  allowedOrigin,
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        };

        // CORS preflight
        if (request.method === 'OPTIONS') {
            return new Response(null, { status: 204, headers: corsHeaders });
        }

        if (request.method !== 'POST') {
            return respond({ ok: false, error: 'Method not allowed.' }, 405, corsHeaders);
        }

        // ── 0. Rate limiting (requires KV namespace bound as RATE_LIMITER) ─────────
        // In the Cloudflare dashboard: Workers & Pages → your Worker → Settings →
        // Variables → KV Namespace Bindings → add binding name "RATE_LIMITER".
        if (env.RATE_LIMITER) {
            const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';
            const key = `rl:${ip}`;
            const windowSec = 3600; // 1-hour sliding window
            const limit = 3;        // max submissions per window
            const raw = await env.RATE_LIMITER.get(key);
            const count = raw ? parseInt(raw, 10) : 0;
            if (count >= limit) {
                return respond(
                    { ok: false, error: 'Too many requests. Please try again later.' },
                    429,
                    corsHeaders
                );
            }
            await env.RATE_LIMITER.put(key, String(count + 1), { expirationTtl: windowSec });
        }

        // Parse form data
        let formData;
        try {
            formData = await request.formData();
        } catch {
            return respond({ ok: false, error: 'Invalid request.' }, 400, corsHeaders);
        }

        // ── 1. Verify Turnstile token ────────────────────────────────────────────
        const turnstileToken = formData.get('cf-turnstile-response');
        if (!turnstileToken) {
            return respond({ ok: false, error: 'Bot verification required.' }, 400, corsHeaders);
        }

        const tsRes  = await fetch(TURNSTILE_VERIFY_URL, {
            method:  'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body:    new URLSearchParams({
                secret:   env.TURNSTILE_SECRET_KEY,
                response: turnstileToken,
                remoteip: request.headers.get('CF-Connecting-IP') ?? '',
            }),
        });
        const tsData = await tsRes.json();

        if (!tsData.success) {
            return respond({ ok: false, error: 'Bot verification failed. Please refresh and try again.' }, 403, corsHeaders);
        }

        // ── 2. Sanitise and validate fields ─────────────────────────────────────
        const name    = sanitise(formData.get('name'),    100);
        const email   = sanitise(formData.get('email'),   254);
        const purpose = sanitise(formData.get('purpose'), 200);
        const info    = sanitise(formData.get('info'),    3000);

        if (!name || !email || !purpose || !info) {
            return respond({ ok: false, error: 'Required fields are missing.' }, 400, corsHeaders);
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return respond({ ok: false, error: 'Invalid email address.' }, 400, corsHeaders);
        }

        // ── 3. Gather optional identifier rows ──────────────────────────────────
        const aliases   = formData.getAll('identifierAlias[]').map(v => sanitise(v, 100)).filter(Boolean);
        const platforms = formData.getAll('identifierPlatform[]').map(v => sanitise(v, 100)).filter(Boolean);
        const identifierLines = aliases
            .map((a, i) => `  • ${a}${platforms[i] ? ' — ' + platforms[i] : ''}`)
            .join('\n');

        // ── 5. Process optional image attachment ─────────────────────────────────
        const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
        const MAX_BYTES     = 5 * 1024 * 1024; // 5 MB
        let attachment = null;
        const imageFile = formData.get('image');
        if (imageFile && imageFile.size > 0) {
            if (!ALLOWED_TYPES.includes(imageFile.type)) {
                return respond({ ok: false, error: 'Only PNG, JPG, and WEBP images are accepted.' }, 400, corsHeaders);
            }
            if (imageFile.size > MAX_BYTES) {
                return respond({ ok: false, error: 'Image must be under 5 MB.' }, 400, corsHeaders);
            }
            const buf    = await imageFile.arrayBuffer();
            const b64    = btoa(String.fromCharCode(...new Uint8Array(buf)));
            const ext    = imageFile.type.split('/')[1].replace('jpeg', 'jpg');
            const safeFilename = sanitise(imageFile.name, 100).replace(/[^a-zA-Z0-9._-]/g, '_') || `image.${ext}`;
            attachment = { filename: safeFilename, content: b64 };
        }

        // ── 5. Build email body ──────────────────────────────────────────────────
        const emailBody = [
            `Name:    ${name}`,
            `Email:   ${email}`,
            `Purpose: ${purpose}`,
            '',
            'Investigation Details:',
            info,
            identifierLines ? `\nKnown Identifiers:\n${identifierLines}` : '',
        ].join('\n').trim();

        // ── 6. Send via Resend ───────────────────────────────────────────────────
        // TODO: replace "onboarding@resend.dev" with your verified domain address
        const resendPayload = {
            from:     'NOVISS Contact Form <onboarding@resend.dev>',
            to:       [env.TO_EMAIL],
            reply_to: email,
            subject:  `New Enquiry — ${name}`,
            text:     emailBody,
        };
        if (attachment) resendPayload.attachments = [attachment];

        const resendRes = await fetch(RESEND_SEND_URL, {
            method:  'POST',
            headers: {
                'Content-Type':  'application/json',
                'Authorization': `Bearer ${env.RESEND_API_KEY}`,
            },
            body: JSON.stringify(resendPayload),
        });

        if (!resendRes.ok) {
            return respond(
                { ok: false, error: 'Could not deliver your message. Please try again later.' },
                502,
                corsHeaders
            );
        }

        return respond({ ok: true }, 200, corsHeaders);
    },
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function sanitise(value, maxLen) {
    if (!value) return '';
    // Strip non-printable control characters (keep tab and newline)
    return String(value).replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '').trim().slice(0, maxLen);
}

function respond(data, status, headers) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { ...headers, 'Content-Type': 'application/json' },
    });
}
