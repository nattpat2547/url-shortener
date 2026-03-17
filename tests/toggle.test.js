const request = require('supertest');

// mockClient prefix allows use inside jest.mock factory despite hoisting
const mockClient = {
  get: jest.fn(),
  set: jest.fn(),
  smembers: jest.fn(),
  sadd: jest.fn(),
  srem: jest.fn(),
  del: jest.fn(),
  ttl: jest.fn(),
};

jest.mock('ioredis', () => jest.fn(() => mockClient));

const redis = require('../src/redis');
const app = require('../src/index');

describe('Enable/Disable Feature', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  // ── redis layer ────────────────────────────────────────────────────────

  test('redis.list() returns entries with enabled field as boolean', async () => {
    mockClient.smembers.mockResolvedValue(['abc123']);
    mockClient.get.mockResolvedValue(
      JSON.stringify({ url: 'https://example.com', createdAt: new Date().toISOString(), enabled: true })
    );

    const entries = await redis.list();

    expect(entries[0]).toHaveProperty('enabled');
    expect(typeof entries[0].enabled).toBe('boolean');
  });

  test('redis.get() returns null when entry has enabled: false', async () => {
    mockClient.get.mockResolvedValue(
      JSON.stringify({ url: 'https://example.com', createdAt: new Date().toISOString(), enabled: false })
    );

    const result = await redis.get('abc123');

    expect(result).toBeNull();
  });

  test('redis.toggle() flips enabled true → false', async () => {
    mockClient.get.mockResolvedValue(
      JSON.stringify({ url: 'https://example.com', createdAt: new Date().toISOString(), enabled: true })
    );
    mockClient.ttl.mockResolvedValue(3600);
    mockClient.set.mockResolvedValue('OK');

    const result = await redis.toggle('abc123');

    expect(result).toBe(false);
  });

  test('redis.toggle() flips enabled false → true', async () => {
    mockClient.get.mockResolvedValue(
      JSON.stringify({ url: 'https://example.com', createdAt: new Date().toISOString(), enabled: false })
    );
    mockClient.ttl.mockResolvedValue(3600);
    mockClient.set.mockResolvedValue('OK');

    const result = await redis.toggle('abc123');

    expect(result).toBe(true);
  });

  test('redis.toggle() returns null when code not found', async () => {
    mockClient.get.mockResolvedValue(null);

    const result = await redis.toggle('notfound');

    expect(result).toBeNull();
  });

  // ── HTTP layer ─────────────────────────────────────────────────────────

  test('PATCH /api/:code/toggle returns 200 with code and enabled fields', async () => {
    mockClient.get.mockResolvedValue(
      JSON.stringify({ url: 'https://example.com', createdAt: new Date().toISOString(), enabled: true })
    );
    mockClient.ttl.mockResolvedValue(3600);
    mockClient.set.mockResolvedValue('OK');

    const res = await request(app).patch('/api/abc123/toggle');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('code', 'abc123');
    expect(res.body).toHaveProperty('enabled', false);
  });

  test('PATCH /api/:code/toggle returns 404 when code not found', async () => {
    mockClient.get.mockResolvedValue(null);

    const res = await request(app).patch('/api/notfound/toggle');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Not found' });
  });

  test('GET /api/urls returns entries with enabled field', async () => {
    mockClient.smembers.mockResolvedValue(['abc123']);
    mockClient.get.mockResolvedValue(
      JSON.stringify({ url: 'https://example.com', createdAt: new Date().toISOString(), enabled: true })
    );

    const res = await request(app).get('/api/urls');

    expect(res.status).toBe(200);
    expect(res.body[0]).toHaveProperty('enabled');
    expect(typeof res.body[0].enabled).toBe('boolean');
  });
});
