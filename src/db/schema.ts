import {
  jsonb,
  pgTable,
  timestamp,
  uuid,
  text,
  pgEnum,
} from "drizzle-orm/pg-core";

export const analyses = pgTable("analyses", {
  id: uuid("id").primaryKey().defaultRandom(),
  result: jsonb("result").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const sessionStatusEnum = pgEnum("session_status", [
  "pending_payment",
  "payment_complete",
  "payment_failed",
  "awaiting_selfie",
  "selfie_validation_failed",
  "awaiting_questionnaire",
  "questionnaire_complete",
  "analysis_pending",
  "analysis_failed",
  "analysis_complete",
  "expired",
]);

export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  status: sessionStatusEnum("status").default("pending_payment").notNull(),
  paymentIntentId: text("payment_intent_id").unique(),
  uploadedImagePath: text("uploaded_image_path"),
  questionnaireData: jsonb("questionnaire_data"),
  analysisId: uuid("analysis_id").references(() => analyses.id),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
