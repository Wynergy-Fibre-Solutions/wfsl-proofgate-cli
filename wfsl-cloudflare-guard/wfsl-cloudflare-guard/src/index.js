// Continuity proof: non-functional change (WFSL)

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method !== "GET") {
      return new Response(
        JSON.stringify({ ok: false, error: "GET only" }, null, 2),
        { status: 400 }
      );
    }

    if (url.pathname !== "/") {
      return new Response(
        JSON.stringify({ ok: false, error: "path must be /" }, null, 2),
        { status: 400 }
      );
    }

    return new Response(
      JSON.stringify(
        {
          ok: true,
          platform: "cloudflare-workers",
          determinism: true,
          wfsl: {
            contract_version: env.WFSL_CONTRACT_VERSION || "1.0",
            guard_order: (env.WFSL_GUARD_ORDER || "").split(",")
          }
        },
        null,
        2
      ),
      {
        headers: {
          "content-type": "application/json",
          "cache-control": "no-store"
        }
      }
    );
  }
};
