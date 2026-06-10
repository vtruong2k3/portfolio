import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  /**
   * POST /admin/login — Returns JWT iff credentials match the single admin (Req 14.1, 14.2, Property 13).
   */
  async login(
    email: string,
    password: string,
  ): Promise<{ accessToken: string }> {
    const admin = await this.prisma.admin.findUnique({ where: { email } });

    if (!admin) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(password, admin.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    const payload = { sub: admin.id, email: admin.email };
    return { accessToken: this.jwt.sign(payload) };
  }

  /**
   * Called by JwtStrategy.validate — returns admin or throws 401 (Req 14.5).
   */
  async validateAdmin(id: string) {
    const admin = await this.prisma.admin.findUnique({ where: { id } });
    if (!admin) throw new UnauthorizedException();
    return admin;
  }
}
