/**
 * Contracts shared by the API (NestJS) and the web app (Next.js).
 */

export const RARITIES = ['COMMON', 'RARE', 'LEGENDARY'] as const;
export type Rarity = (typeof RARITIES)[number];

export interface UserDto {
  id: string;
  email: string;
  username: string;
}

export interface AuthResponseDto {
  accessToken: string;
  user: UserDto;
}

export interface StickerDto {
  id: string;
  /** Position of the sticker inside its album (1-based). */
  number: number;
  /** National Pokédex number. */
  pokedexNumber: number;
  name: string;
  imageUrl: string;
  rarity: Rarity;
  /** Whether the current user owns it. Always false for anonymous requests. */
  owned: boolean;
}

export interface AlbumSummaryDto {
  id: string;
  slug: string;
  name: string;
  region: string;
  description: string;
  coverImageUrl: string;
  totalStickers: number;
  /** Stickers owned by the current user. 0 for anonymous requests. */
  ownedStickers: number;
}

export interface AlbumDetailDto extends AlbumSummaryDto {
  stickers: StickerDto[];
}

export interface CollectionUpdateDto {
  stickerId: string;
  owned: boolean;
}

export function completionPercent(owned: number, total: number): number {
  return total === 0 ? 0 : Math.round((owned / total) * 100);
}
