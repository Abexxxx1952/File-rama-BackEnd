import { RegistrationSources } from '@/domain/users/auth/types/providers-oauth.enum';
import {
  UsersPermissions,
  UsersPermissionsKeys,
} from '@/domain/users/permissions/users-permissions';
import { User } from '@/domain/users/types/users';

export class UserFactory {
  private static sequence = 0;

  static create(overrides?: Partial<User>): User {
    this.sequence += 1;
    const id = `user-${this.sequence}`;

    return {
      id: id as any,
      name: `Test User ${this.sequence}`,
      email: `user-${this.sequence}@example.com`,
      password: 'password',
      icon: `https://example.com/avatar-${this.sequence}.png`,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-02T00:00:00.000Z'),
      payloads: [],
      googleServiceAccounts: [],
      permissions: ['CreateFile'],
      registrationSources: [RegistrationSources.Local],
      isVerified: true,
      isTwoFactorEnabled: false,
      ...overrides,
    };
  }

  static createMany(count: number, overrides?: Partial<User>): User[] {
    return Array.from({ length: count }, () => this.create(overrides));
  }

  static createUnverified(overrides?: Partial<User>): User {
    return this.create({
      isVerified: false,
      ...overrides,
    });
  }

  static createAdmin(overrides?: Partial<User>): User {
    return this.create({
      permissions: Object.keys(UsersPermissions) as UsersPermissionsKeys[],
      ...overrides,
    });
  }
}
