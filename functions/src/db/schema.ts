// functions/src/db/schema.ts
import { pgTable, varchar, timestamp, jsonb, uuid, boolean, primaryKey } from 'drizzle-orm/pg-core';

// ==========================================
// 1. ユーザー管理 (Clerk + Stripe)
// ==========================================
export const users = pgTable('users', {
  id: varchar('id', { length: 255 }).primaryKey(), // Clerkの内部ID
  username: varchar('username', { length: 255 }).unique(), // ★招待用の一意な表示ID (例: shingo_u)
  stripeCustomerId: varchar('stripe_customer_id', { length: 255 }),
  plan: varchar('plan', { length: 50 }).default('free').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ==========================================
// 2. プロジェクト本体 (Meld-task)
// ==========================================
export const projects = pgTable('projects', {
  id: uuid('id').defaultRandom().primaryKey(), 
  
  // 所有者（オーナー）のID。ユーザー削除時にプロジェクトも消すための紐付け
  ownerId: varchar('owner_id', { length: 255 })
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
    
  projectName: varchar('project_name', { length: 255 }).notNull(),
  data: jsonb('data').notNull(),
  
  // ★リンクからの公開・非公開設定 (true: リンクを知っていれば誰でもアクセス可)
  isPublic: boolean('is_public').default(false).notNull(),
  
  // ★公開されている場合、そのアクセス権限 ('viewer' | 'editor')
  publicRole: varchar('public_role', { length: 50 }).default('viewer').notNull(),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ==========================================
// 3. プロジェクトのメンバーと権限 (中間テーブル)
// ==========================================
export const projectMembers = pgTable('project_members', {
  projectId: uuid('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  userId: varchar('user_id', { length: 255 })
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
    
  // ★付与された権限 ('owner' | 'editor' | 'viewer')
  role: varchar('role', { length: 50 }).notNull(),
  
  invitedAt: timestamp('invited_at').defaultNow().notNull(),
}, (table) => ({
  // 同じプロジェクトに同じユーザーを重複して登録できないように複合主キーを設定
  pk: primaryKey({ columns: [table.projectId, table.userId] })
}));