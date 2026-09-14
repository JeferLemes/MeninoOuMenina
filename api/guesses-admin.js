import { kv } from '@vercel/kv';

const LIST_KEY = 'revelacao:guesses';

export default async function handler(req, res) {
  // Ajuste automático das variáveis de ambiente da Vercel
  process.env.KV_REST_API_URL = process.env.KV_REST_API_URL || process.env.palpitesdb_KV_REST_API_URL;
  process.env.KV_REST_API_TOKEN = process.env.KV_REST_API_TOKEN || process.env.palpitesdb_KV_REST_API_TOKEN;

  const providedKey = req.headers['x-admin-key'];
  const adminKey = process.env.ADMIN_KEY || 'revelacao2026';

  if (!providedKey || providedKey !== adminKey) {
    return res.status(401).json({ error: 'Senha incorreta.' });
  }

  // GET - Ler todos os palpites
  if (req.method === 'GET') {
    try {
      const raw = await kv.lrange(LIST_KEY, 0, -1) || [];
      const guesses = raw
        .map(item => {
          try { return typeof item === 'string' ? JSON.parse(item) : item; }
          catch { return null; }
        })
        .filter(Boolean)
        .reverse();
      return res.status(200).json(guesses);
    } catch (err) {
      console.error('Erro ao ler palpites (admin):', err);
      return res.status(500).json({ error: 'Não foi possível carregar os palpites.' });
    }
  }

  // DELETE - Apagar palpites (um específico ou todos)
  if (req.method === 'DELETE') {
    try {
      const { ts, clearAll } = req.body || {};

      // Opção 1: Apagar todos os palpites
      if (clearAll) {
        await kv.del(LIST_KEY);
        return res.status(200).json({ ok: true, message: 'Todos os palpites foram apagados.' });
      }

      // Opção 2: Apagar um palpite específico pelo timestamp (ts)
      if (ts) {
        const raw = await kv.lrange(LIST_KEY, 0, -1) || [];
        const updated = [];
        
        for (const item of raw) {
          const parsed = typeof item === 'string' ? JSON.parse(item) : item;
          if (parsed && parsed.ts !== Number(ts)) {
            updated.push(JSON.stringify(parsed));
          }
        }

        await kv.del(LIST_KEY);
        if (updated.length > 0) {
          await kv.rpush(LIST_KEY, ...updated);
        }

        return res.status(200).json({ ok: true, message: 'Palpite apagado com sucesso.' });
      }

      return res.status(400).json({ error: 'Informe qual palpite deseja apagar.' });
    } catch (err) {
      console.error('Erro ao apagar palpite (admin):', err);
      return res.status(500).json({ error: 'Não foi possível apagar o palpite.' });
    }
  }

  res.setHeader('Allow', ['GET', 'DELETE']);
  return res.status(405).json({ error: 'Método não permitido.' });
}
