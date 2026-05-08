import { relations } from "drizzle-orm";
import { users, explanations, manimScripts } from "./schema";

export const usersRelations = relations(users, ({ many }) => ({
  explanations: many(explanations),
}));

export const explanationsRelations = relations(explanations, ({ one, many }) => ({
  user: one(users, {
    fields: [explanations.userId],
    references: [users.id],
  }),
  manimScripts: many(manimScripts),
}));

export const manimScriptsRelations = relations(manimScripts, ({ one }) => ({
  explanation: one(explanations, {
    fields: [manimScripts.explanationId],
    references: [explanations.id],
  }),
}));