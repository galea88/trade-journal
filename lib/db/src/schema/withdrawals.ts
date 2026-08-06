import {
  pgTable,
  numeric,
  bigserial,
  timestamp,
  text,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const withdrawalsTable = pgTable("withdrawals", {
  withdrawalId: bigserial("withdrawal_id", { mode: "number" }).primaryKey(),
  withdrawalUserId: text("withdrawal_user_id").notNull(),
  withdrawalAmount: numeric("withdrawal_amount", {
    precision: 12,
    scale: 2,
  }).notNull(),
  withdrawalCreatedAt: timestamp("withdrawal_created_at")
    .defaultNow()
    .notNull(),
});

export const insertWithdrawalSchema = createInsertSchema(withdrawalsTable)
  .omit({
    withdrawalId: true,
    withdrawalUserId: true,
    withdrawalCreatedAt: true,
  })
  .extend({
    withdrawalAmount: z.string().regex(/^\d+(\.\d{1,2})?$/),
  });
export type InsertWithdrawal = z.infer<typeof insertWithdrawalSchema>;
export type Withdrawal = typeof withdrawalsTable.$inferSelect;
