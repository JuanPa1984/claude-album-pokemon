import { completionPercent } from '@album-pokemon/shared';

export function ProgressBar({ owned, total }: { owned: number; total: number }) {
  const percent = completionPercent(owned, total);
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs font-medium text-slate-600">
        <span>
          {owned} / {total} stickers
        </span>
        <span>{percent}%</span>
      </div>
      <div
        className="h-2.5 overflow-hidden rounded-full bg-slate-200"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
      >
        <div
          className="h-full rounded-full bg-poke-blue transition-[width] duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
