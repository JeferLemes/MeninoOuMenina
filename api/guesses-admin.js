import { kv } from '@vercel/kv';

const LIST_KEY = 'revelacao:guesses';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Método não permitido.' });
  }

  const providedKey = req.headers['x-admin-key'];
  const adminKey = process.env.ADMIN_KEY;

  if (!adminKey) {
    return res.status(500).json({ error: 'ADMIN_KEY não configurada no projeto.' });
  }
  if (!providedKey || providedKey !== adminKey) {
    return res.status(401).json({ error: 'Senha incorreta.' });
  }

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
