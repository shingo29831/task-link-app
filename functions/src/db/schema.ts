import { pgTable, varchar, timestamp, jsonb, boolean, primaryKey, integer } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: varchar('id', { length: 255 }).primaryKey(),
  username: varchar('username', { length: 255 }).unique(),
  stripeCustomerId: varchar('stripe_customer_id', { length: 255 }),
  plan: varchar('plan', { length: 50 }).default('free').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const projects = pgTable('projects', {
  id: varchar('id', { length: 50 }).primaryKey(), // ★ uuid から varchar に変更
  ownerId: varchar('owner_id', { length: 255 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  projectName: varchar('project_name', { length: 255 }).notNull(),
  data: jsonb('data').notNull(),
  isPublic: boolean('is_public').default(false).notNull(),
  publicRole: varchar('public_role', { length: 50 }).default('viewer').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const projectMembers = pgTable('project_members', {
  projectId: varchar('project_id', { length: 50 }).notNull().references(() => projects.id, { onDelete: 'cascade' }), // ★ varchar に変更
  userId: varchar('user_id', { length: 255 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: varchar('role', { length: 50 }).notNull(),
  invitedAt: timestamp('invited_at').defaultNow().notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.projectId, table.userId] })
}));

// ★ 追加: 0からインクリメントする値を管理するためのテーブル
export const sequences = pgTable('sequences', {
  name: varchar('name', { length: 50 }).primaryKey(),
  value: integer('value').notNull().default(0),
});