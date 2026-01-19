'use client';

import { useCallback } from 'react';

interface UrlInputProps {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  id?: string;
  className?: string;
}

/**
 * URL Input Component
 * 
 * Displays a static "https://" prefix with an editable input field for the rest of the URL.
 * Automatically strips protocol prefixes from pasted URLs and normalizes output.
 * 
 * Internal value handling:
 * - Input value represents ONLY the hostname/path part (without protocol)
 * - Strips "http://" or "https://" if user pastes a full URL
 * - Emits full normalized value on change: "https://{value}"
 */
export default function UrlInput({
  label,
  name,
  value,
  onChange,
  placeholder = 'example.com',
  required = false,
  disabled = false,
  id,
  className = '',
}: UrlInputProps) {
  // Extract the hostname/path part from the stored value (remove https:// prefix)
  const getInputValue = useCallback((urlValue: string): string => {
    if (!urlValue || typeof urlValue !== 'string') {
      return '';
    }
    // Remove https:// or http:// prefix
    return urlValue.replace(/^https?:\/\//i, '').trim();
  }, []);

  // Normalize and emit the full URL
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value.trim();
    
    // If empty, emit empty string
    if (!inputValue) {
      onChange('');
      return;
    }

    // Strip any protocol prefixes that user might have typed/pasted
    const withoutProtocol = inputValue.replace(/^(https?:\/\/)?/i, '').trim();
    
    if (!withoutProtocol) {
      onChange('');
      return;
    }

    // Emit full normalized URL
    onChange(`https://${withoutProtocol}`);
  }, [onChange]);

  // Handle paste event to strip protocol if user pastes a full URL
  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLInputElement>) => {
    const pastedText = e.clipboardData.getData('text').trim();
    
    // If pasted text starts with http:// or https://, strip it
    if (/^https?:\/\//i.test(pastedText)) {
      e.preventDefault();
      const withoutProtocol = pastedText.replace(/^https?:\/\//i, '').trim();
      if (withoutProtocol) {
        onChange(`https://${withoutProtocol}`);
      }
    }
  }, [onChange]);

  const inputId = id || name;
  const inputValue = getInputValue(value);

  return (
    <div className="w-full">
      <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div className="flex rounded-md shadow-sm">
        {/* Static https:// prefix */}
        <span
          className="inline-flex items-center px-3 py-2 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-700 text-sm select-none"
          aria-hidden="true"
        >
          https://
        </span>
        {/* Editable input */}
        <input
          type="text"
          id={inputId}
          name={name}
          value={inputValue}
          onChange={handleChange}
          onPaste={handlePaste}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          className={`flex-1 min-w-0 block w-full px-3 py-2 rounded-r-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 disabled:bg-gray-100 disabled:cursor-not-allowed ${className}`}
          aria-label={`${label} (without https:// prefix)`}
        />
      </div>
    </div>
  );
}
