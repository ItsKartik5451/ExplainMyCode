import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { generateManimScript } from "./lib/manim-generator";
import { getDb } from "./queries/connection";
import { manimScripts } from "@db/schema";
import { eq } from "drizzle-orm";

export const manimRouter = createRouter({
  generate: publicQuery
    .input(
      z.object({
        title: z.string(),
        steps: z.array(
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
        ),
        initialArray: z.array(z.number()),
        explanationId: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const script = generateManimScript(
        input.title,
        input.steps,
        input.initialArray
      );

      // If explanationId is provided, save the script
      if (input.explanationId) {
        const db = getDb();
        await db.insert(manimScripts).values({
          explanationId: input.explanationId,
          script,
        });
      }

      return {
        success: true,
        script,
      };
    }),

  getByExplanation: publicQuery
    .input(z.object({ explanationId: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const result = await db
        .select()
        .from(manimScripts)
        .where(eq(manimScripts.explanationId, input.explanationId))
        .orderBy(manimScripts.createdAt)
        .limit(1);

      return result[0] ?? null;
    }),
});
