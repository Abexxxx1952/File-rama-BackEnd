import 'fastify';
import { AttachedUserWithRt } from '@/domain/users/auth/types/attached-user-withRt';
import { AttachedUser } from '@/domain/users/auth/types/attachedUser';

declare module 'fastify' {
  interface FastifyRequest {
    user?: AttachedUser | AttachedUserWithRt;
  }
}
