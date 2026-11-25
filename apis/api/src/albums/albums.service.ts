import { Injectable, NotFoundException } from '@nestjs/common';
import type { AlbumDetailDto, AlbumSummaryDto, Rarity, StickerDto } from '@album-pokemon/shared';
import type { Album } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AlbumsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId?: string): Promise<AlbumSummaryDto[]> {
    const albums = await this.prisma.album.findMany({
      orderBy: { sortOrder: 'asc' },
      include: { _count: { select: { stickers: true } } },
    });

    const ownedByAlbum = new Map<string, number>();
    if (userId) {
      const owned = await this.prisma.userSticker.findMany({
        where: { userId },
        select: { sticker: { select: { albumId: true } } },
      });
      for (const { sticker } of owned) {
        ownedByAlbum.set(sticker.albumId, (ownedByAlbum.get(sticker.albumId) ?? 0) + 1);
      }
    }

    return albums.map((album) =>
      toSummary(album, album._count.stickers, ownedByAlbum.get(album.id) ?? 0),
    );
  }

  async findBySlug(slug: string, userId?: string): Promise<AlbumDetailDto> {
    const album = await this.prisma.album.findUnique({
      where: { slug },
      include: { stickers: { orderBy: { number: 'asc' } } },
    });
    if (!album) throw new NotFoundException(`Album "${slug}" not found`);

    const ownedIds = new Set<string>();
    if (userId) {
      const owned = await this.prisma.userSticker.findMany({
        where: { userId, sticker: { albumId: album.id } },
        select: { stickerId: true },
      });
      owned.forEach(({ stickerId }) => ownedIds.add(stickerId));
    }

    const stickers: StickerDto[] = album.stickers.map((sticker) => ({
      id: sticker.id,
      number: sticker.number,
      pokedexNumber: sticker.pokedexNumber,
      name: sticker.name,
      imageUrl: sticker.imageUrl,
      rarity: sticker.rarity as Rarity,
      owned: ownedIds.has(sticker.id),
    }));

    return { ...toSummary(album, stickers.length, ownedIds.size), stickers };
  }
}

function toSummary(album: Album, totalStickers: number, ownedStickers: number): AlbumSummaryDto {
  return {
    id: album.id,
    slug: album.slug,
    name: album.name,
    region: album.region,
    description: album.description,
    coverImageUrl: album.coverImageUrl,
    totalStickers,
    ownedStickers,
  };
}
