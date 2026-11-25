# Album Pokémon

An application for collecting albums of Pokémon stickers. The platform offers a catalogue of **albums** (for example Kanto with 151 stickers, Johto with 100), and each album is a numbered set of Pokémon **stickers**. Users sign up and **mark the stickers they own**, and the app tracks how complete each album is.

## Development

When you need install software use context7 mcp

## Workspaces

This is a single Turborepo monorepo (Turborepo 2.11, **pnpm 12 workspaces**). The backend and the frontend are workspaces in it, not separate repositories. `pnpm-workspace.yaml` declares three workspace groups:

| Group        | Glob         | Holds                                         | Rule                                                                                                       |
| ------------ | ------------ | --------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| **Apps**     | `apps/*`     | Frontend applications users open in a browser | New UIs go here. They may depend on `packages/*`, never on an `apis/*` workspace (talk to APIs over HTTP). |
| **APIs**     | `apis/*`     | Backend services                              | New backend services go here. They may depend on `packages/*`, never on an `apps/*` workspace.             |
| **Packages** | `packages/*` | Shared libraries and config                   | Must not depend on anything in `apps/*` or `apis/*`.                                                       |

Current workspaces:

| Part            | Path                              | Stack                                           | Port                 | Details                                  |
| --------------- | --------------------------------- | ----------------------------------------------- | -------------------- | ---------------------------------------- |
| **Backend API** | `apis/api` (`@album-pokemon/api`) | NestJS 11, Prisma 6, SQLite, JWT                | 3001 (`/api` prefix) | [apis/api/CLAUDE.md](apis/api/CLAUDE.md) |
| **Frontend**    | `apps/web` (`@album-pokemon/web`) | Next.js 16 App Router, React 19, Tailwind CSS 4 | 3000                 | [apps/web/CLAUDE.md](apps/web/CLAUDE.md) |

Adding a workspace: create the folder under the right group with a `package.json` named `@album-pokemon/<name>`, give it the standard scripts (`dev`, `build`, `typecheck`, and `start` if it runs) so Turborepo picks it up, extend a preset from `@album-pokemon/typescript-config`, then run `pnpm install` from the root.

Internal dependencies use the pnpm workspace protocol, e.g. `"@album-pokemon/shared": "workspace:*"`. pnpm's `node_modules` is strict: a workspace can only import packages listed in its own `package.json`, so add dependencies with `pnpm --filter <workspace> add <pkg>` instead of relying on hoisting.

Supporting packages:

- `packages/shared` (`@album-pokemon/shared`) holds the **API contract**: the DTO types (`UserDto`, `AuthResponseDto`, `AlbumSummaryDto`, `AlbumDetailDto`, `StickerDto`, `CollectionUpdateDto`, `Rarity`) and the helper `completionPercent`. It compiles with `tsc` to CommonJS in `dist/`, and both apps consume the built output.
- `packages/typescript-config` holds the tsconfig presets `base.json`, `nestjs.json` and `nextjs.json`.

How the parts talk to each other: the web app calls the API over HTTP with `fetch`, and sends `Authorization: Bearer <jwt>` once the user is logged in. The API allows CORS requests from `WEB_ORIGIN`.

## Domain model

- **User**: an account with email, username and a bcrypt password hash.
- **Album**: has a `slug`, `name`, `region`, `description`, `coverImageUrl` and `sortOrder`.
- **Sticker**: belongs to an album. It has a `number` (its 1-based position in the album), `pokedexNumber`, `name`, `imageUrl` and `rarity`, which is `COMMON`, `RARE` or `LEGENDARY`. `number` is unique within an album.
- **UserSticker**: means "a user owns a sticker". Its primary key is `(userId, stickerId)`. A sticker is owned when this row exists; quantities and duplicates aren't modelled.

## Commands (run from the repo root)

```bash
pnpm install
pnpm dev             # turbo: builds shared, generates the Prisma client, starts api + web in watch mode
pnpm build           # builds everything in dependency order
pnpm typecheck       # tsc --noEmit in every workspace
pnpm db:setup        # prisma migrate dev + seed (first-time setup)
pnpm db:seed         # re-runs the seed (idempotent; keeps users' collections)
pnpm turbo run dev --filter=@album-pokemon/api    # run one task in one workspace (with its dependencies)
pnpm turbo run build --filter="./apis/*"          # run a task for a whole group
pnpm --filter @album-pokemon/web add <pkg>        # add a dependency to one workspace
```

First-time setup needs the env files: copy `apis/api/.env.example` to `apis/api/.env` and set `JWT_SECRET`, then copy `apps/web/.env.example` to `apps/web/.env.local`.

## Turborepo pipeline (`turbo.json`)

- `build`, `dev` and `typecheck` depend on `^build`, so `packages/shared` must be built before either app can import it. They also depend on `db:generate`, which runs `prisma generate` and exists only in the API.
- After changing `packages/shared`, rebuild it or keep its `dev` watcher running. Otherwise the apps keep seeing the old types.

## Conventions

- **Any change to the API contract goes into `packages/shared` first.** Then update the API service that produces the data and the web code that consumes it. Don't define DTO types twice.
- TypeScript is strict everywhere. Formatting is Prettier with single quotes, trailing commas and a 100-character line width (`pnpm format`). There is no ESLint and there is no test suite yet.
- Keep the seed idempotent, with upserts by `slug` and `(albumId, number)`, so that re-running it never wipes users' collections.

## Environment gotchas

- **Node 20.9 or newer** is required: Next 16, Nest 11 and Prisma 6 all need it. The machine currently runs Node 26, which no longer ships Corepack, so pnpm is installed globally with `npm install -g pnpm@12.23.0`. The root `package.json` pins it in `packageManager`; keep the global pnpm in sync when bumping it.
- pnpm blocks dependency build scripts unless they're allowed. `pnpm-workspace.yaml` has an `allowBuilds` list for `prisma`, `@prisma/client`, `@prisma/engines` and `esbuild`. When a new dependency needs its install script, run `pnpm install --allow-build=<pkg>`, which records it there; without these, Prisma's engines and `tsx` break.
- Use only pnpm. Don't run `npm install` in the repo: it would create a `package-lock.json` and a conflicting `node_modules` layout. The lockfile is `pnpm-lock.yaml`.
- On Windows, stopping `pnpm dev` from a parent process can leave `next` and `node dist/main` running and holding ports 3000 and 3001. Look for `node.exe` processes whose command line contains `album-pokemon`.
- Sticker artwork is loaded at runtime from the PokeAPI sprites repository on raw.githubusercontent.com. This is an unofficial fan project.
