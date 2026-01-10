'use client';

import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  padding?: boolean;
  hover?: boolean;
}

export interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export interface CardBodyProps {
  children: React.ReactNode;
  className?: string;
}

export interface CardFooterProps {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className = '', padding = true, hover = false, ...props }: CardProps) {
  const baseStyles = 'bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm';
  const paddingStyles = padding ? 'p-6' : '';
  const hoverStyles = hover ? 'transition-shadow duration-200 hover:shadow-md' : '';

  return (
    <div className={`${baseStyles} ${paddingStyles} ${hoverStyles} ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '' }: CardHeaderProps) {
  return (
    <div className={`border-b border-gray-200 dark:border-gray-700 pb-4 mb-4 ${className}`}>
      {children}
    </div>
  );
}

export function CardBody({ children, className = '' }: CardBodyProps) {
  return (
    <div className={className}>
      {children}
    </div>
  );
}

export function CardFooter({ children, className = '' }: CardFooterProps) {
  return (
    <div className={`border-t border-gray-200 dark:border-gray-700 pt-4 mt-4 ${className}`}>
      {children}
    </div>
  );
}
