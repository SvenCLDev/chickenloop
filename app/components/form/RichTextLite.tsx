'use client';

import React, { useRef, useEffect, useCallback } from 'react';
import { sanitizeRichTextLite } from '@/utils/sanitizeRichTextLite';

export interface RichTextLiteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  id?: string;
  className?: string;
}

/**
 * Reusable minimal rich-text editor using contentEditable.
 * Bold + unordered list buttons; paste sanitized with sanitizeRichTextLite.
 * Emits sanitized HTML only (b, ul, li).
 */
export default function RichTextLite({
  value,
  onChange,
  placeholder = '',
  label,
  id,
  className = '',
}: RichTextLiteProps) {
  const editorRef = useRef<HTMLDivElement>(null);

  const emitRaw = () => {
    const el = editorRef.current;
    if (el) onChange(el.innerHTML);
  };

  // Initialize and sync editable div via innerHTML only (never use JSX value; never escape HTML)
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || '';
    }
  }, [value]);

  // Do not sanitize or rewrite innerHTML during onInput — this breaks caret direction and causes RTL typing bugs in contentEditable.
  const handleInput = () => {
    emitRaw();
  };

  const handleBlur = () => {
    if (!editorRef.current) return;
    const html = editorRef.current.innerHTML;
    onChange(sanitizeRichTextLite(html));
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const html = e.clipboardData?.getData('text/html') ?? '';
    const text = e.clipboardData?.getData('text/plain') ?? '';
    const toInsert = html ? sanitizeRichTextLite(html) : document.createTextNode(text);
    const selection = window.getSelection();
    if (!selection?.rangeCount) return;
    const range = selection.getRangeAt(0);
    range.deleteContents();
    if (typeof toInsert === 'string') {
      const frag = document.createRange().createContextualFragment(toInsert);
      range.insertNode(frag);
    } else {
      range.insertNode(toInsert);
    }
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
    emitRaw();
  };

  const applyBold = () => {
    editorRef.current?.focus();
    document.execCommand('bold', false);
    emitRaw();
  };

  const applyBulletList = () => {
    editorRef.current?.focus();
    document.execCommand('insertUnorderedList', false);
    emitRaw();
  };

  const baseInputClass =
    'w-full min-h-[200px] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 prose prose-sm max-w-none';
  const editorClass = [
    baseInputClass,
    'rounded-t-none',
    'min-h-[180px] outline-none [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:my-2 [&_li]:my-0.5',
    'empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400',
  ].join(' ');

  return (
    <div className={className}>
      {label != null && label !== '' && (
        <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      {/* Toolbar: always visible, not dependent on readOnly, rendered outside the contentEditable div (same as Job form before refactor). */}
      <div className="flex items-center gap-1 p-1 border border-gray-300 border-b-0 rounded-t-md bg-gray-50">
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={applyBold}
          className="p-2 rounded hover:bg-gray-200 text-gray-700 font-bold"
          title="Bold"
          aria-label="Bold"
        >
          B
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={applyBulletList}
          className="p-2 rounded hover:bg-gray-200 text-gray-700 flex items-center justify-center"
          title="Bullet list"
          aria-label="Insert unordered list"
        >
          <svg className="w-4 h-4" viewBox="0 0 20 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <circle cx="4" cy="4" r="1.5" fill="currentColor" />
            <line x1="9" y1="4" x2="18" y2="4" />
            <circle cx="4" cy="8" r="1.5" fill="currentColor" />
            <line x1="9" y1="8" x2="18" y2="8" />
            <circle cx="4" cy="12" r="1.5" fill="currentColor" />
            <line x1="9" y1="12" x2="18" y2="12" />
          </svg>
        </button>
      </div>
      <div
        ref={editorRef}
        id={id}
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder}
        className={editorClass}
        onInput={handleInput}
        onBlur={handleBlur}
        onPaste={handlePaste}
      />
    </div>
  );
}
