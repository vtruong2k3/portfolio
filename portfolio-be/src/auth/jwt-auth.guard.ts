import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Apply this guard to any route that requires a valid JWT (Req 14.5, 14.6).
 * Returns 401 if no token, malformed, or expired.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
