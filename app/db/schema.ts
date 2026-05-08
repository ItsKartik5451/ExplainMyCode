import {
  mysqlTable,
  mysqlEnum,
  serial,
  varchar,
  text,
  timestamp,
  json,
  bigint,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: serial("id").primaryKey(),
  unionId: varchar("unionId", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 320 }),
  avatar: text("avatar"),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
  lastSignInAt: timestamp("lastSignInAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const explanations = mysqlTable("explanations", {
  id: serial("id").primaryKey(),
  userId: bigint("userId", { mode: "number", unsigned: true }).references(
    () => users.id,
    { onDelete: "set null" }
  ),
  code: text("code").notNull(),
  codeHash: varchar("codeHash", { length: 64 }),
  language: varchar("language", { length: 50 }).notNull().default("python"),
  title: varchar("title", { length: 255 }),
  algorithmType: varchar("algorithmType", { length: 100 }),
  steps: json("steps").$type<
    Array<{
      step: number;
      description: string;
      visual: string;
      highlights?: number[];
      swap?: [number, number];
      compare?: [number, number];
      arrayState?: number[];
      complexity?: string;
    }>
  >(),
  complexity: varchar("complexity", { length: 50 }),
  narration: text("narration"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export type Explanation = typeof explanations.$inferSelect;
export type InsertExplanation = typeof explanations.$inferInsert;

export const manimScripts = mysqlTable("manimScripts", {
  id: serial("id").primaryKey(),
  explanationId: bigint("explanationId", { mode: "number", unsigned: true })
    .references(() => explanations.id, { onDelete: "cascade" })
    .notNull(),
  script: text("script").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ManimScript = typeof manimScripts.$inferSelect;
export type InsertManimScript = typeof manimScripts.$inferInsert;