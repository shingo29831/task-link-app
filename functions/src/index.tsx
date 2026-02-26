import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { clerkMiddleware, getAuth } from '@hono/clerk-auth'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { users, projects, projectMembers } from './db/schema'
import { eq, and } from 'drizzle-orm'

// 環境変数の型定義
type Bindings = {
  DATABASE_URL: string
  CLERK_PUBLISHABLE_KEY: string
  CLERK_SECRET_KEY: string
}

const app = new Hono<{ Bindings: Bindings }>()

app.use('*', cors())
app.use('*', clerkMiddleware())

const getDb = (databaseUrl: string) => {
  const sql = neon(databaseUrl)
  return drizzle(sql)
}

// 1. ユーザー同期
app.post('/api/user/sync', async (c) => {
  const auth = getAuth(c)
  if (!auth?.userId) return c.json({ error: 'Unauthorized' }, 401)

  const db = getDb(c.env.DATABASE_URL)
  const existingUser = await db.select().from(users).where(eq(users.id, auth.userId))
  
  if (existingUser.length === 0) {
    await db.insert(users).values({ id: auth.userId, plan: 'free' })
  }
  return c.json({ success: true })
})

// 2. プロジェクトの保存（新規作成時はDB側で制限チェック＆UUIDを生成）
app.post('/api/projects', async (c) => {
  const auth = getAuth(c)
  if (!auth?.userId) return c.json({ error: 'Unauthorized' }, 401)

  const body = await c.req.json()
  const db = getDb(c.env.DATABASE_URL)
  const { id, projectName, data, isPublic = false, publicRole = 'viewer' } = body

  // フロントエンドで生成された "local_" から始まるIDかどうかを判定
  const isLocal = String(id).startsWith('local_')

  if (isLocal) {
    // ★ 追加: バックエンド側での上限数チェック (二重判定)
    const userRecord = await db.select().from(users).where(eq(users.id, auth.userId))
    const limit = userRecord[0]?.plan === 'premium' ? 10 : 3
    
    // 現在のプロジェクト数を取得
    const userProjects = await db.select().from(projects).where(eq(projects.ownerId, auth.userId))
    
    if (userProjects.length >= limit) {
      // 上限に達している場合は 403 Forbidden を返す
      return c.json({ error: 'Plan limit exceeded' }, 403)
    }

    // 新規作成: DB側で自動的に正しいUUIDを生成させる
    const inserted = await db.insert(projects)
      .values({
        ownerId: auth.userId,
        projectName,
        data,
        isPublic,
        publicRole,
        updatedAt: new Date()
      })
      .returning({ id: projects.id }) // 生成されたUUIDを取得
    return c.json({ success: true, newId: inserted[0].id })
  } else {
    // 既存更新: 既存のUUIDを使って上書き
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
        set: { projectName, data, isPublic, publicRole, updatedAt: new Date() }
      })
    return c.json({ success: true, id: id })
  }
})

// 3. 自分のプロジェクト一覧とプラン制限を取得
app.get('/api/projects', async (c) => {
  const auth = getAuth(c)
  if (!auth?.userId) return c.json({ error: 'Unauthorized' }, 401)

  const db = getDb(c.env.DATABASE_URL)
  
  // ★ 変更: ユーザーのプランを取得してアップロード制限数を決定 (無料=3件, プレミアム=10件)
  const userRecord = await db.select().from(users).where(eq(users.id, auth.userId))
  const limit = userRecord[0]?.plan === 'premium' ? 10 : 3 

  const userProjects = await db.select().from(projects).where(eq(projects.ownerId, auth.userId))

  return c.json({ projects: userProjects, limit })
})

// 4. 同期の解除（クラウドから削除）
app.delete('/api/projects/:id', async (c) => {
  const auth = getAuth(c)
  if (!auth?.userId) return c.json({ error: 'Unauthorized' }, 401)
  
  const id = c.req.param('id')
  const db = getDb(c.env.DATABASE_URL)

  // セキュリティのため、自分のプロジェクトのみ削除可能にする
  await db.delete(projects).where(and(eq(projects.id, id), eq(projects.ownerId, auth.userId)))
  
  return c.json({ success: true })
})

export default app