import type { AlbumSummaryDto } from '@album-pokemon/shared';
import Link from 'next/link';
import { ProgressBar } from './progress-bar';

export function AlbumCard({
  album,
  showProgress,
}: {
  album: AlbumSummaryDto;
  showProgress: boolean;
}) {
  return (
    <Link
      href={`/albums/${album.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex h-44 items-center justify-center bg-gradient-to-br from-poke-yellow/40 to-poke-blue/30">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={album.coverImageUrl}
          alt=""
          className="h-36 w-36 object-contain drop-shadow-lg transition group-hover:scale-105"
        />
      </div>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-poke-blue">
            {album.region}
          </p>
          <h2 className="text-lg font-bold">{album.name}</h2>
          <p className="mt-1 text-sm text-slate-600">{album.description}</p>
        </div>
        <div className="mt-auto">
          {showProgress ? (
            <ProgressBar owned={album.ownedStickers} total={album.totalStickers} />
          ) : (
            <p className="text-sm text-slate-500">{album.totalStickers} stickers</p>
          )}
        </div>
      </div>
    </Link>
  );
}
