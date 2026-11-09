import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service.js';
import { generateOpaqueToken, hashToken } from '../../common/auth/token.util.js';
import { TokenType, UserStatus } from '../../common/enums/index.js';

function fixture() {
  const token = generateOpaqueToken();
  const stored = { id: 'token', userId: 'customer', type: TokenType.REFRESH, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + 60_000), revokedAt: null as Date | null };
  const user = { id: 'customer', email: 'customer@example.test', status: UserStatus.ACTIVE };
  const users = { findById: vi.fn().mockResolvedValue(user), getRoleNames: vi.fn().mockResolvedValue(['CUSTOMER']) };
  const jwt = { sign: vi.fn().mockReturnValue('new-access-token'), verify: vi.fn() };
  const repository = { findOne: vi.fn().mockResolvedValue(stored), save: vi.fn(async value => value), create: vi.fn(value => value), update: vi.fn().mockResolvedValue({ affected: 2 }) };
  return { token, stored, user, repository, jwt, service: new AuthService(users as any, jwt as any, new ConfigService(), repository as any) };
}

describe('Opaque refresh tokens for web and mobile sessions', () => {
  it('rotates a legitimate opaque refresh token without attempting JWT verification', async () => {
    const { service, token, stored, repository, jwt } = fixture();
    const result = await service.refresh(token);
    expect(result.accessToken).toBe('new-access-token');
    expect(result.refreshToken).toMatch(/^[a-f0-9]{64}$/);
    expect(result.refreshToken).not.toBe(token);
    expect(stored.revokedAt).toBeInstanceOf(Date);
    expect(repository.findOne).toHaveBeenCalledWith({ where: { tokenHash: hashToken(token), type: TokenType.REFRESH } });
    expect(repository.save).toHaveBeenLastCalledWith(expect.objectContaining({ tokenHash: hashToken(result.refreshToken), type: TokenType.REFRESH }));
    expect(jwt.verify).not.toHaveBeenCalled();
  });

  it('rejects an unknown token', async () => {
    const { service, token, repository } = fixture(); repository.findOne.mockResolvedValue(null);
    await expect(service.refresh(token)).rejects.toThrow(/không hợp lệ/);
  });

  it('rejects an expired token without issuing another session', async () => {
    const { service, token, stored, jwt } = fixture(); stored.expiresAt = new Date(Date.now() - 1000);
    await expect(service.refresh(token)).rejects.toThrow(/hết hạn/);
    expect(jwt.sign).not.toHaveBeenCalled();
  });

  it('revokes sessions when a rotated token is replayed', async () => {
    const { service, token, stored, repository, jwt } = fixture(); stored.revokedAt = new Date();
    await expect(service.refresh(token)).rejects.toThrow(/không còn an toàn/);
    expect(repository.update).toHaveBeenCalled(); expect(jwt.sign).not.toHaveBeenCalled();
  });

  it('does not restore a locked account', async () => {
    const { service, token, user, jwt } = fixture(); user.status = UserStatus.LOCKED;
    await expect(service.refresh(token)).rejects.toThrow(/không khả dụng/);
    expect(jwt.sign).not.toHaveBeenCalled();
  });
});
