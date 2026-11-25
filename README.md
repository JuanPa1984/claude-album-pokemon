# Album Pokémon

A platform for collecting Pokémon stickers. Browse sticker albums, sign up, and mark the stickers you own to track how complete each album is.

Turborepo monorepo managed with pnpm workspaces (`apps/*` for frontends, `apis/*` for backend APIs, `packages/*` for shared code):

| Path                         | What it is                                                           |
| ---------------------------- | -------------------------------------------------------------------- |
| `apis/api`                   | NestJS 11 REST API with Prisma, SQLite and JWT auth (port 3001)      |
| `apps/web`                   | Next.js 16 (App Router) with React 19 and Tailwind CSS 4 (port 3000) |
| `packages/shared`            | DTO types shared by the API and the web app                          |
| `packages/typescript-config` | Shared `tsconfig` presets                                            |

## Requirements

- Node.js **20.9 or newer** (22 LTS recommended)
- pnpm 12 (`npm install -g pnpm@12.23.0`)

## Getting started

```bash
pnpm install

# environment files
cp apis/api/.env.example apis/api/.env     # then set JWT_SECRET
cp apps/web/.env.example apps/web/.env.local

# create the SQLite database and seed the Kanto (151) and Johto (100) albums
pnpm db:setup

# run the API and the web app together
pnpm dev
```

Then open http://localhost:3000.

## Scripts (from the repo root)

| Command          | Description                                                     |
| ---------------- | --------------------------------------------------------------- |
| `pnpm dev`       | Starts every app in watch mode with Turborepo                   |
| `pnpm build`     | Builds all packages and apps, in dependency order               |
| `pnpm typecheck` | Type-checks every workspace                                     |
| `pnpm db:setup`  | Applies Prisma migrations and seeds the database                |
| `pnpm db:seed`   | Re-runs the seed. It is idempotent and keeps users' collections |

To run something in one workspace, use `pnpm turbo run dev --filter=@album-pokemon/api` (or `@album-pokemon/web`).

## API

All routes are prefixed with `/api`. Protected routes need `Authorization: Bearer <token>`.

| Method   | Route                             | Auth     | Description                                                  |
| -------- | --------------------------------- | -------- | ------------------------------------------------------------ |
| `POST`   | `/auth/register`                  | –        | `{ email, username, password }` returns a token and the user |
| `POST`   | `/auth/login`                     | –        | `{ email, password }` returns a token and the user           |
| `GET`    | `/auth/me`                        | required | The current user                                             |
| `GET`    | `/albums`                         | optional | Albums, with your owned count when you are signed in         |
| `GET`    | `/albums/:slug`                   | optional | Album with its stickers, each with an `owned` flag           |
| `PUT`    | `/collection/stickers/:stickerId` | required | Mark a sticker as owned (idempotent)                         |
| `DELETE` | `/collection/stickers/:stickerId` | required | Unmark a sticker (idempotent)                                |
| `GET`    | `/health`                         | –        | Health check                                                 |

## Data model

- **User**: an account (email, username, bcrypt password hash).
- **Album**: a themed set of stickers (for example, Kanto).
- **Sticker**: one slot in an album: number, Pokédex number, name, artwork and rarity (`COMMON`, `RARE` or `LEGENDARY`).
- **UserSticker**: a user owns a sticker. Its composite primary key is `(userId, stickerId)`.

To add an album, add an entry to `apis/api/prisma/pokemon-data.ts` and run `pnpm db:seed`.

Sticker artwork is loaded from the [PokeAPI sprites](https://github.com/PokeAPI/sprites) repository.
Pokémon and Pokémon character names are trademarks of Nintendo, Game Freak and Creatures Inc. This is an unofficial fan project.
