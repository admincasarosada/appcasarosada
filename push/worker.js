// Servidor de notificaciones push de Casa Rosada POS (Cloudflare Worker, sin dependencias).
// La app (ya con sesión iniciada en Firebase) le pide enviar avisos a los celulares suscritos;
// el servidor verifica la sesión, cifra cada aviso (Web Push, RFC 8291) y lo firma con VAPID (RFC 8292).
const enc = new TextEncoder();
const b64u = {
  enc: buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""),
  dec: s => { s = s.replace(/-/g, "+").replace(/_/g, "/"); while (s.length % 4) s += "="; const b = atob(s); return Uint8Array.from(b, c => c.charCodeAt(0)); },
};
const cat = (...a) => { const n = a.reduce((t, x) => t + x.length, 0), o = new Uint8Array(n); let i = 0; for (const x of a) { o.set(x, i); i += x.length; } return o; };
async function hmac(key, data) { const k = await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]); return new Uint8Array(await crypto.subtle.sign("HMAC", k, data)); }

// ---- Cifrado del mensaje (aes128gcm) ----
export async function cifrar(payload, p256dh, auth) {
  const uaPub = b64u.dec(p256dh), authSecret = b64u.dec(auth);
  const as = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const asPub = new Uint8Array(await crypto.subtle.exportKey("raw", as.publicKey));
  const uaKey = await crypto.subtle.importKey("raw", uaPub, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const secret = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: uaKey }, as.privateKey, 256));
  const prkKey = await hmac(authSecret, secret);
  const ikm = await hmac(prkKey, cat(enc.encode("WebPush: info\0"), uaPub, asPub, new Uint8Array([1])));
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const prk = await hmac(salt, ikm);
  const cek = (await hmac(prk, cat(enc.encode("Content-Encoding: aes128gcm\0"), new Uint8Array([1])))).slice(0, 16);
  const nonce = (await hmac(prk, cat(enc.encode("Content-Encoding: nonce\0"), new Uint8Array([1])))).slice(0, 12);
  const key = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, key, cat(enc.encode(payload), new Uint8Array([2]))));
  const rs = new Uint8Array([0, 0, 16, 0]); // 4096
  return cat(salt, rs, new Uint8Array([asPub.length]), asPub, ct);
}

// ---- Firma VAPID ----
let vapidKey = null;
export async function vapidJWT(aud, privJwk, sub) {
  if (!vapidKey) vapidKey = await crypto.subtle.importKey("jwk", privJwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const h = b64u.enc(enc.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const p = b64u.enc(enc.encode(JSON.stringify({ aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub })));
  const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, vapidKey, enc.encode(h + "." + p));
  return h + "." + p + "." + b64u.enc(sig);
}

// ---- Verificación de la sesión de Firebase (token de identidad) ----
let jwks = null, jwksHasta = 0;
async function verificarFirebase(token, proyecto) {
  const [h, p, s] = token.split(".");
  const head = JSON.parse(new TextDecoder().decode(b64u.dec(h))), body = JSON.parse(new TextDecoder().decode(b64u.dec(p)));
  const now = Math.floor(Date.now() / 1000);
  if (body.aud !== proyecto || body.iss !== "https://securetoken.google.com/" + proyecto || body.exp < now || !body.sub) throw new Error("token inválido");
  if (!jwks || Date.now() > jwksHasta) { const r = await fetch("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"); jwks = (await r.json()).keys; jwksHasta = Date.now() + 3600e3; }
  const jwk = jwks.find(k => k.kid === head.kid); if (!jwk) throw new Error("llave desconocida");
  const key = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
  const ok = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, b64u.dec(s), enc.encode(h + "." + p));
  if (!ok) throw new Error("firma inválida");
  return body.sub;
}

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET,POST,OPTIONS", "Access-Control-Allow-Headers": "Content-Type,Authorization" };
const json = (o, st = 200) => new Response(JSON.stringify(o), { status: st, headers: { ...CORS, "Content-Type": "application/json" } });

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
    if (url.pathname === "/time") return json({ t: Date.now() }); // hora exacta para que todos los equipos midan igual
    if (url.pathname === "/vapid") return json({ publicKey: env.VAPID_PUBLIC || null });
    // Generación de fotos de platos con IA (FLUX en Workers AI). Solo usuarios con sesión en la app.
    if (url.pathname === "/imagen" && req.method === "POST") {
      try { await verificarFirebase((req.headers.get("Authorization") || "").replace(/^Bearer /, ""), env.FIREBASE_PROJECT); }
      catch (e) { return json({ error: "sin autorización" }, 401); }
      if (!env.AI) return json({ error: "La IA no está activada en el servidor" }, 503);
      const { prompt = "", seed } = await req.json();
      try {
        const r = await env.AI.run("@cf/black-forest-labs/flux-1-schnell", { prompt: String(prompt).slice(0, 1800), steps: 8, ...(seed ? { seed: Number(seed) } : {}) });
        return json({ imagen: r.image });
      } catch (e) { return json({ error: String(e.message || e) }, 500); }
    }
    if (url.pathname !== "/notify" || req.method !== "POST") return json({ ok: true, servicio: "Casa Rosada · notificaciones" });
    try { await verificarFirebase((req.headers.get("Authorization") || "").replace(/^Bearer /, ""), env.FIREBASE_PROJECT); }
    catch (e) { return json({ error: "sin autorización" }, 401); }
    const { msgs = [] } = await req.json();
    const priv = JSON.parse(env.VAPID_PRIVATE_JWK), gone = [];
    let enviados = 0;
    await Promise.all(msgs.slice(0, 50).flatMap(m => (m.subs || []).slice(0, 20).map(async s => {
      try {
        const ep = new URL(s.endpoint); if (ep.protocol !== "https:") return;
        const body = await cifrar(JSON.stringify(m.payload || {}).slice(0, 3000), s.keys.p256dh, s.keys.auth);
        const jwt = await vapidJWT(ep.origin, priv, env.VAPID_SUBJECT || "mailto:admin@casarosada.co");
        const r = await fetch(s.endpoint, { method: "POST", body, headers: { "Content-Encoding": "aes128gcm", "Content-Type": "application/octet-stream", TTL: "43200", Urgency: "high", Authorization: `vapid t=${jwt}, k=${env.VAPID_PUBLIC}` } });
        if (r.status === 404 || r.status === 410) gone.push(s.id); else if (r.ok) enviados++;
      } catch (e) { /* un celular con error no detiene a los demás */ }
    })));
    return json({ enviados, gone });
  },
};
