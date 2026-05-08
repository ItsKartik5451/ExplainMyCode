import { z } from "zod";
import { createHash } from "crypto";
import { createRouter, publicQuery, authedQuery } from "./middleware";
import { explainCode } from "./lib/llm";
import { extractArray, type ExplanationResult, type AnimationStep } from "./lib/code-parser";
import { getDb } from "./queries/connection";
import { explanations } from "@db/schema";
import { eq, desc } from "drizzle-orm";

// ── In-memory cache (works without any database) ──────────────────────────────
// Survives for the lifetime of the server process; keyed by SHA-256 of the code.
const memCache = new Map<string, ExplanationResult>();

export const explanationRouter = createRouter({
  explain: publicQuery
    .input(
      z.object({
        code: z.string().min(1).max(5000),
        language: z.string().default("python"),
      })
    )
    .mutation(async ({ input }) => {
      const codeHash = createHash("sha256").update(input.code).digest("hex");

      // 1. Check in-memory cache first (instant, no DB needed)
      const memHit = memCache.get(codeHash);
      if (memHit) {
        return { success: true, data: memHit };
      }

      // 2. Try persistent DB cache (skip gracefully if DB is not configured)
      try {
        const db = getDb();
        const [existing] = await db
          .select()
          .from(explanations)
          .where(eq(explanations.codeHash, codeHash))
          .limit(1);

        if (existing && existing.steps) {
          const cached: ExplanationResult = {
            title: existing.title || "Code Analysis",
            algorithmType: existing.algorithmType || "general_code",
            complexity: existing.complexity || "Unknown",
            steps: existing.steps as unknown as AnimationStep[],
            initialArray: Array.isArray((existing.steps[0] as any)?.arrayState)
              ? (existing.steps[0] as any).arrayState
              : extractArray(input.code),
            narration: existing.narration || "",
            detectedPattern: true,
          };
          // Warm the memory cache so next request is instant
          memCache.set(codeHash, cached);
          return { success: true, data: cached };
        }
      } catch {
        // DB not configured — skip cache lookup
      }

      // 3. Compute the explanation
      const result = await explainCode(input.code, input.language);

      // Store in memory cache for instant access next time this session
      memCache.set(codeHash, result);

      // Persist to DB cache for future server restarts (best-effort)
      try {
        const db = getDb();
        await db.insert(explanations).values({
          code: input.code,
          codeHash,
          language: input.language,
          title: result.title,
          algorithmType: result.algorithmType,
          steps: result.steps as any,
          complexity: result.complexity,
          narration: result.narration,
        });
      } catch {
        // DB not configured — skip caching silently
      }

      return {
        success: true,
        data: result,
      };
    }),

  save: authedQuery
    .input(
      z.object({
        code: z.string().min(1),
        language: z.string().default("python"),
        title: z.string().optional(),
        algorithmType: z.string().optional(),
        steps: z
          .array(
            z.object({
              step: z.number(),
              description: z.string(),
              visual: z.string(),
              highlights: z.array(z.number()).optional(),
              swap: z.tuple([z.number(), z.number()]).optional(),
              compare: z.tuple([z.number(), z.number()]).optional(),
              arrayState: z.array(z.number()).optional(),
              complexity: z.string().optional(),
            })
          )
          .optional(),
        complexity: z.string().optional(),
        narration: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const codeHash = createHash("sha256").update(input.code).digest("hex");

      const [result] = await db.insert(explanations).values({
        userId: ctx.user.id,
        code: input.code,
        codeHash,
        language: input.language,
        title: input.title,
        algorithmType: input.algorithmType,
        steps: input.steps,
        complexity: input.complexity,
        narration: input.narration,
      });

      return {
        success: true,
        id: Number(result.insertId),
      };
    }),

  list: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const result = await db
      .select()
      .from(explanations)
      .where(eq(explanations.userId, ctx.user.id))
      .orderBy(desc(explanations.createdAt));

    return result;
  }),

  get: publicQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const result = await db
        .select()
        .from(explanations)
        .where(eq(explanations.id, input.id))
        .limit(1);

      return result[0] ?? null;
    }),
});
