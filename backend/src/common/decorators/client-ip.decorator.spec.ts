import { resolveClientIp } from './client-ip.decorator';

const railway = { CLIENT_IP_HEADER: 'x-real-ip' } as NodeJS.ProcessEnv;

describe('resolveClientIp', () => {
  it('sin CLIENT_IP_HEADER usa req.ip (desarrollo)', () => {
    expect(
      resolveClientIp(
        { ip: '10.0.0.5', headers: { 'x-real-ip': '1.2.3.4' } },
        {} as NodeJS.ProcessEnv,
      ),
    ).toBe('10.0.0.5');
  });

  it('en Railway usa X-Real-IP y no la IP del salto del CDN', () => {
    expect(
      resolveClientIp(
        { ip: '152.233.1.9', headers: { 'x-real-ip': '181.49.20.7' } },
        railway,
      ),
    ).toBe('181.49.20.7');
    expect(
      resolveClientIp(
        { ip: '152.233.1.9', headers: { 'x-real-ip': '2800:e2:1::5' } },
        railway,
      ),
    ).toBe('2800:e2:1::5');
  });

  it('toma el primer valor si llegan varios', () => {
    expect(
      resolveClientIp(
        { ip: 'x', headers: { 'x-real-ip': ['181.49.20.7', '9.9.9.9'] } },
        railway,
      ),
    ).toBe('181.49.20.7');
  });

  it('ignora valores vacíos o que no parecen una IP', () => {
    for (const value of ['', 'hola<script>', 'a'.repeat(60)]) {
      expect(
        resolveClientIp({ ip: '10.0.0.5', headers: { 'x-real-ip': value } }, railway),
      ).toBe('10.0.0.5');
    }
    expect(resolveClientIp({ ip: undefined, headers: {} }, railway)).toBe('desconocida');
  });
});
