import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { AuthResponseDto, UserDto } from '@album-pokemon/shared';
import type { User } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import type { AuthUser } from '../common/auth-user';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    const email = dto.email.toLowerCase();
    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ email }, { username: dto.username }] },
    });
    if (existing) {
      throw new ConflictException(
        existing.email === email ? 'Email is already registered' : 'Username is taken',
      );
    }

    const user = await this.prisma.user.create({
      data: { email, username: dto.username, passwordHash: await bcrypt.hash(dto.password, 10) },
    });
    return this.issueToken(user);
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid email or password');
    }
    return this.issueToken(user);
  }

  async me(userId: string): Promise<UserDto> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    return toUserDto(user);
  }

  private async issueToken(user: User): Promise<AuthResponseDto> {
    const payload: AuthUser = { sub: user.id, username: user.username };
    return { accessToken: await this.jwt.signAsync(payload), user: toUserDto(user) };
  }
}

function toUserDto(user: User): UserDto {
  return { id: user.id, email: user.email, username: user.username };
}
