import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { clerkMiddleware, getAuth } from '@hono/clerk-auth'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { users, projects, projectMembers, sequences } from './db/schema'
import { eq, and, sql } from 'drizzle-orm'

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

// 1. ユーザー同期 (Usernameの保存と一意性エラーのハンドリングを含む)
app.post('/api/user/sync', async (c) => {
  const auth = getAuth(c)
  if (!auth?.userId) return c.json({ error: 'Unauthorized' }, 401)

  // フロントエンドから username を受け取る
  const body = await c.req.json().catch(() => ({}));
  const username = body.username || null;

  const db = getDb(c.env.DATABASE_URL)
  
  try {
    const existingUser = await db.select().from(users).where(eq(users.id, auth.userId))
    
    if (existingUser.length === 0) {
      // 新規作成時に username も保存
      await db.insert(users).values({ id: auth.userId, username: username, plan: 'free' })
    } else if (existingUser[0].username !== username) {
      // 既存ユーザーの username が変更されていれば更新する
      await db.update(users).set({ username: username }).where(eq(users.id, auth.userId))
    }
    return c.json({ success: true })
  } catch (error: any) {
    // DB側での一意制約違反エラー (PostgreSQL error 23505) を検知
    if (error.code === '23505') {
      return c.json({ error: 'Username is already taken' }, 400)
    }
    console.error('User sync error:', error);
    return c.json({ error: 'Database error' }, 500)
  }
})

