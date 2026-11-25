'use client';

import type { AlbumDetailDto, StickerDto } from '@album-pokemon/shared';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { ProgressBar } from '@/components/progress-bar';
import { StickerCard } from '@/components/sticker-card';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

type Filter = 'all' | 'owned' | 'missing';

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'owned', label: 'Owned' },
  { value: 'missing', label: 'Missing' },
];

export default function AlbumPage() {
  const { slug } = useParams<{ slug: string }>();
  const { user, loading: authLoading } = useAuth();
  const [album, setAlbum] = useState<AlbumDetailDto | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [pending, setPending] = useState<ReadonlySet<string>>(new Set());

  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;
    api
      .getAlbum(slug)
      .then((data) => !cancelled && setAlbum(data))
      .catch((err: Error) => !cancelled && setLoadError(err.message));
    return () => {
      cancelled = true;
    };
  }, [slug, authLoading, user?.id]);

  const ownedCount = useMemo(
    () => album?.stickers.filter((sticker) => sticker.owned).length ?? 0,
    [album],
  );

  const visibleStickers = useMemo(() => {
    if (!album) return [];
    const search = query.trim().toLowerCase();
    return album.stickers.filter((sticker) => {
      if (filter === 'owned' && !sticker.owned) return false;
      if (filter === 'missing' && sticker.owned) return false;
      if (!search) return true;
      return sticker.name.toLowerCase().includes(search) || String(sticker.number).includes(search);
    });
  }, [album, filter, query]);

  function setOwned(stickerId: string, owned: boolean) {
    setAlbum(
      (current) =>
        current && {
          ...current,
          stickers: current.stickers.map((s) => (s.id === stickerId ? { ...s, owned } : s)),
        },
    );
  }

  function setStickerPending(stickerId: string, isPending: boolean) {
    setPending((current) => {
      const next = new Set(current);
      if (isPending) next.add(stickerId);
      else next.delete(stickerId);
      return next;
    });
  }

  async function toggleSticker(sticker: StickerDto) {
    if (!user || pending.has(sticker.id)) return;
    const owned = !sticker.owned;

    setActionError(null);
    setOwned(sticker.id, owned); // optimistic
    setStickerPending(sticker.id, true);
    try {
      await (owned ? api.markOwned(sticker.id) : api.unmarkOwned(sticker.id));
    } catch (err) {
      setOwned(sticker.id, !owned);
      setActionError(`Could not update ${sticker.name}: ${(err as Error).message}`);
    } finally {
      setStickerPending(sticker.id, false);
    }
  }

  if (loadError) {
    return (
      <div className="space-y-4">
        <p className="rounded-lg bg-red-50 px-4 py-3 text-red-700">{loadError}</p>
        <Link href="/" className="font-semibold text-poke-blue">
          ← Back to albums
        </Link>
      </div>
    );
  }

  if (!album) return <p className="text-slate-500">Loading album…</p>;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/" className="text-sm font-semibold text-poke-blue">
          ← All albums
        </Link>
        <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-poke-blue">
          {album.region}
        </p>
        <h1 className="text-3xl font-extrabold tracking-tight">{album.name}</h1>
        <p className="mt-1 text-slate-600">{album.description}</p>
      </div>

      {user ? (
        <div className="max-w-md">
          <ProgressBar owned={ownedCount} total={album.stickers.length} />
        </div>
      ) : (
        <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <Link href="/login" className="font-semibold underline">
            Log in
          </Link>{' '}
          to mark the stickers you own.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        {user && (
          <div className="inline-flex rounded-lg border border-slate-300 bg-white p-1">
            {FILTERS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value)}
                className={`rounded-md px-3 py-1 text-sm font-medium ${
                  filter === value ? 'bg-poke-blue text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by name or number"
          className="w-full max-w-xs rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-poke-blue"
        />
      </div>

      {actionError && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{actionError}</p>
      )}

      {visibleStickers.length === 0 ? (
        <p className="text-slate-500">No stickers match.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {visibleStickers.map((sticker) => (
            <StickerCard
              key={sticker.id}
              sticker={sticker}
              interactive={Boolean(user)}
              pending={pending.has(sticker.id)}
              onToggle={toggleSticker}
            />
          ))}
        </div>
      )}
    </div>
  );
}
