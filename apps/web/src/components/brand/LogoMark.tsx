import { cn } from '@/lib/cn';

export interface LogoMarkProps {
  className?: string;
  /** Pixel size of the square mark. */
  size?: number;
}

/**
 * The egna-enelaklo mark: a teal rounded square with a white check and two
 * light "speed" lines behind it. The check is the finished errand, the lines
 * are movement.
 */
export function LogoMark({ className, size = 48 }: LogoMarkProps) {
  return (
    <svg
      role="img"
      aria-label="egna-enelaklo"
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('shrink-0', className)}
    >
      <rect width="48" height="48" rx="13" fill="#0E7C7B" />
      <path
        d="M12 25l8 8 16-18"
        stroke="#FFFFFF"
        strokeWidth={5}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path d="M7 38h12" stroke="#BFE3E1" strokeWidth={3} strokeLinecap="round" fill="none" />
      <path d="M10 43h8" stroke="#BFE3E1" strokeWidth={3} strokeLinecap="round" fill="none" />
    </svg>
  );
}
