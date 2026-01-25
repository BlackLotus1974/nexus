'use client';

import { cn } from '@/lib/utils';

interface AlignmentScoreProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

/**
 * Alignment Score Component
 *
 * Displays a visual alignment score indicator with color-coded levels.
 */
export function AlignmentScore({
  score,
  size = 'md',
  showLabel = true,
  className,
}: AlignmentScoreProps) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return { bg: 'bg-green-100', text: 'text-green-700', ring: 'ring-green-500' };
    if (score >= 60) return { bg: 'bg-yellow-100', text: 'text-yellow-700', ring: 'ring-yellow-500' };
    if (score >= 40) return { bg: 'bg-orange-100', text: 'text-orange-700', ring: 'ring-orange-500' };
    return { bg: 'bg-red-100', text: 'text-red-700', ring: 'ring-red-500' };
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Low';
  };

  const sizeClasses = {
    sm: 'w-10 h-10 text-sm',
    md: 'w-14 h-14 text-base',
    lg: 'w-20 h-20 text-xl',
  };

  const colors = getScoreColor(score);

  return (
    <div className={cn('flex flex-col items-center gap-1', className)}>
      <div
        className={cn(
          'rounded-full flex items-center justify-center font-bold ring-2',
          sizeClasses[size],
          colors.bg,
          colors.text,
          colors.ring
        )}
      >
        {score}%
      </div>
      {showLabel && (
        <span className={cn('text-xs font-medium', colors.text)}>
          {getScoreLabel(score)}
        </span>
      )}
    </div>
  );
}
