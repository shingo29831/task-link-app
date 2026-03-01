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

app.post('/api/user/sync', async (c) => {
  const auth = getAuth(c)
  if (!auth?.userId) return c.json({ error: 'Unauthorized' }, 401)

  const body = await c.req.json().catch(() => ({}));
  const username = body.username || null;
  const db = getDb(c.env.DATABASE_URL)
  
  try {
    const existingUser = await db.select().from(users).where(eq(users.id, auth.userId))
    
    if (existingUser.length === 0) {
      await db.insert(users).values({ id: auth.userId, username: username, plan: 'free' })
    } else if (existingUser[0].username !== username) {
      await db.update(users).set({ username: username }).where(eq(users.id, auth.userId))
    }
    return c.json({ success: true })
  } catch (error: any) {
    if (error.code === '23505') {
      return c.json({ error: 'Username is already taken' }, 400)
    }
    console.error('User sync error:', error);
    return c.json({ error: 'Database error' }, 500)
  }
})

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
    const newId = crypto.randomUUID(); 

    await db.insert(projects).values({ id: newId, shortId: newShortId, ownerId: auth.userId, projectName, data, isPublic, publicRole, updatedAt: new Date() });
    return c.json({ success: true, newId: newId, shortId: newShortId })
  } else {
    let finalShortId = shortId;
    const existingList = await db.select().from(projects).where(eq(projects.id, id));
    
    if (existingList.length > 0) {
      // 既存のプロジェクトを更新する場合（権限チェックを行う）
      const existing = existingList[0];
      finalShortId = existing.shortId;

      let role = 'none';
      if (existing.ownerId === auth.userId) {
        role = 'owner';
      } else {
        const memberRecord = await db.select()
          .from(projectMembers)
          .where(and(eq(projectMembers.projectId, id), eq(projectMembers.userId, auth.userId)));
        if (memberRecord.length > 0) {
          role = memberRecord[0].role;
        } else if (existing.isPublic) {
          role = existing.publicRole || 'viewer';
        }
      }

      // 編集・管理権限がない場合は保存を拒否し、現在のロールを返す
      if (role !== 'owner' && role !== 'admin' && role !== 'editor') {
        return c.json({ error: 'Forbidden', role: role }, 403);
      }

      const updateData: any = { data, updatedAt: new Date() };
      
      // プロジェクト名や公開設定の変更はオーナーと管理者のみ可能
      if (role === 'owner' || role === 'admin') {
        if (projectName !== undefined) updateData.projectName = projectName;
        if (body.isPublic !== undefined) updateData.isPublic = body.isPublic;
        if (body.publicRole !== undefined) updateData.publicRole = body.publicRole;
      }

      await db.update(projects).set(updateData).where(eq(projects.id, id));
      return c.json({ success: true, id: id, shortId: finalShortId, role: role });
    } else {
      // 新規で指定IDを用いて作成される場合
      if (!finalShortId) {
        const updateResult = await db.execute(sql`
          INSERT INTO sequences (name, value) VALUES ('projectId', 1)
          ON CONFLICT (name) DO UPDATE SET value = sequences.value + 1
          RETURNING value;
        `);
        finalShortId = toBase64Url(Number(updateResult.rows[0].value) - 1);
      }

      await db.insert(projects)
        .values({ id: id, shortId: finalShortId, ownerId: auth.userId, projectName, data, isPublic, publicRole, updatedAt: new Date() });
        
      return c.json({ success: true, id: id, shortId: finalShortId, role: 'owner' });
    }
  }
})

app.get('/api/projects', async (c) => {
  const auth = getAuth(c)
  if (!auth?.userId) return c.json({ error: 'Unauthorized' }, 401)

  const db = getDb(c.env.DATABASE_URL)
  const userRecord = await db.select().from(users).where(eq(users.id, auth.userId))
  const limit = userRecord[0]?.plan === 'premium' ? 10 : 3 

  const userProjects = await db.select().from(projects).where(eq(projects.ownerId, auth.userId))
  return c.json({ projects: userProjects, limit })
})

