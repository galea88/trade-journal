import {
  pgTable,
  text,
  serial,
  timestamp,
  boolean,
  integer,
} from "drizzle-orm/pg-core";

export const brokerConnectionsTable = pgTable("broker_connections", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  brokerType: text("broker_type").notNull().default("ibkr"),
  encryptedCredentials: text("encrypted_credentials").notNull(),
  lastSyncAt: timestamp("last_sync_at"),
  lastSyncError: text("last_sync_error"),
  lastSyncCount: integer("last_sync_count"),
  enabled: boolean("enabled").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type BrokerConnection =
  typeof brokerConnectionsTable.$inferSelect;
