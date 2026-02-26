import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { clerkMiddleware, getAuth } from '@hono/clerk-auth'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { users, projects, projectMembers } from './db/schema'
import { eq } from 'drizzle-orm'

// 環境変数の型定義
type Bindings = {
  DATABASE_URL: string
  CLERK_PUBLISHABLE_KEY: string
  CLERK_SECRET_KEY: string
}

const app = new Hono<{ Bindings: Bindings }>()

// すべてのルートでCORSを許可（フロントエンドからのアクセスを許可）
app.use('*', cors())

// Clerkミドルウェアの適用
app.use('*', clerkMiddleware())

// --- データベース接続ヘルパー ---
const getDb = (databaseUrl: string) => {
  const sql = neon(databaseUrl)
  return drizzle(sql)
}

// 1. ユーザー同期 (ログイン直後に叩く)
app.post('/api/user/sync', async (c) => {
  const auth = getAuth(c)
  if (!auth?.userId) return c.json({ error: 'Unauthorized' }, 401)

  const db = getDb(c.env.DATABASE_URL)
  
  // ユーザーが既に存在するか確認し、いなければ作成
  const existingUser = await db.select().from(users).where(eq(users.id, auth.userId))
  
  if (existingUser.length === 0) {
    await db.insert(users).values({
      id: auth.userId,
      // usernameなどは最初はnullでもOK（後でプロフィール画面で設定）
      plan: 'free'
    })
  }

  return c.json({ success: true })
})

// 2. プロジェクトの保存（新規作成・更新）
app.post('/api/projects', async (c) => {
  const auth = getAuth(c)
  if (!auth?.userId) return c.json({ error: 'Unauthorized' }, 401)

  const body = await c.req.json()
  const db = getDb(c.env.DATABASE_URL)

  const { id, projectName, data, isPublic = false, publicRole = 'viewer' } = body

  // upsert (存在すれば更新、なければ挿入)
  await db.insert(projects)
    .values({
      id: id,
      ownerId: auth.userId,
      projectName,
      data,
      isPublic,
      publicRole,
      updatedAt: new Date()
    })
    .onConflictDoUpdate({
      target: projects.id,
      set: { 
        projectName, 
        data,
        isPublic,
        publicRole,
        updatedAt: new Date() 
      }
    })

  return c.json({ success: true })
})

// 3. 自分のプロジェクト一覧を取得
app.get('/api/projects', async (c) => {
  const auth = getAuth(c)
  if (!auth?.userId) return c.json({ error: 'Unauthorized' }, 401)

  const db = getDb(c.env.DATABASE_URL)
  const userProjects = await db.select().from(projects).where(eq(projects.ownerId, auth.userId))

  return c.json(userProjects)
})

export default app