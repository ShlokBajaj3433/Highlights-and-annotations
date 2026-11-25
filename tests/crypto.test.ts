import { deterministicColor, generateInviteCode, generateWorkspaceSecret } from '@shared/crypto';
import { describe, expect, it } from 'vitest';

describe('Crypto utilities', () => {
  describe('deterministicColor', () => {
    it('generates consistent color for same userId', () => {
      const color1 = deterministicColor('user-123');
      const color2 = deterministicColor('user-123');
      expect(color1).toBe(color2);
    });

    it('generates different colors for different userIds', () => {
      const color1 = deterministicColor('user-1');
      const color2 = deterministicColor('user-2');
      expect(color1).not.toBe(color2);
    });

    it('returns valid HSL color', () => {
      const color = deterministicColor('test');
      expect(color).toMatch(/^hsl\(\d+,\s*\d+%,\s*\d+%\)$/);
    });
  });

  describe('generateInviteCode', () => {
    it('generates 12-character code', async () => {
      const code = await generateInviteCode();
      expect(code).toHaveLength(12);
    });

    it('uses alphanumeric characters', async () => {
      const code = await generateInviteCode();
      expect(code).toMatch(/^[A-Za-z0-9]{12}$/);
    });

    it('generates different codes each time', async () => {
      const code1 = await generateInviteCode();
      const code2 = await generateInviteCode();
      expect(code1).not.toBe(code2);
    });
  });

  describe('generateWorkspaceSecret', () => {
    it('generates 43-character base64url string', async () => {
      const secret = await generateWorkspaceSecret();
      expect(secret).toHaveLength(43);
    });

    it('uses base64url alphabet', async () => {
      const secret = await generateWorkspaceSecret();
      expect(secret).toMatch(/^[A-Za-z0-9_-]{43}$/);
    });

    it('generates different secrets each time', async () => {
      const secret1 = await generateWorkspaceSecret();
      const secret2 = await generateWorkspaceSecret();
      expect(secret1).not.toBe(secret2);
    });
  });
});
