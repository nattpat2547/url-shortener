const request = require('supertest');
const app = require('../src/index');

jest.mock('../src/redis', () => ({
  set: jest.fn().mockResolvedValue(true),
  get: jest.fn().mockResolvedValue('https://example.com'),
  list: jest.fn().mockResolvedValue([]),
  del: jest.fn().mockResolvedValue(1),
  incrementClick: jest.fn().mockResolvedValue(1),
}));

const redis = require('../src/redis');

describe('URL Shortener API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    redis.get.mockResolvedValue('https://example.com');
  });

  // --- basic tests (pass on main) ---

  test('POST /api/shorten with valid URL returns 200 with code and short fields', async () => {
    const res = await request(app)
      .post('/api/shorten')
      .send({ url: 'https://example.com' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('code');
    expect(res.body).toHaveProperty('short');
  });

  test('POST /api/shorten with invalid URL returns 400', async () => {
    const res = await request(app)
      .post('/api/shorten')
      .send({ url: 'not-a-url' });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Invalid URL' });
  });

  test('GET /:code when found returns 302', async () => {
    const res = await request(app).get('/abc123');

    expect(res.status).toBe(302);
  });

  test('GET /:code when not found returns 404', async () => {
    redis.get.mockResolvedValueOnce(null);

    const res = await request(app).get('/notfound');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Not found' });
  });

  test('GET /api/health returns 200 with status ok', async () => {
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

});
