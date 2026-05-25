import { MailerService } from '@nestjs-modules/mailer';

/**
 * Mock Mailer Service for testing
 */
export const mockMailerService: Partial<MailerService> = {
  sendMail: jest.fn().mockResolvedValue({ messageId: 'test-message-id' }),
};

/**
 * Provider for mock Mailer Service
 */
export const MockMailerServiceProvider = {
  provide: MailerService,
  useValue: mockMailerService,
};

/**
 * Reset all mailer service mocks
 */
export function resetMailerMocks(): void {
  jest.clearAllMocks();
}
