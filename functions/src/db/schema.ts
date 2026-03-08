// 役割: データベースのテーブルスキーマ定義
// なぜ: Drizzle ORMを使用してPostgreSQLのテーブル構造をコードベースで型安全に管理し、ユーザー設定の永続化を可能にするため

import { pgTable, varchar, timestamp, jsonb, boolean, primaryKey, integer } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: varchar('id', { length: 255 }).primaryKey(),
  username: varchar('username', { length: 255 }).unique(),
  stripeCustomerId: varchar('stripe_customer_id', { length: 255 }),
  plan: varchar('plan', { length: 50 }).default('free').notNull(),
  language: varchar('language', { length: 20 }).default('ja').notNull(),
  timezone: varchar('timezone', { length: 100 }).default('Asia/Tokyo').notNull(),
  theme: varchar('theme', { length: 20 }).default('system').notNull(),
  weekStartsOn: integer('week_starts_on').default(0).notNull(), // 0: 日曜日, 1: 月曜日
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const projects = pgTable('projects', {
  id: varchar('id', { length: 255 }).primaryKey(), // ★ システム内部用の UUID
  shortId: varchar('short_id', { length: 50 }).unique(), // ★ 追加: URL表示用の短いID
  ownerId: varchar('owner_id', { length: 255 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  projectName: varchar('project_name', { length: 255 }).notNull(),
  data: jsonb('data').notNull(),
  isPublic: boolean('is_public').default(false).notNull(),
  publicRole: varchar('public_role', { length: 50 }).default('viewer').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const projectMembers = pgTable('project_members', {
  projectId: varchar('project_id', { length: 255 }).notNull().references(() => projects.id, { onDelete: 'cascade' }),
  userId: varchar('user_id', { length: 255 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: varchar('role', { length: 50 }).notNull(),
  invitedAt: timestamp('invited_at').defaultNow().notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.projectId, table.userId] })
}));

export const sequences = pgTable('sequences', {
  name: varchar('name', { length: 50 }).primaryKey(),
  value: integer('value').notNull().default(0),
});