let memoryDb = {
  products: [] as any[],
  sales: [] as any[],
  expenses: [] as any[],
  version: 1,
  lastUpdated: new Date().toISOString(),
};

export default function handler(req: any, res: any) {
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

  if (url.includes('/api/health')) {
    return res.status(200).json({
      status: 'ok',
      store: 'Puri Kopi Central (Vercel Serverless)',
      time: new Date().toISOString(),
      counts: {
        products: memoryDb.products.filter((p: any) => !p.deleted_at).length,
        sales: memoryDb.sales.filter((s: any) => !s.deleted_at).length,
        expenses: memoryDb.expenses.filter((e: any) => !e.deleted_at).length,
      },
    });
  }

  if (url.includes('/api/data')) {
    return res.status(200).json(memoryDb);
  }

  if (url.includes('/api/sync') && req.method === 'POST') {
    const { queue } = req.body || {};
    if (Array.isArray(queue)) {
      for (const item of queue) {
        const { entity, action, record_id, payload } = item;
        const targetList = (memoryDb as any)[entity];
        if (Array.isArray(targetList)) {
          const idx = targetList.findIndex((x: any) => x.id === record_id);
          if (action === 'delete') {
            if (idx !== -1) {
              targetList[idx].deleted_at = new Date().toISOString();
            }
          } else if (payload) {
            if (idx !== -1) {
              targetList[idx] = { ...targetList[idx], ...payload };
            } else {
              targetList.push(payload);
            }
          }
        }
      }
      memoryDb.lastUpdated = new Date().toISOString();
      memoryDb.version += 1;
    }
    return res.status(200).json({
      success: true,
      serverTime: new Date().toISOString(),
      products: memoryDb.products,
      sales: memoryDb.sales,
      expenses: memoryDb.expenses,
      version: memoryDb.version,
    });
  }

  return res.status(200).json({ status: 'ok', message: 'Puri Kopi API' });
}
