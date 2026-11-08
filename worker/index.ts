/** Cloudflare Worker entry point that delegates requests to vinext. */
import handler from "vinext/server/fetch-handler";

interface Env {
  ASSETS: Fetcher;
}

const worker = {
  fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    return handler.fetch(request, env, ctx);
  },
};

export default worker;
