const request = require('supertest');
const app = require('../src/index');

jest.mock('../src/redis', () => ({
  set: jest.fn().mockResolvedValue(true),
  get: jest.fn().mockResolvedValue('https://example.com'),
}));

describe('Custom Code Feature', () => {
  test('POST with customCode "mylink" returns code "mylink"', async () => {
    const res = await request(app)
      .post('/api/shorten')
      .send({ url: 'https://example.com', customCode: 'mylink' });

    expect(res.status).toBe(200);
    expect(res.body.code).toBe('mylink');
  });

  test('POST without customCode returns auto-generated code', async () => {
    const res = await request(app)
      .post('/api/shorten')
      .send({ url: 'https://example.com' });

    expect(res.status).toBe(200);
    expect(res.body.code).toBeTruthy();
    expect(res.body.code.length).toBeGreaterThan(0);
  });

  test('POST /api/shorten with customCode returns code equal to customCode', async () => {
    const res = await request(app)
      .post('/api/shorten')
      .send({ url: 'https://example.com', customCode: 'mylink' });

    expect(res.status).toBe(200);
    expect(res.body.code).toBe('mylink');
  });

  test('POST with customCode "MyLink" returns code "mylink" (lowercased)', async () => {
    const res = await request(app)
      .post('/api/shorten')
      .send({ url: 'https://example.com', customCode: 'MyLink' });

    expect(res.status).toBe(200);
    expect(res.body.code).toBe('mylink');
  });





});