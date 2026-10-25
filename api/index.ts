let memoryDb = {
  products: [] as any[],
  sales: [] as any[],
  expenses: [] as any[],
  qris: null as any,
  version: 1,
  lastUpdated: new Date().toISOString(),
};

async function getCloudDb() {
  const redisUrl =
    process.env.STORAGE_REST_API_URL ||
    process.env.UPSTASH_REDIS_REST_URL ||
    process.env.KV_REST_API_URL;
  const redisToken =
    process.env.STORAGE_REST_API_TOKEN ||
    process.env.UPSTASH_REDIS_REST_TOKEN ||
    process.env.KV_REST_API_TOKEN;

  if (redisUrl && redisToken) {
    try {
      const res = await fetch(`${redisUrl}/get/purikopi_db`, {
        headers: { Authorization: `Bearer ${redisToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.result) {
          const parsed = typeof data.result === 'string' ? JSON.parse(data.result) : data.result;
          if (parsed && Array.isArray(parsed.products)) {
            memoryDb = parsed;
            return parsed;
          }
        }
      }
    } catch (err) {
      console.warn('Error reading from Upstash Redis:', err);
    }
  }
  return memoryDb;
}

async function saveCloudDb(data: any) {
  memoryDb = data;
  const redisUrl =
    process.env.STORAGE_REST_API_URL ||
    process.env.UPSTASH_REDIS_REST_URL ||
    process.env.KV_REST_API_URL;
  const redisToken =
    process.env.STORAGE_REST_API_TOKEN ||
    process.env.UPSTASH_REDIS_REST_TOKEN ||
    process.env.KV_REST_API_TOKEN;

  if (redisUrl && redisToken) {
    try {
      await fetch(`${redisUrl}/set/purikopi_db`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${redisToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(JSON.stringify(data)),
      });
    } catch (err) {
      console.warn('Error saving to Upstash Redis:', err);
    }
  }
}

export default async function handler(req: any, res: any) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, x-purikopi-store'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const url = req.url || '';
  const currentDb = await getCloudDb();

  if (url.includes('/api/health')) {
    return res.status(200).json({
      status: 'ok',
      store: 'Puri Kopi Central (Vercel Cloud)',
      hasCloudDb: !!(
        process.env.STORAGE_REST_API_URL ||
        process.env.UPSTASH_REDIS_REST_URL ||
        process.env.KV_REST_API_URL
      ),
      time: new Date().toISOString(),
      counts: {
        products: currentDb.products.filter((p: any) => !p.deleted_at).length,
        sales: currentDb.sales.filter((s: any) => !s.deleted_at).length,
        expenses: currentDb.expenses.filter((e: any) => !e.deleted_at).length,
      },
    });
  }

  if (url.includes('/api/data')) {
    return res.status(200).json(currentDb);
  }

  if (url.includes('/api/qris')) {
    if (req.method === 'GET') {
      return res.status(200).json(currentDb.qris || null);
    }
    if (req.method === 'POST') {
      currentDb.qris = req.body;
      currentDb.lastUpdated = new Date().toISOString();
      await saveCloudDb(currentDb);
      return res.status(200).json({ success: true, qris: currentDb.qris });
    }
    if (req.method === 'DELETE') {
      currentDb.qris = null;
      currentDb.lastUpdated = new Date().toISOString();
      await saveCloudDb(currentDb);
      return res.status(200).json({ success: true });
    }
  }

  if (url.includes('/api/sync') && req.method === 'POST') {
    const { queue, qris } = req.body || {};
    let changed = false;

    if (qris !== undefined) {
      currentDb.qris = qris;
      changed = true;
    }

    if (Array.isArray(queue)) {
      for (const item of queue) {
        const { entity, action, record_id, payload } = item;
        if (entity === 'qris') {
          currentDb.qris = action === 'delete' ? null : payload;
          changed = true;
        } else {
          const targetList = (currentDb as any)[entity];
          if (Array.isArray(targetList)) {
            const idx = targetList.findIndex((x: any) => x.id === record_id);
            if (action === 'delete') {
              if (idx !== -1) {
                targetList[idx].deleted_at = new Date().toISOString();
                changed = true;
              }
            } else if (payload) {
              if (idx !== -1) {
                targetList[idx] = { ...targetList[idx], ...payload };
              } else {
                targetList.push(payload);
              }
              changed = true;
            }
          }
        }
      }
    }

    if (changed) {
      currentDb.lastUpdated = new Date().toISOString();
      currentDb.version = (currentDb.version || 1) + 1;
      await saveCloudDb(currentDb);
    }

    return res.status(200).json({
      success: true,
      serverTime: new Date().toISOString(),
      products: currentDb.products,
      sales: currentDb.sales,
      expenses: currentDb.expenses,
      qris: currentDb.qris || null,
      version: currentDb.version,
    });
  }

  return res.status(200).json({ status: 'ok', message: 'Puri Kopi API' });
}
