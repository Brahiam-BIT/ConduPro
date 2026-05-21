import type { UserRole } from '../enums/user-role.enum';

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
}
