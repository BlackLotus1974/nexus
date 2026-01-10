'use client';

import React from 'react';

export interface SkeletonProps {
  className?: string;
  width?: string;
  height?: string;
  variant?: 'text' | 'rectangular' | 'circular';
}

export function Skeleton({
  className = '',
  width,
  height,
  variant = 'rectangular'
}: SkeletonProps) {
  const baseStyles = 'animate-pulse bg-gray-200 dark:bg-gray-700';

  const variantStyles = {
    text: 'rounded h-4',
    rectangular: 'rounded-lg',
    circular: 'rounded-full',
  };

  const style = {
    width: width || undefined,
    height: height || undefined,
  };

  return (
    <div
      className={`${baseStyles} ${variantStyles[variant]} ${className}`}
      style={style}
    />
  );
}

export function SkeletonText({ lines = 3, className = '' }: { lines?: number; className?: string }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          variant="text"
          width={i === lines - 1 ? '70%' : '100%'}
        />
      ))}
    </div>
  );
}
