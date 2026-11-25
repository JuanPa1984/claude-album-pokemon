# Frontend (`@album-pokemon/web`)

This is the Next.js 16 web app for Album Pokémon, built with the App Router, React 19 and Tailwind CSS 4. Users browse sticker albums, sign up or log in, and click stickers to mark them owned or not owned. All data comes from the backend API in `apis/api`. For the product overview, see the [root CLAUDE.md](../../CLAUDE.md).

## Commands (run in `apps/web`, or from the root with `pnpm --filter @album-pokemon/web <script>`)

```bash
pnpm dev        # next dev --port 3000 (Turbopack)
pnpm build      # next build
pnpm start      # next start --port 3000
pnpm typecheck  # tsc --noEmit
```

Environment: `.env.local` sets `NEXT_PUBLIC_API_URL`, which defaults to `http://localhost:3001/api`. Because the value is inlined at build time, rebuild after changing it. The API must be running for the pages to load data.

## Layout

```
src/
  app/
    layout.tsx              # <AuthProvider> + <Header> + <main> container; metadata
    globals.css             # Tailwind v4 (@import 'tailwindcss') + @theme brand colours
    page.tsx                # "/"  album list (AlbumCard grid, progress when logged in)
    albums/[slug]/page.tsx  # album detail: progress, All/Owned/Missing filter, search, sticker grid, toggle
    login/page.tsx          # <AuthForm mode="login" />
    register/page.tsx       # <AuthForm mode="register" />
  components/
    header.tsx              # brand + login/signup links or username/logout
    album-card.tsx          # links to /albums/[slug]
    sticker-card.tsx        # button; owned = colour + check, missing = grayscale dashed; rarity badge
    progress-bar.tsx        # uses completionPercent from @album-pokemon/shared
    auth-form.tsx           # shared login/register form
  lib/
    api.ts                  # typed fetch client (api.*), ApiError, tokenStorage
    auth-context.tsx        # AuthProvider / useAuth(): user, loading, login, register, logout
```

The `@/*` import alias maps to `src/*`.

## How it works

- **Rendering is client-side.** Pages that need data are `'use client'` components that fetch in `useEffect` through `api.*`. The JWT lives in `localStorage` under the key `album-pokemon.token`, so server components can't see it. Keep authenticated data fetching on the client unless you change auth to cookies.
- **`lib/api.ts` is the only place that calls `fetch`.** It adds the bearer token, sends JSON, uses `cache: 'no-store'`, and turns non-2xx responses into `ApiError(status, message)`. When Nest returns `message` as an array, the client joins it into one string. To add a new endpoint, add a typed method to the `api` object and use the DTO types from `@album-pokemon/shared`.
- **Auth**: `AuthProvider` checks the stored token on mount with `api.me()` and clears it on a 401. Pages wait until `authLoading` is false before fetching, and re-fetch when `user?.id` changes, so data is personalised after login or logout.
- **Toggling a sticker is optimistic.** `toggleSticker` flips `owned` locally, marks the sticker as pending, calls `api.markOwned` or `api.unmarkOwned`, and reverts the change with an error message if the call fails. The progress count is derived from `album.stickers`, so it updates immediately.
- Anonymous users can browse albums. Sticker buttons are disabled for them, and a banner links to the login page.

## Conventions

- Style with Tailwind utility classes only; there are no CSS modules or UI library. Brand colours are defined in `globals.css` `@theme` and used as `bg-poke-red`, `bg-poke-yellow`, `text-poke-blue` and so on.
- Images are plain `<img>` tags pointing to the PokeAPI sprite URLs that the API returns. `next/image` isn't used, so `next.config.ts` has no `remotePatterns`. If you switch to `next/image`, add `raw.githubusercontent.com` to `remotePatterns`.
- File names are kebab-case and exports are named, for example `export function StickerCard`. Pages use default exports, as Next requires.
- Get route params with `useParams()` in client pages. In server components, `params` is a Promise in Next 16.
- Next 16 notes: Turbopack is the default bundler, and the old `middleware.ts` file is now called `proxy.ts` if you need one. `next build` no longer runs a linter.
- Don't hand-write DTO types here. Import them from `@album-pokemon/shared`, and rebuild that package after changing it.

## Verifying UI changes

Run `pnpm dev` from the repo root, which starts both the API and the web app, then open http://localhost:3000. To check the whole flow, register, open `/albums/kanto`, click a few stickers, reload the page to confirm they stay marked, and use the Owned and Missing filters. `pnpm build` also catches type errors and errors in route generation.
