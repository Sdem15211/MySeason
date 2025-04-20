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
  inputData: jsonb("input_data").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const statusEnum = pgEnum("status", [
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
  status: statusEnum("status").default("pending_payment").notNull(),
  paymentIntentId: text("payment_intent_id").unique(),
  imageBlobUrl: text("image_blob_url"),
  faceLandmarks: jsonb("face_landmarks"),
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
