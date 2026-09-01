import "server-only";

// Minimal Ghost Admin API client. Uses the `?source=html` create-post
// endpoint so we can hand Ghost plain HTML instead of building out its
// Lexical document format ourselves.
//
// Ghost Admin API auth: the Admin API key is `<id>:<hexSecret>`. Requests
// are authenticated with a short-lived JWT, HS256-signed with the raw
// bytes of the hex secret, `kid` set to the key id, audience
// `/admin/`. See https://ghost.org/docs/admin-api/#token-authentication.

function hexToBytes(hex: string): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(new ArrayBuffer(hex.length / 2));
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

function base64url(input: ArrayBuffer | string): string {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : new Uint8Array(input);
  let str = "";
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function signAdminToken(apiKey: string): Promise<string> {
  const [id, secretHex] = apiKey.split(":");
  if (!id || !secretHex) throw new Error("GHOST_ADMIN_API_KEY must be in `<id>:<secret>` format");

  const header = { alg: "HS256", typ: "JWT", kid: id };
  const now = Math.floor(Date.now() / 1000);
  const payload = { iat: now, exp: now + 5 * 60, aud: "/admin/" };

  const encodedHeader = base64url(JSON.stringify(header));
  const encodedPayload = base64url(JSON.stringify(payload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  const key = await crypto.subtle.importKey("raw", hexToBytes(secretHex), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
  ]);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(signingInput));

  return `${signingInput}.${base64url(signature)}`;
}

function config() {
  const apiUrl = process.env.GHOST_API_URL;
  const apiKey = process.env.GHOST_ADMIN_API_KEY;
  if (!apiUrl || !apiKey) return null;
  return { apiUrl: apiUrl.replace(/\/$/, ""), apiKey };
}

export function ghostConfigured(): boolean {
  return config() !== null;
}

export type GhostPublishResult = { id: string; url: string };

// Drafts store body copy as plain text; Ghost's HTML importer wants real
// markup. This is a minimal plain-text-to-paragraphs conversion, not a
// markdown renderer -- fine for now since drafts are typed as plain text.
export function textToHtml(text: string): string {
  const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return text
    .split(/\n{2,}/)
    .map((para) => `<p>${escape(para.trim()).replace(/\n/g, "<br>")}</p>`)
    .join("\n");
}

// Publishes immediately. Returns null (no-op) if Ghost isn't configured
// yet, so callers can treat Ghost as optional until it's set up.
export async function publishToGhost(params: {
  title: string;
  html: string;
  tags?: string[];
}): Promise<GhostPublishResult | null> {
  const cfg = config();
  if (!cfg) return null;

  const token = await signAdminToken(cfg.apiKey);
  const res = await fetch(`${cfg.apiUrl}/ghost/api/admin/posts/?source=html`, {
    method: "POST",
    headers: {
      Authorization: `Ghost ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      posts: [
        {
          title: params.title,
          html: params.html,
          status: "published",
          tags: params.tags?.map((name) => ({ name })),
        },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Ghost publish failed (${res.status}): ${body}`);
  }

  const data = await res.json();
  const post = data.posts?.[0];
  return { id: post.id, url: post.url };
}
