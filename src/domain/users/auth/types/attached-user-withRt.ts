import { AttachedUser } from './attachedUser';

export type AttachedUserWithRt = AttachedUser & { refreshToken: string };
