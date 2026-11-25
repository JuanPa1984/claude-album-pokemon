import { Injectable, NotFoundException } from '@nestjs/common';
import type { CollectionUpdateDto } from '@album-pokemon/shared';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CollectionService {
  constructor(private readonly prisma: PrismaService) {}

  async markOwned(userId: string, stickerId: string): Promise<CollectionUpdateDto> {
    const sticker = await this.prisma.sticker.findUnique({
      where: { id: stickerId },
      select: { id: true },
    });
    if (!sticker) throw new NotFoundException(`Sticker "${stickerId}" not found`);

    await this.prisma.userSticker.upsert({
      where: { userId_stickerId: { userId, stickerId } },
      update: {},
      create: { userId, stickerId },
    });
    return { stickerId, owned: true };
  }

  async unmarkOwned(userId: string, stickerId: string): Promise<CollectionUpdateDto> {
    await this.prisma.userSticker.deleteMany({ where: { userId, stickerId } });
    return { stickerId, owned: false };
  }
}
