// Cloudflare Pages Function: proxies JobTread Pave API queries from the
// browser. The grantKey lives only as a Cloudflare environment variable and
// never leaves the server.
//
// Browser sends: { customField: {...} } or { account: {...} }  (no $ wrapper)
// Proxy wraps:   { query: { "$": { grantKey: <secret> }, ...body } }
// Forwards POST to https://api.jobtread.com/pave and returns the response.

const PAVE_URL = "https://api.jobtread.com/pave";

export async function onRequestPost({ request, env }) {
  if (!env.JOBTREAD_GRANT_KEY) {
    return json({ error: "Server missing JOBTREAD_GRANT_KEY env var" }, 500);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Request body must be valid JSON" }, 400);
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return json({ error: "Request body must be a JSON object" }, 400);
  }

  const paveBody = {
    query: {
      $: { grantKey: env.JOBTREAD_GRANT_KEY },
      ...body
    }
  };

  let upstream;
  try {
    upstream = await fetch(PAVE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(paveBody)
    });
  } catch (e) {
    return json({ error: "Could not reach JobTread", detail: String(e) }, 502);
  }

  const text = await upstream.text();
  return new Response(text, {
    status: upstream.status,
    headers: { "Content-Type": "application/json" }
  });
}

// Reject anything that isn't POST so a curious GET to /api/jt gets a clean error.
export async function onRequest() {
  return json({ error: "Use POST" }, 405);
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}
