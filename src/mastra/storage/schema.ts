import { pgTable, uuid, bigint, varchar, text, integer, timestamp, numeric, boolean, jsonb, serial, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// User sessions table
export const userSessions = pgTable("user_sessions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  telegramUserId: bigint("telegram_user_id", { mode: "number" }).notNull(),
  telegramChatId: bigint("telegram_chat_id", { mode: "number" }).notNull(),
  username: varchar("username", { length: 50 }),
  firstName: varchar("first_name", { length: 100 }),
  
  // Session info
  topic: text("topic").notNull(),
  status: varchar("status", { length: 20 }).default("active"),
  currentStep: varchar("current_step", { length: 50 }).default("topic_input"),
  
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`NOW()`),
  updatedAt: timestamp("updated_at", { withTimezone: true }).default(sql`NOW()`)
});

// Found videos table
export const foundVideos = pgTable("found_videos", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: uuid("session_id").references(() => userSessions.id, { onDelete: "cascade" }),
  
  // Basic info
  videoId: varchar("video_id", { length: 100 }).notNull(),
  platform: varchar("platform", { length: 20 }).notNull(),
  title: text("title"),
  description: text("description"),
  url: text("url").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  
  // Metrics
  views: bigint("views", { mode: "number" }).default(0),
  likes: bigint("likes", { mode: "number" }).default(0),
  comments: bigint("comments", { mode: "number" }).default(0),
  duration: integer("duration"),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  
  // Content
  transcript: text("transcript"),
  transcriptRu: text("transcript_ru"),
  keywords: text("keywords").array(),
  
  // Analytics
  engagementScore: numeric("engagement_score", { precision: 5, scale: 2 }),
  isViral: boolean("is_viral").default(false),
  
  // Status
  status: varchar("status", { length: 20 }).default("found"),
  
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`NOW()`)
}, (table) => ({
  uniqueVideoPerSession: uniqueIndex("unique_video_per_session").on(table.sessionId, table.videoId, table.platform),
}));

// Generated content table
export const generatedContent = pgTable("generated_content", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: uuid("session_id").references(() => userSessions.id, { onDelete: "cascade" }),
  
  // Script
  scriptText: text("script_text"),
  scriptStatus: varchar("script_status", { length: 20 }).default("draft"),
  scriptVersion: integer("script_version").default(1),
  improvementNotes: text("improvement_notes"),
  
  // Video (HeyGen)
  heygenVideoId: varchar("heygen_video_id", { length: 100 }),
  videoUrl: text("video_url"),
  videoStatus: varchar("video_status", { length: 20 }).default("not_started"),
  
  // Video settings
  avatarId: varchar("avatar_id", { length: 100 }),
  voiceId: varchar("voice_id", { length: 100 }),
  backgroundId: varchar("background_id", { length: 100 }),
  
  // Publishing
  publicationStatus: varchar("publication_status", { length: 20 }),
  publishedLinks: jsonb("published_links"),
  
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`NOW()`),
  updatedAt: timestamp("updated_at", { withTimezone: true }).default(sql`NOW()`)
});

// Activity logs table
export const activityLogs = pgTable("activity_logs", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: uuid("session_id").references(() => userSessions.id, { onDelete: "cascade" }),
  telegramUserId: bigint("telegram_user_id", { mode: "number" }),
  
  action: varchar("action", { length: 50 }).notNull(),
  message: text("message"),
  data: jsonb("data"),
  status: varchar("status", { length: 20 }),
  
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`NOW()`)
});

// Export types for TypeScript
export type UserSession = typeof userSessions.$inferSelect;
export type NewUserSession = typeof userSessions.$inferInsert;

export type FoundVideo = typeof foundVideos.$inferSelect;
export type NewFoundVideo = typeof foundVideos.$inferInsert;

export type GeneratedContent = typeof generatedContent.$inferSelect;
export type NewGeneratedContent = typeof generatedContent.$inferInsert;

export type ActivityLog = typeof activityLogs.$inferSelect;
export type NewActivityLog = typeof activityLogs.$inferInsert;