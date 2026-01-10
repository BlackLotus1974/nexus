'use client';

import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export function Input({
  label,
  error,
  helperText,
  fullWidth = false,
  leftIcon,
  rightIcon,
  className = '',
  id,
  ...props
}: InputProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
  const hasError = !!error;

  const baseInputStyles = 'block rounded-lg border px-4 py-2 text-base transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-0 disabled:opacity-50 disabled:cursor-not-allowed';

  const normalStyles = 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:ring-blue-500';

  const errorStyles = 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-900 dark:text-red-100 focus:border-red-500 focus:ring-red-500';

  const widthStyles = fullWidth ? 'w-full' : '';

  const inputStyles = `${baseInputStyles} ${hasError ? errorStyles : normalStyles} ${widthStyles}`;

  const withIconStyles = leftIcon ? 'pl-10' : rightIcon ? 'pr-10' : '';

  return (
    <div className={fullWidth ? 'w-full' : ''}>
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          {label}
        </label>
      )}

      <div className="relative">
        {leftIcon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            {leftIcon}
          </div>
        )}

        <input
          id={inputId}
          className={`${inputStyles} ${withIconStyles} ${className}`}
          aria-invalid={hasError}
          aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
          {...props}
        />

        {rightIcon && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            {rightIcon}
          </div>
        )}
      </div>

      {error && (
        <p
          id={`${inputId}-error`}
          className="mt-1 text-sm text-red-600 dark:text-red-400"
          role="alert"
        >
          {error}
        </p>
      )}

      {helperText && !error && (
        <p
          id={`${inputId}-helper`}
          className="mt-1 text-sm text-gray-500 dark:text-gray-400"
        >
          {helperText}
        </p>
      )}
    </div>
  );
}
