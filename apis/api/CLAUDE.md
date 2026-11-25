# Backend API (`@album-pokemon/api`)

This is the NestJS 11 REST API for Album Pokémon. It owns the users, the album and sticker catalogue, and each user's collection (which stickers they own). It stores data in SQLite through Prisma 6 and authenticates requests with stateless JWT bearer tokens. For the product overview, see the [root CLAUDE.md](../../CLAUDE.md).

## Commands (run in `apis/api`, or from the root with `pnpm --filter @album-pokemon/api <script>`)

```bash
pnpm dev              # nest start --watch  ->  http://localhost:3001/api
pnpm build            # nest build (uses tsconfig.build.json; only src/ is compiled) -> dist/main.js
pnpm start            # node dist/main
pnpm typecheck        # tsc --noEmit (covers src/ and prisma/*.ts)
pnpm db:generate      # prisma generate  (needed after schema changes)
pnpm db:migrate       # prisma migrate dev  (creates and applies a migration)
pnpm db:setup         # migrate dev --name init + seed
pnpm db:seed          # tsx prisma/seed.ts (idempotent)
pnpm db:studio        # Prisma Studio
```

Environment variables go in `.env`, which `@nestjs/config` and Prisma both read from this folder:

- `DATABASE_URL`, default `file:./dev.db`, a path relative to `prisma/`
- `JWT_SECRET`, which is required: startup throws without it
- `PORT`, default 3001
- `WEB_ORIGIN`, the CORS origin, default `http://localhost:3000`

## Layout

```
src/
  main.ts                 # bootstrap: global prefix 'api', CORS, ValidationPipe (whitelist + forbidNonWhitelisted + transform)
  app.module.ts           # ConfigModule (global), JwtModule (global, expiresIn 7d), feature modules
  health.controller.ts    # GET /api/health
  prisma/                 # PrismaModule (@Global) + PrismaService (extends PrismaClient)
  common/
    auth-user.ts          # JWT payload type: { sub: userId, username }
    jwt-auth.guard.ts     # JwtAuthGuard (401 without valid token) + OptionalJwtAuthGuard (attaches user if present)
    current-user.decorator.ts  # @CurrentUser() -> AuthUser | undefined
  auth/                   # register / login / me; DTOs in auth/dto with class-validator
  albums/                 # public catalogue, enriched with the user's progress when a token is sent
  collection/             # mark / unmark owned stickers (auth required)
prisma/
  schema.prisma           # User, Album, Sticker, UserSticker
  migrations/             # committed migrations (first one: *_init)
  pokemon-data.ts         # album definitions, Pokémon names, rarity table, sprite URL helper
  seed.ts                 # upserts albums + stickers
```

## Endpoints

All routes are under `/api`.

| Method | Route                             | Guard                  | Returns                                                                                             |
| ------ | --------------------------------- | ---------------------- | --------------------------------------------------------------------------------------------------- |
| POST   | `/auth/register`                  | –                      | `AuthResponseDto`. 409 if the email or username is taken                                            |
| POST   | `/auth/login`                     | –                      | `AuthResponseDto`, with status 200. 401 on bad credentials                                          |
| GET    | `/auth/me`                        | `JwtAuthGuard`         | `UserDto`                                                                                           |
| GET    | `/albums`                         | `OptionalJwtAuthGuard` | `AlbumSummaryDto[]`. `ownedStickers` is 0 for anonymous requests                                    |
| GET    | `/albums/:slug`                   | `OptionalJwtAuthGuard` | `AlbumDetailDto`, with stickers ordered by `number`, each carrying `owned`. 404 for an unknown slug |
| PUT    | `/collection/stickers/:stickerId` | `JwtAuthGuard`         | `CollectionUpdateDto` with `owned: true`. Idempotent upsert; 404 if the sticker doesn't exist       |
| DELETE | `/collection/stickers/:stickerId` | `JwtAuthGuard`         | `CollectionUpdateDto` with `owned: false`. Idempotent `deleteMany`                                  |
| GET    | `/health`                         | –                      | `{ status: 'ok' }`                                                                                  |

## Conventions and rules

- **Response types come from `@album-pokemon/shared`.** Services return those DTOs, and mapping happens in the service (see `toSummary` and `toUserDto`). Never return Prisma entities directly, because `passwordHash` must never leave the API.
- Request bodies are class-validator DTO classes in `<module>/dto/`. Because of `forbidNonWhitelisted`, unknown fields are rejected with 400. The compiler setting `strictPropertyInitialization` is off for Nest, so DTO fields don't need `!`.
- To add a feature, create a module folder with `*.module.ts`, `*.controller.ts` and `*.service.ts`, and register the module in `app.module.ts`. `PrismaService` and `JwtService` are global, so feature modules don't need to import anything to use them.
- Protect routes with `@UseGuards(JwtAuthGuard)` and read the user with `@CurrentUser() user: AuthUser`. The user id is `user.sub`. Use `OptionalJwtAuthGuard` for public routes that give a personalised response when the caller is logged in.
- Throw Nest HTTP exceptions (`NotFoundException`, `ConflictException`, `UnauthorizedException`); the web client shows their `message` to the user.
- Emails are lower-cased before they are stored or looked up. Passwords are hashed with `bcryptjs` at cost 10.
- Import interfaces with `import type` in decorated signatures (controllers), as the existing code does.

## Database

- SQLite has no native enums, so `Sticker.rarity` is a `String`. Validate it and cast it to the shared `Rarity` type.
- To change the schema, edit `prisma/schema.prisma`, run `pnpm db:migrate --name <change>`, and commit the new folder under `prisma/migrations/`. Prisma regenerates the client automatically. Never edit a migration that has already been applied.
- Deleting a user or an album cascades to its `UserSticker` rows (and, for an album, to its `Sticker` rows).
- `prisma/dev.db` is gitignored local data. To reset it, run `pnpm exec prisma migrate reset`, which also re-seeds.
- To add an album, append an entry to `ALBUMS` in `prisma/pokemon-data.ts`, giving its slug, region, cover Pokédex number, first Pokédex number and the list of names. Add special rarities to the `LEGENDARY` and `RARE` sets, then run `pnpm db:seed`.

## Testing manually

```bash
curl localhost:3001/api/health
curl -X POST localhost:3001/api/auth/register -H 'Content-Type: application/json' \
  -d '{"email":"ash@example.com","username":"ash","password":"pikachu123"}'
curl localhost:3001/api/albums -H "Authorization: Bearer <token>"
```

There is no automated test suite yet. If you add one, use Jest with `@nestjs/testing`, which is the Nest default.
