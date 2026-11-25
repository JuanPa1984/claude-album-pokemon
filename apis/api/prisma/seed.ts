import { PrismaClient } from '@prisma/client';
import { ALBUMS, rarityFor, spriteUrl } from './pokemon-data';

const prisma = new PrismaClient();

/** Idempotent: re-running updates albums/stickers in place and keeps users' collections. */
async function main() {
  for (const [sortOrder, album] of ALBUMS.entries()) {
    const data = {
      name: album.name,
      region: album.region,
      description: album.description,
      coverImageUrl: spriteUrl(album.coverPokedexNumber),
      sortOrder,
    };
    const saved = await prisma.album.upsert({
      where: { slug: album.slug },
      update: data,
      create: { slug: album.slug, ...data },
    });

    await prisma.$transaction(
      album.pokemon.map((name, index) => {
        const number = index + 1;
        const pokedexNumber = album.firstPokedexNumber + index;
        const sticker = {
          pokedexNumber,
          name,
          imageUrl: spriteUrl(pokedexNumber),
          rarity: rarityFor(pokedexNumber),
        };
        return prisma.sticker.upsert({
          where: { albumId_number: { albumId: saved.id, number } },
          update: sticker,
          create: { albumId: saved.id, number, ...sticker },
        });
      }),
    );

    console.log(`Seeded album "${album.name}" with ${album.pokemon.length} stickers`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
