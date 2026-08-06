import {
  pgTable,
  numeric,
  bigserial,
  timestamp,
  text,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const depositsTable = pgTable("deposits", {
  depositId: bigserial("deposit_id", { mode: "number" }).primaryKey(),
  depositUserId: text("deposit_user_id").notNull(),
  depositAmount: numeric("deposit_amount", {
    precision: 12,
    scale: 2,
  }).notNull(),
  depositCreatedAt: timestamp("deposit_created_at").defaultNow().notNull(),
});

export const insertDepositSchema = createInsertSchema(depositsTable)
  .omit({
    depositId: true,
    depositUserId: true,
    depositCreatedAt: true,
  })
  .extend({
    depositAmount: z.string().regex(/^\d+(\.\d{1,2})?$/),
  });
export type InsertDeposit = z.infer<typeof insertDepositSchema>;
export type Deposit = typeof depositsTable.$inferSelect;
