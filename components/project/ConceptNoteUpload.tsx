'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';

export interface ConceptNoteUploadProps {
  value: string;
  onChange: (content: string) => void;
  onFileSelect?: (file: File) => void;
  disabled?: boolean;
  maxFileSize?: number; // in bytes
  acceptedTypes?: string[];
  className?: string;
}

const DEFAULT_MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const DEFAULT_ACCEPTED_TYPES = [
  'text/plain',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

export function ConceptNoteUpload({
  value,
  onChange,
  onFileSelect,
  disabled = false,
  maxFileSize = DEFAULT_MAX_FILE_SIZE,
  acceptedTypes = DEFAULT_ACCEPTED_TYPES,
  className = '',
}: ConceptNoteUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = useCallback(
    (file: File): string | null => {
      if (!acceptedTypes.includes(file.type)) {
        return 'File type not supported. Please upload a .txt, .pdf, .doc, or .docx file.';
      }
      if (file.size > maxFileSize) {
        const maxSizeMB = maxFileSize / (1024 * 1024);
        return `File is too large. Maximum size is ${maxSizeMB}MB.`;
      }
      return null;
    },
    [acceptedTypes, maxFileSize]
  );

  const processFile = useCallback(
    async (file: File) => {
      setError(null);
      setIsProcessing(true);

      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        setIsProcessing(false);
        return;
      }

      try {
        // For text files, read content directly
        if (file.type === 'text/plain') {
          const text = await file.text();
          onChange(text);
          setUploadedFileName(file.name);
        } else {
          // For other file types, we'd typically send to a backend service
          // For now, we'll just notify about the file and let the parent handle it
          if (onFileSelect) {
            onFileSelect(file);
          }
          setUploadedFileName(file.name);
          // Show a message that PDF/Word processing would happen server-side
          setError(
            'PDF and Word documents require server-side processing. ' +
              'For now, please paste the concept note text directly.'
          );
        }
      } catch (err) {
        setError('Failed to read file. Please try again or paste the text directly.');
      } finally {
        setIsProcessing(false);
      }
    },
    [onChange, onFileSelect, validateFile]
  );

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (disabled) return;

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        processFile(files[0]);
      }
    },
    [disabled, processFile]
  );

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        processFile(files[0]);
      }
      // Reset input so the same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [processFile]
  );

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const handleClear = () => {
    onChange('');
    setUploadedFileName(null);
    setError(null);
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
    if (uploadedFileName) {
      setUploadedFileName(null);
    }
  };

  return (
    <div className={className}>
      {error && (
        <Alert variant="warning" onClose={() => setError(null)} className="mb-4">
          {error}
        </Alert>
      )}

      {/* Drag and drop zone */}
      <div
        className={`
          relative border-2 border-dashed rounded-lg p-6 transition-colors
          ${isDragging ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-600'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={!disabled ? handleBrowseClick : undefined}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.pdf,.doc,.docx"
          onChange={handleFileInputChange}
          disabled={disabled}
          className="hidden"
        />

        <div className="text-center">
          <svg
            className={`mx-auto h-12 w-12 ${isDragging ? 'text-blue-500' : 'text-gray-400'}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>

          {isProcessing ? (
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Processing file...</p>
          ) : uploadedFileName ? (
            <div className="mt-2">
              <p className="text-sm font-medium text-green-600 dark:text-green-400">
                Uploaded: {uploadedFileName}
              </p>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  handleClear();
                }}
                className="mt-1"
              >
                Remove
              </Button>
            </div>
          ) : (
            <>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                <span className="font-medium text-blue-600 dark:text-blue-400">
                  Click to upload
                </span>{' '}
                or drag and drop
              </p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                TXT, PDF, DOC, DOCX up to {maxFileSize / (1024 * 1024)}MB
              </p>
            </>
          )}
        </div>
      </div>

      {/* Text input area */}
      <div className="mt-4">
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Or paste your concept note directly
          </label>
          {value && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {value.length.toLocaleString()} characters
            </span>
          )}
        </div>
        <textarea
          value={value}
          onChange={handleTextChange}
          disabled={disabled}
          rows={10}
          placeholder="Paste your concept note content here..."
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed resize-y font-mono text-sm"
        />
      </div>
    </div>
  );
}

export default ConceptNoteUpload;