// 単一プロジェクト取得エンドポイント
app.get('/api/projects/:id', async (c) => {
  const auth = getAuth(c)
  const id = c.req.param('id')
  const db = getDb(c.env.DATABASE_URL)

  const proj = await db.select().from(projects).where(eq(projects.id, id))
  
  if (proj.length === 0) {
    return c.json({ error: 'Project not found' }, 404)
  }

  const project = proj[0]
  let role = 'none';

  if (auth?.userId) {
    if (project.ownerId === auth.userId) {
      role = 'owner';
    } else {
      const memberRecord = await db.select()
        .from(projectMembers)
        .where(and(
          eq(projectMembers.projectId, project.id),
          eq(projectMembers.userId, auth.userId)
        ))

      if (memberRecord.length > 0) {
        role = memberRecord[0].role;
      }
    }
  }

  if (role === 'none') {
    if (project.isPublic) {
      role = project.publicRole || 'viewer';
    } else {
      return c.json({ error: 'Forbidden' }, 403) 
    }
  }

  return c.json({ success: true, project: project, role: role })
})

app.delete('/api/projects/:id', async (c) => {
  const auth = getAuth(c)
  if (!auth?.userId) return c.json({ error: 'Unauthorized' }, 401)
  
  const id = c.req.param('id')
  const db = getDb(c.env.DATABASE_URL)

  const proj = await db.select().from(projects).where(and(eq(projects.id, id), eq(projects.ownerId, auth.userId)))
  if (proj.length === 0) return c.json({ error: 'Project not found or unauthorized' }, 404)

  await db.delete(projectMembers).where(eq(projectMembers.projectId, id))
  await db.delete(projects).where(eq(projects.id, id))
  
  return c.json({ success: true })
})

// ★ 追加：プロジェクト名変更エンドポイント
app.put('/api/projects/:id/name', async (c) => {
  const auth = getAuth(c)
  if (!auth?.userId) return c.json({ error: 'Unauthorized' }, 401)
  
  const id = c.req.param('id')
  const body = await c.req.json()
  const db = getDb(c.env.DATABASE_URL)
  
  const proj = await db.select().from(projects).where(eq(projects.id, id))
  if (proj.length === 0) return c.json({ error: 'Project not found' }, 404)
  
  const project = proj[0]
  let role = 'none'
  
  if (project.ownerId === auth.userId) {
    role = 'owner'
  } else {
    const memberRecord = await db.select()
      .from(projectMembers)
      .where(and(eq(projectMembers.projectId, id), eq(projectMembers.userId, auth.userId)))
    
    if (memberRecord.length > 0) {
      role = memberRecord[0].role
    }
  }

  // オーナーか管理者のみが名前を変更可能
  if (role !== 'owner' && role !== 'admin') {
    return c.json({ error: 'Forbidden' }, 403)
  }

  if (!body.projectName) {
     return c.json({ error: 'Project name is required' }, 400)
  }

  await db.update(projects).set({ projectName: body.projectName }).where(eq(projects.id, id))
  
  return c.json({ success: true })
})

app.put('/api/projects/:id/public', async (c) => {
  const auth = getAuth(c)
  if (!auth?.userId) return c.json({ error: 'Unauthorized' }, 401)
  const id = c.req.param('id')
  const body = await c.req.json()
  const db = getDb(c.env.DATABASE_URL)
  await db.update(projects).set({ isPublic: body.isPublic }).where(and(eq(projects.id, id), eq(projects.ownerId, auth.userId)))
  return c.json({ success: true })
})

app.get('/api/projects/:id/members', async (c) => {
    const auth = getAuth(c)
    if (!auth?.userId) return c.json({ error: 'Unauthorized' }, 401)
    const id = c.req.param('id')
    const db = getDb(c.env.DATABASE_URL)
    const proj = await db.select().from(projects).where(and(eq(projects.id, id), eq(projects.ownerId, auth.userId)))
    if (proj.length === 0) return c.json({ error: 'Project not found or unauthorized' }, 404)
    const members = await db.select({ id: users.id, username: users.username, role: projectMembers.role })
    .from(projectMembers).innerJoin(users, eq(projectMembers.userId, users.id)).where(eq(projectMembers.projectId, id))
    return c.json({ members, isPublic: proj[0].isPublic, publicRole: proj[0].publicRole })
})

