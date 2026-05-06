// Cloudflare Worker entry point.
// Serves the static dashboard from public/ and proxies POST /api/jt to the
// JobTread Pave API. The grant key lives only as a Worker secret
// (env.JOBTREAD_GRANT_KEY) and never reaches the browser.

const PAVE_URL = "https://api.jobtread.com/pave";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/jt") {
      if (request.method !== "POST") {
        return json({ error: "Use POST" }, 405);
      }
      return handleJT(request, env);
    }

    return env.ASSETS.fetch(request);
  }
};

async function handleJT(request, env) {
  if (!env.JOBTREAD_GRANT_KEY) {
    return json({ error: "Server missing JOBTREAD_GRANT_KEY" }, 500);
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

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}
