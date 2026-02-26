import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { clerkMiddleware, getAuth } from '@hono/clerk-auth'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { users, projects, projectMembers, sequences } from './db/schema' // ★ sequences を追加
import { eq, and, sql } from 'drizzle-orm' // ★ sql を追加

type Bindings = {
  DATABASE_URL: string
  CLERK_PUBLISHABLE_KEY: string
  CLERK_SECRET_KEY: string
}

const app = new Hono<{ Bindings: Bindings }>()

app.use('*', cors())
app.use('*', clerkMiddleware())

const getDb = (databaseUrl: string) => {
  const sqlClient = neon(databaseUrl)
  return drizzle(sqlClient)
}

// ★ 追加: 0からインクリメントした数値をURLセーフな64文字に変換する関数
const toBase64Url = (num: number): string => {
  const chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ-_';
  if (num === 0) return chars[0];
  let str = '';
  let n = num;
  while (n > 0) {
    str = chars[n % 64] + str;
    n = Math.floor(n / 64);
  }
  return str;
};

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

// 2. プロジェクトの保存
app.post('/api/projects', async (c) => {
  const auth = getAuth(c)
  if (!auth?.userId) return c.json({ error: 'Unauthorized' }, 401)

  const body = await c.req.json()
  const db = getDb(c.env.DATABASE_URL)
  const { id, projectName, data, isPublic = false, publicRole = 'viewer' } = body

  const isLocal = String(id).startsWith('local_')

  if (isLocal) {
    const userRecord = await db.select().from(users).where(eq(users.id, auth.userId))
    const limit = userRecord[0]?.plan === 'premium' ? 10 : 3
    const userProjects = await db.select().from(projects).where(eq(projects.ownerId, auth.userId))
    
    if (userProjects.length >= limit) {
      return c.json({ error: 'Plan limit exceeded' }, 403)
    }

    // ★ シーケンステーブルを使ってアトミックにインクリメント値を取得
    const updateResult = await db.execute(sql`
      INSERT INTO sequences (name, value) VALUES ('projectId', 1)
      ON CONFLICT (name) DO UPDATE SET value = sequences.value + 1
      RETURNING value;
    `);
    
    // DBは1から始まるため、-1して「0」からスタートするように調整
    const seqValue = Number(updateResult.rows[0].value) - 1;
    const newId = toBase64Url(seqValue); // IDを 0, 1, 2... a, b... に変換

    await db.insert(projects)
      .values({
        id: newId,
        ownerId: auth.userId,
        projectName,
        data,
        isPublic,
        publicRole,
        updatedAt: new Date()
      });
      
    return c.json({ success: true, newId: newId })
  } else {
    // 既存更新
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

  await db.delete(projects).where(and(eq(projects.id, id), eq(projects.ownerId, auth.userId)))
  return c.json({ success: true })
})

export default app