// 2. プロジェクトの保存
app.post('/api/projects', async (c) => {
  const auth = getAuth(c)
  if (!auth?.userId) return c.json({ error: 'Unauthorized' }, 401)

  const body = await c.req.json()
  const db = getDb(c.env.DATABASE_URL)
  const { id, shortId, projectName, data, isPublic = false, publicRole = 'viewer' } = body

  const isLocal = String(id).startsWith('local_')

  if (isLocal) {
    const userRecord = await db.select().from(users).where(eq(users.id, auth.userId))
    const limit = userRecord[0]?.plan === 'premium' ? 10 : 3
    const userProjects = await db.select().from(projects).where(eq(projects.ownerId, auth.userId))
    
    if (userProjects.length >= limit) return c.json({ error: 'Plan limit exceeded' }, 403)

    const updateResult = await db.execute(sql`
      INSERT INTO sequences (name, value) VALUES ('projectId', 1)
      ON CONFLICT (name) DO UPDATE SET value = sequences.value + 1
      RETURNING value;
    `);
    
    const seqValue = Number(updateResult.rows[0].value) - 1;
    const newShortId = toBase64Url(seqValue);
    const newId = crypto.randomUUID(); // システム用にはセキュアなUUIDを生成

    await db.insert(projects)
      .values({
        id: newId,
        shortId: newShortId,
        ownerId: auth.userId,
        projectName,
        data,
        isPublic,
        publicRole,
        updatedAt: new Date()
      });
      
    // フロントエンドには両方返す
    return c.json({ success: true, newId: newId, shortId: newShortId })
  } else {
    // 既存のUUIDの場合
    let finalShortId = shortId;
    const existing = await db.select().from(projects).where(and(eq(projects.id, id), eq(projects.ownerId, auth.userId)));
    
    if (existing.length > 0) {
      // 既にDBに保存されている場合は、それを維持する（フロントのshortIdが欠落していても補完する）
      finalShortId = existing[0].shortId;
    } else if (!finalShortId) {
      // DBに存在せず、フロントからも送られていない場合（同期オフ状態から再度オンにした場合など）、新しいshortIdを発行
      const updateResult = await db.execute(sql`
        INSERT INTO sequences (name, value) VALUES ('projectId', 1)
        ON CONFLICT (name) DO UPDATE SET value = sequences.value + 1
        RETURNING value;
      `);
      finalShortId = toBase64Url(Number(updateResult.rows[0].value) - 1);
    }

    await db.insert(projects)
      .values({
        id: id,
        shortId: finalShortId,
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
      
    return c.json({ success: true, id: id, shortId: finalShortId })
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

  // プロジェクトが存在し、オーナーが一致するか確認
  const proj = await db.select().from(projects).where(and(eq(projects.id, id), eq(projects.ownerId, auth.userId)))
  if (proj.length === 0) return c.json({ error: 'Project not found or unauthorized' }, 404)

  // プロジェクトメンバーも明示的に削除する
  await db.delete(projectMembers).where(eq(projectMembers.projectId, id))
  
  // プロジェクトを削除する
  await db.delete(projects).where(eq(projects.id, id))
  
  return c.json({ success: true })
})

// 公開設定の更新
app.put('/api/projects/:id/public', async (c) => {
  const auth = getAuth(c)
  if (!auth?.userId) return c.json({ error: 'Unauthorized' }, 401)
  
  const id = c.req.param('id')
  const body = await c.req.json()
  const db = getDb(c.env.DATABASE_URL)

  await db.update(projects)
      .set({ isPublic: body.isPublic })
      .where(and(eq(projects.id, id), eq(projects.ownerId, auth.userId)))
      
  return c.json({ success: true })
})

// プロジェクトメンバー一覧取得
app.get('/api/projects/:id/members', async (c) => {
    const auth = getAuth(c)
    if (!auth?.userId) return c.json({ error: 'Unauthorized' }, 401)
    
    const id = c.req.param('id')
    const db = getDb(c.env.DATABASE_URL)
  
    // プロジェクトのオーナーか確認
    const proj = await db.select().from(projects).where(and(eq(projects.id, id), eq(projects.ownerId, auth.userId)))
    if (proj.length === 0) return c.json({ error: 'Project not found or unauthorized' }, 404)
  
    const members = await db.select({
        id: users.id,
        username: users.username,
        role: projectMembers.role
    })
    .from(projectMembers)
    .innerJoin(users, eq(projectMembers.userId, users.id))
    .where(eq(projectMembers.projectId, id))
  
    return c.json({ members, isPublic: proj[0].isPublic, publicRole: proj[0].publicRole })
})

// メンバー招待
app.post('/api/projects/:id/members', async (c) => {
    const auth = getAuth(c)
    if (!auth?.userId) return c.json({ error: 'Unauthorized' }, 401)
    
    const id = c.req.param('id')
    const body = await c.req.json()
    const db = getDb(c.env.DATABASE_URL)
  
    const proj = await db.select().from(projects).where(and(eq(projects.id, id), eq(projects.ownerId, auth.userId)))
    if (proj.length === 0) return c.json({ error: 'Project not found or unauthorized' }, 404)
  
    // 招待対象のユーザーをユーザー名で検索
    const targetUser = await db.select().from(users).where(eq(users.username, body.username))
    if (targetUser.length === 0) return c.json({ error: 'User not found' }, 404)
    if (targetUser[0].id === auth.userId) return c.json({ error: 'Cannot invite yourself' }, 400)

    try {
        await db.insert(projectMembers).values({
            projectId: id,
            userId: targetUser[0].id,
            role: body.role || 'viewer'
        })
        return c.json({ success: true, member: { id: targetUser[0].id, username: targetUser[0].username, role: body.role || 'viewer' } })
    } catch(e) {
        return c.json({ error: 'User may already be a member' }, 400)
    }
})

// メンバー権限変更
app.put('/api/projects/:id/members/:memberId', async (c) => {
    const auth = getAuth(c)
    if (!auth?.userId) return c.json({ error: 'Unauthorized' }, 401)
    
    const id = c.req.param('id')
    const memberId = c.req.param('memberId')
    const body = await c.req.json()
    const db = getDb(c.env.DATABASE_URL)
  
    const proj = await db.select().from(projects).where(and(eq(projects.id, id), eq(projects.ownerId, auth.userId)))
    if (proj.length === 0) return c.json({ error: 'Project not found or unauthorized' }, 404)
  
    await db.update(projectMembers)
        .set({ role: body.role })
        .where(and(eq(projectMembers.projectId, id), eq(projectMembers.userId, memberId)))

    return c.json({ success: true })
})

// メンバー削除
app.delete('/api/projects/:id/members/:memberId', async (c) => {
    const auth = getAuth(c)
    if (!auth?.userId) return c.json({ error: 'Unauthorized' }, 401)
    
    const id = c.req.param('id')
    const memberId = c.req.param('memberId')
    const db = getDb(c.env.DATABASE_URL)
  
    const proj = await db.select().from(projects).where(and(eq(projects.id, id), eq(projects.ownerId, auth.userId)))
    if (proj.length === 0) return c.json({ error: 'Project not found or unauthorized' }, 404)
  
    await db.delete(projectMembers)
        .where(and(eq(projectMembers.projectId, id), eq(projectMembers.userId, memberId)))

    return c.json({ success: true })
})

export default app