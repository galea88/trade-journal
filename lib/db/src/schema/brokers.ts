import {
  pgTable,
  text,
  bigserial,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const brokersTable = pgTable("brokers", {
  brokerId: bigserial("broker_id", { mode: "number" }).primaryKey(),
  brokerName: text("broker_name").notNull(),
  brokerCsvTemplate: text("broker_csv_template").default("NULL"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  uniqueIndex("brokers_broker_name_key").on(t.brokerName),
]);

export const insertBrokerSchema = createInsertSchema(brokersTable).omit({
  brokerId: true,
  createdAt: true,
});
export type InsertBroker = z.infer<typeof insertBrokerSchema>;
export type Broker = typeof brokersTable.$inferSelect;
