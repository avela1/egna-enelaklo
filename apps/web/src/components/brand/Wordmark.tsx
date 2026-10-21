import { cn } from '@/lib/cn';

export interface WordmarkProps {
  className?: string;
  /** The Amharic name sits under the Latin name. */
  showAmharic?: boolean;
}

/** The egna-enelaklo wordmark: Sora 700 for the Latin name, Noto Sans Ethiopic for እኛ እንላከሎ. */
export function Wordmark({ className, showAmharic = true }: WordmarkProps) {
  return (
    <span className={cn('flex flex-col justify-center leading-none', className)}>
      <span className="font-heading text-[20px] font-bold tracking-tight text-ink-900">
        egna-enelaklo
      </span>
      {showAmharic ? (
        <span className="font-ethiopic mt-1 text-[15px] font-semibold text-brand-500">
          እኛ እንላከሎ
        </span>
      ) : null}
    </span>
  );
}
