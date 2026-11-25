'use client';

import type { AlbumSummaryDto } from '@album-pokemon/shared';
import { useEffect, useState } from 'react';
import { AlbumCard } from '@/components/album-card';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

export default function HomePage() {
  const { user, loading: authLoading } = useAuth();
  const [albums, setAlbums] = useState<AlbumSummaryDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;
    api
      .listAlbums()
      .then((data) => !cancelled && setAlbums(data))
      .catch((err: Error) => !cancelled && setError(err.message));
    return () => {
      cancelled = true;
    };
  }, [authLoading, user?.id]);

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-3xl font-extrabold tracking-tight">Sticker albums</h1>
        <p className="mt-1 text-slate-600">
          {user
            ? 'Pick an album and mark the stickers you already own.'
            : 'Browse the albums. Log in to track which stickers you own.'}
        </p>
      </section>

      {error && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-red-700">
          Could not load albums: {error}. Is the API running?
        </p>
      )}

      {!albums && !error && <p className="text-slate-500">Loading albums…</p>}

      {albums && albums.length === 0 && (
        <p className="text-slate-500">No albums yet. Run the database seed to add some.</p>
      )}

      {albums && albums.length > 0 && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {albums.map((album) => (
            <AlbumCard key={album.id} album={album} showProgress={Boolean(user)} />
          ))}
        </div>
      )}
    </div>
  );
}
