import { authRouter } from "./auth-router";
import { explanationRouter } from "./explanation-router";
import { manimRouter } from "./manim-router";
import { createRouter, publicQuery } from "./middleware";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  auth: authRouter,
  explanation: explanationRouter,
  manim: manimRouter,
});

export type AppRouter = typeof appRouter;
