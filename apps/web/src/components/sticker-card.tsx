import type { Rarity, StickerDto } from '@album-pokemon/shared';

const RARITY_STYLES: Record<Rarity, string> = {
  COMMON: 'bg-slate-100 text-slate-600',
  RARE: 'bg-sky-100 text-sky-700',
  LEGENDARY: 'bg-amber-100 text-amber-700',
};

interface StickerCardProps {
  sticker: StickerDto;
  interactive: boolean;
  pending: boolean;
  onToggle: (sticker: StickerDto) => void;
}

export function StickerCard({ sticker, interactive, pending, onToggle }: StickerCardProps) {
  const number = String(sticker.number).padStart(3, '0');

  return (
    <button
      type="button"
      onClick={() => onToggle(sticker)}
      disabled={!interactive || pending}
      aria-pressed={sticker.owned}
      title={
        interactive ? (sticker.owned ? 'Click to unmark' : 'Click to mark as owned') : undefined
      }
      className={[
        'relative flex flex-col items-center rounded-xl border-2 p-3 text-left transition',
        sticker.owned
          ? 'border-poke-blue bg-white shadow-sm'
          : 'border-dashed border-slate-300 bg-slate-100',
        interactive ? 'cursor-pointer hover:-translate-y-0.5 hover:shadow-md' : 'cursor-default',
        pending ? 'opacity-60' : '',
      ].join(' ')}
    >
      <span className="absolute left-2 top-2 font-mono text-xs font-semibold text-slate-500">
        #{number}
      </span>
      {sticker.owned && (
        <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-poke-blue text-xs text-white">
          ✓
        </span>
      )}

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={sticker.imageUrl}
        alt={sticker.name}
        loading="lazy"
        className={[
          'mt-4 h-24 w-24 object-contain transition',
          sticker.owned ? '' : 'opacity-30 grayscale',
        ].join(' ')}
      />

      <span className="mt-2 w-full truncate text-center text-sm font-semibold">{sticker.name}</span>
      <span
        className={`mt-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${RARITY_STYLES[sticker.rarity]}`}
      >
        {sticker.rarity.toLowerCase()}
      </span>
    </button>
  );
}