app.post('/api/projects/:id/members', async (c) => {
    const auth = getAuth(c)
    if (!auth?.userId) return c.json({ error: 'Unauthorized' }, 401)
    const id = c.req.param('id')
    const body = await c.req.json()
    const db = getDb(c.env.DATABASE_URL)
    const proj = await db.select().from(projects).where(and(eq(projects.id, id), eq(projects.ownerId, auth.userId)))
    if (proj.length === 0) return c.json({ error: 'Project not found or unauthorized' }, 404)
    const targetUser = await db.select().from(users).where(eq(users.username, body.username))
    if (targetUser.length === 0) return c.json({ error: 'User not found' }, 404)
    if (targetUser[0].id === auth.userId) return c.json({ error: 'Cannot invite yourself' }, 400)

    try {
        await db.insert(projectMembers).values({ projectId: id, userId: targetUser[0].id, role: body.role || 'viewer' })
        return c.json({ success: true, member: { id: targetUser[0].id, username: targetUser[0].username, role: body.role || 'viewer' } })
    } catch(e) {
        return c.json({ error: 'User may already be a member' }, 400)
    }
})

app.put('/api/projects/:id/members/:memberId', async (c) => {
    const auth = getAuth(c)
    if (!auth?.userId) return c.json({ error: 'Unauthorized' }, 401)
    const id = c.req.param('id')
    const memberId = c.req.param('memberId')
    const body = await c.req.json()
    const db = getDb(c.env.DATABASE_URL)
    const proj = await db.select().from(projects).where(and(eq(projects.id, id), eq(projects.ownerId, auth.userId)))
    if (proj.length === 0) return c.json({ error: 'Project not found or unauthorized' }, 404)
    await db.update(projectMembers).set({ role: body.role }).where(and(eq(projectMembers.projectId, id), eq(projectMembers.userId, memberId)))
    return c.json({ success: true })
})

app.delete('/api/projects/:id/members/:memberId', async (c) => {
    const auth = getAuth(c)
    if (!auth?.userId) return c.json({ error: 'Unauthorized' }, 401)
    const id = c.req.param('id')
    const memberId = c.req.param('memberId')
    const db = getDb(c.env.DATABASE_URL)
    const proj = await db.select().from(projects).where(and(eq(projects.id, id), eq(projects.ownerId, auth.userId)))
    if (proj.length === 0) return c.json({ error: 'Project not found or unauthorized' }, 404)
    await db.delete(projectMembers).where(and(eq(projectMembers.projectId, id), eq(projectMembers.userId, memberId)))
    return c.json({ success: true })
})

app.get('/api/projects/shared/:shortId', async (c) => {
  const auth = getAuth(c)
  const shortId = c.req.param('shortId')
  const db = getDb(c.env.DATABASE_URL)

  console.log(`[SharedProject Check] shortId: ${shortId}, userId: ${auth?.userId || 'anonymous'}`);

  const proj = await db.select().from(projects).where(eq(projects.shortId, shortId))
  
  if (proj.length === 0) {
    console.log(`[SharedProject Check] Error: Project not found.`);
    return c.json({ error: 'Project not found' }, 404)
  }

  const project = proj[0]
  let role = 'none';

  if (auth?.userId) {
    if (project.ownerId === auth.userId) {
      role = 'owner';
      console.log(`[SharedProject Check] User is the owner.`);
    } else {
      const memberRecord = await db.select()
        .from(projectMembers)
        .where(and(
          eq(projectMembers.projectId, project.id),
          eq(projectMembers.userId, auth.userId)
        ))

      if (memberRecord.length > 0) {
        role = memberRecord[0].role;
        console.log(`[SharedProject Check] User is a member. Role: ${role}`);
      } else {
        console.log(`[SharedProject Check] User is logged in but not a member of this project.`);
      }
    }
  }

  if (role === 'none') {
    if (project.isPublic) {
      role = project.publicRole || 'viewer';
      console.log(`[SharedProject Check] Project is public. Granted role: ${role}`);
    } else {
      console.log(`[SharedProject Check] Project is private and user has no access. Forbidden.`);
      return c.json({ error: 'Forbidden' }, 403) 
    }
  }

  console.log(`[SharedProject Check] Success. Final Role: ${role}`);
  return c.json({ success: true, project: project, role: role })
})

export default app