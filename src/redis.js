const Redis = require('ioredis');

const client = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: 6379,
});

const DEFAULT_TTL = 604800; // 7 days
const CODES_SET = '__codes__';

const redis = {
  async set(code, url, ttlSeconds = DEFAULT_TTL) {
    const entry = JSON.stringify({
      url,
      createdAt: new Date().toISOString(),
      enabled: true,
      clicks: 0,
    });

    await client.set(code, entry, 'EX', ttlSeconds);
    await client.sadd(CODES_SET, code);
    return true;
  },

  async get(code) {
    const raw = await client.get(code);
    if (!raw) return null;

    try {
      const parsed = JSON.parse(raw);

      if (parsed.enabled === false) {
        return null;
      }

      return parsed.url;
    } catch {
      return raw;
    }
  },

  async list() {
    const codes = await client.smembers(CODES_SET);
    if (!codes.length) return [];

    const entries = await Promise.all(
      codes.map(async (code) => {
        const raw = await client.get(code);

        if (!raw) {
          await client.srem(CODES_SET, code);
          return null;
        }

        try {
          const parsed = JSON.parse(raw);

          return {
            code,
            url: parsed.url,
            createdAt: parsed.createdAt || new Date().toISOString(),
            enabled: parsed.enabled ?? true,
            clicks: parsed.clicks ?? 0, // 🔥 สำคัญ
          };
        } catch {
          return {
            code,
            url: raw,
            createdAt: new Date().toISOString(),
            enabled: true,
            clicks: 0,
          };
        }
      })
    );

    return entries.filter(Boolean);
  },

  async del(code) {
    const result = await client.del(code);
    await client.srem(CODES_SET, code);
    return result;
  },

  async toggle(code) {
    const raw = await client.get(code);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    parsed.enabled = !(parsed.enabled ?? true);

    const ttl = await client.ttl(code);

    if (ttl > 0) {
      await client.set(code, JSON.stringify(parsed), 'EX', ttl);
    } else {
      await client.set(code, JSON.stringify(parsed));
    }

    return parsed.enabled;
  },

  // 🔥🔥🔥 ตัวที่มึงขาด
  async incrementClick(code) {
    const raw = await client.get(code);
    if (!raw) return;

    const parsed = JSON.parse(raw);

    if (parsed.clicks === undefined) {
      parsed.clicks = 1;
    } else {
      parsed.clicks += 1;
    }

    const ttl = await client.ttl(code);

    if (ttl > 0) {
      await client.set(code, JSON.stringify(parsed), 'EX', ttl);
    } else {
      await client.set(code, JSON.stringify(parsed));
    }
  },
};

module.exports = redis;