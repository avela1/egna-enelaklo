import { cn } from '@/lib/cn';
import { LogoMark } from './LogoMark';
import { Wordmark } from './Wordmark';

export interface BrandProps {
  className?: string;
  markSize?: number;
  showAmharic?: boolean;
}

/** Logo mark + wordmark, used in every layout header and on the auth pages. */
export function Brand({ className, markSize = 40, showAmharic = true }: BrandProps) {
  return (
    <span className={cn('flex items-center gap-3', className)}>
      <LogoMark size={markSize} />
      <Wordmark showAmharic={showAmharic} />
    </span>
  );
}
