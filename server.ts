import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface DbSchema {
  products: any[];
  sales: any[];
  expenses: any[];
  version: number;
  lastUpdated: string;
}

const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'purikopi_db.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initialize empty DB if it doesn't exist (NO dummy/sample data!)
function loadDb(): DbSchema {
  if (!fs.existsSync(DB_FILE)) {
    const emptyDb: DbSchema = {
      products: [],
      sales: [],
      expenses: [],
      version: 1,
      lastUpdated: new Date().toISOString(),
    };
    saveDb(emptyDb);
    return emptyDb;
  }
  try {
    const content = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(content);
  } catch (err) {
    console.error('Error reading db file, reinitializing', err);
    const emptyDb: DbSchema = {
      products: [],
      sales: [],
      expenses: [],
      version: 1,
      lastUpdated: new Date().toISOString(),
    };
    saveDb(emptyDb);
    return emptyDb;
  }
}

// Atomic save to file
function saveDb(data: DbSchema) {
  data.lastUpdated = new Date().toISOString();
  data.version = (data.version || 1) + 1;
  const tempFile = `${DB_FILE}.tmp.${Date.now()}`;
  fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf-8');
  fs.renameSync(tempFile, DB_FILE);
}

let inMemoryDb = loadDb();

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  app.use(express.json({ limit: '10mb' }));

  // Request logger
  app.use((req, _res, next) => {
    if (req.path.startsWith('/api')) {
      console.log(`[API] ${req.method} ${req.path}`);
    }
    next();
  });

  // Health check
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      store: 'Puri Kopi Central',
      time: new Date().toISOString(),
      counts: {
        products: inMemoryDb.products.filter((p) => !p.deleted_at).length,
        sales: inMemoryDb.sales.filter((s) => !s.deleted_at).length,
        expenses: inMemoryDb.expenses.filter((e) => !e.deleted_at).length,
      },
    });
  });

  // GET all data
  app.get('/api/data', (_req: Request, res: Response) => {
    // Return all items including tombstones so client can reconcile deletes
    res.json({
      products: inMemoryDb.products,
      sales: inMemoryDb.sales,
      expenses: inMemoryDb.expenses,
      version: inMemoryDb.version,
      lastUpdated: inMemoryDb.lastUpdated,
    });
  });

  // Sync endpoint: client sends pending operations or full batch
  app.post('/api/sync', (req: Request, res: Response) => {
    try {
      const { queue, clientTimestamp } = req.body;

      if (Array.isArray(queue) && queue.length > 0) {
        let changed = false;

        for (const item of queue) {
          const { entity, action, record_id, payload } = item;

          if (entity === 'products') {
            const existingIdx = inMemoryDb.products.findIndex((p) => p.id === record_id);
            if (action === 'delete') {
              if (existingIdx !== -1) {
                inMemoryDb.products[existingIdx].deleted_at = new Date().toISOString();
                inMemoryDb.products[existingIdx].updated_at = new Date().toISOString();
                changed = true;
              }
            } else if (payload) {
              if (existingIdx !== -1) {
                // If existing record was updated later than payload, resolve with latest
                inMemoryDb.products[existingIdx] = {
                  ...inMemoryDb.products[existingIdx],
                  ...payload,
                  updated_at: payload.updated_at || new Date().toISOString(),
                };
              } else {
                inMemoryDb.products.push(payload);
              }
              changed = true;
            }
          } else if (entity === 'sales') {
            const existingIdx = inMemoryDb.sales.findIndex((s) => s.id === record_id);
            if (action === 'delete') {
              if (existingIdx !== -1) {
                inMemoryDb.sales[existingIdx].deleted_at = new Date().toISOString();
                inMemoryDb.sales[existingIdx].updated_at = new Date().toISOString();
                changed = true;
              }
            } else if (payload) {
              if (existingIdx !== -1) {
                inMemoryDb.sales[existingIdx] = {
                  ...inMemoryDb.sales[existingIdx],
                  ...payload,
                  updated_at: payload.updated_at || new Date().toISOString(),
                };
              } else {
                inMemoryDb.sales.push(payload);
              }
              changed = true;
            }
          } else if (entity === 'expenses') {
            const existingIdx = inMemoryDb.expenses.findIndex((e) => e.id === record_id);
            if (action === 'delete') {
              if (existingIdx !== -1) {
                inMemoryDb.expenses[existingIdx].deleted_at = new Date().toISOString();
                inMemoryDb.expenses[existingIdx].updated_at = new Date().toISOString();
                changed = true;
              }
            } else if (payload) {
              if (existingIdx !== -1) {
                inMemoryDb.expenses[existingIdx] = {
                  ...inMemoryDb.expenses[existingIdx],
                  ...payload,
                  updated_at: payload.updated_at || new Date().toISOString(),
                };
              } else {
                inMemoryDb.expenses.push(payload);
              }
              changed = true;
            }
          }
        }

        if (changed) {
          saveDb(inMemoryDb);
        }
      }

      // Respond with latest server state
      res.json({
        success: true,
        serverTime: new Date().toISOString(),
        products: inMemoryDb.products,
        sales: inMemoryDb.sales,
        expenses: inMemoryDb.expenses,
        version: inMemoryDb.version,
      });
    } catch (err: any) {
      console.error('Sync failed on server:', err);
      res.status(500).json({ error: 'Sync processing failed', message: err.message });
    }
  });

  // REST endpoints for direct interaction if online
  // Products
  app.get('/api/products', (_req: Request, res: Response) => {
    res.json(inMemoryDb.products.filter((p) => !p.deleted_at));
  });

  app.post('/api/products', (req: Request, res: Response) => {
    const product = req.body;
    if (!product || !product.id || !product.name) {
      return res.status(400).json({ error: 'Invalid product data' });
    }
    const idx = inMemoryDb.products.findIndex((p) => p.id === product.id);
    if (idx !== -1) {
      inMemoryDb.products[idx] = product;
    } else {
      inMemoryDb.products.push(product);
    }
    saveDb(inMemoryDb);
    res.json({ success: true, product });
  });

  app.delete('/api/products/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const idx = inMemoryDb.products.findIndex((p) => p.id === id);
    if (idx !== -1) {
      inMemoryDb.products[idx].deleted_at = new Date().toISOString();
      saveDb(inMemoryDb);
    }
    res.json({ success: true });
  });

  // Sales
  app.get('/api/sales', (_req: Request, res: Response) => {
    res.json(inMemoryDb.sales.filter((s) => !s.deleted_at));
  });

  app.post('/api/sales', (req: Request, res: Response) => {
    const sale = req.body;
    if (!sale || !sale.id || !sale.product_name_snapshot) {
      return res.status(400).json({ error: 'Invalid sale data' });
    }
    const idx = inMemoryDb.sales.findIndex((s) => s.id === sale.id);
    if (idx !== -1) {
      inMemoryDb.sales[idx] = sale;
    } else {
      inMemoryDb.sales.push(sale);
    }
    saveDb(inMemoryDb);
    res.json({ success: true, sale });
  });

  app.delete('/api/sales/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const idx = inMemoryDb.sales.findIndex((s) => s.id === id);
    if (idx !== -1) {
      inMemoryDb.sales[idx].deleted_at = new Date().toISOString();
      saveDb(inMemoryDb);
    }
    res.json({ success: true });
  });

  // Expenses
  app.get('/api/expenses', (_req: Request, res: Response) => {
    res.json(inMemoryDb.expenses.filter((e) => !e.deleted_at));
  });

  app.post('/api/expenses', (req: Request, res: Response) => {
    const expense = req.body;
    if (!expense || !expense.id || !expense.description) {
      return res.status(400).json({ error: 'Invalid expense data' });
    }
    const idx = inMemoryDb.expenses.findIndex((e) => e.id === expense.id);
    if (idx !== -1) {
      inMemoryDb.expenses[idx] = expense;
    } else {
      inMemoryDb.expenses.push(expense);
    }
    saveDb(inMemoryDb);
    res.json({ success: true, expense });
  });

  app.delete('/api/expenses/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const idx = inMemoryDb.expenses.findIndex((e) => e.id === id);
    if (idx !== -1) {
      inMemoryDb.expenses[idx].deleted_at = new Date().toISOString();
      saveDb(inMemoryDb);
    }
    res.json({ success: true });
  });

  // Vite middleware in dev or static files in production
  const isProduction = process.env.NODE_ENV === 'production';
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Puri Kopi Server is running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal error starting Puri Kopi server:', err);
  process.exit(1);
});
