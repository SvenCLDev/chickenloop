'use client';

import React, { useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { sanitizeJobDescription } from '@/lib/sanitizeJobDescription';

export interface JobDescriptionEditorProps {
  id: string;
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
  'aria-label'?: string;
}

/**
 * Minimal TipTap editor for job descriptions.
 * Only Bold and Unordered list; output is sanitized (p, strong, b, ul, li, br).
 */
export default function JobDescriptionEditor({
  id,
  value,
  onChange,
  placeholder = 'Describe the role, responsibilities, and requirements...',
  required = false,
  className = '',
  'aria-label': ariaLabel = 'Job description',
}: JobDescriptionEditorProps) {
  const lastEmittedRef = useRef<string>(value);
  const isInternalChangeRef = useRef(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        blockquote: false,
        horizontalRule: false,
        italic: false,
        orderedList: false,
        strike: false,
      }),
    ],
    content: sanitizeJobDescription(value || ''),
    editorProps: {
      attributes: {
        'aria-label': ariaLabel,
        'aria-required': required ? 'true' : undefined,
        'data-placeholder': placeholder,
      },
      handlePaste: (view, event) => {
        event.preventDefault();
        const text = event.clipboardData?.getData('text/plain') ?? '';
        const { state } = view;
        const tr = state.tr.insertText(text, state.selection.from, state.selection.to);
        view.dispatch(tr);
        return true;
      },
    },
    onUpdate: ({ editor }) => {
      const raw = editor.getHTML();
      const sanitized = sanitizeJobDescription(raw);
      lastEmittedRef.current = sanitized;
      isInternalChangeRef.current = true;
      onChange(sanitized);
    },
  });

  // Sync from prop when value is set externally (e.g. load job for edit)
  useEffect(() => {
    if (!editor) return;
    const sanitized = sanitizeJobDescription(value || '');
    if (sanitized !== lastEmittedRef.current && !isInternalChangeRef.current) {
      editor.commands.setContent(sanitized, false);
      lastEmittedRef.current = sanitized;
    }
    isInternalChangeRef.current = false;
  }, [value, editor]);

  const baseInputClass =
    'w-full min-h-[200px] px-3 py-2 border border-gray-300 rounded-md focus-within:outline-none focus-within:ring-2 focus-within:ring-blue-500 text-gray-900 prose prose-sm max-w-none';

  if (!editor) {
    return (
      <div className={className}>
        <div className="flex items-center gap-1 p-1 border border-gray-300 border-b-0 rounded-t-md bg-gray-50">
          <span className="p-2 text-gray-400">B</span>
          <span className="p-2 text-gray-400">•</span>
        </div>
        <div className={`${baseInputClass} rounded-t-none animate-pulse bg-gray-50`} />
      </div>
    );
  }

  const editorWrapperClass = [
    'tiptap-editor-wrapper relative',
    baseInputClass,
    'rounded-t-none',
    '[&_.tiptap]:min-h-[180px] [&_.tiptap]:outline-none',
    '[&_.tiptap_ul]:list-disc [&_.tiptap_ul]:pl-6 [&_.tiptap_ul]:my-2',
    '[&_.tiptap_li]:my-0.5',
    '[&_.tiptap_p]:my-1',
    '[&:has(.tiptap_.is-empty:first-child:only-child)]::before:content-[attr(data-placeholder)]',
    '[&:has(.tiptap_.is-empty:first-child:only-child)]::before:text-gray-400',
    '[&:has(.tiptap_.is-empty:first-child:only-child)]::before:absolute',
    '[&:has(.tiptap_.is-empty:first-child:only-child)]::before:left-3',
    '[&:has(.tiptap_.is-empty:first-child:only-child)]::before:top-2',
    '[&:has(.tiptap_.is-empty:first-child:only-child)]::before:pointer-events-none',
  ].join(' ');

  return (
    <div className={className}>
      <div className="flex items-center gap-1 p-1 border border-gray-300 border-b-0 rounded-t-md bg-gray-50">
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-2 rounded hover:bg-gray-200 text-gray-700 font-bold ${editor.isActive('bold') ? 'bg-gray-200' : ''}`}
          title="Bold"
          aria-label="Bold"
        >
          B
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-2 rounded hover:bg-gray-200 text-gray-700 flex items-center justify-center ${editor.isActive('bulletList') ? 'bg-gray-200' : ''}`}
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
      <div className={editorWrapperClass} data-placeholder={placeholder}>
        <EditorContent editor={editor} id={id} />
      </div>
    </div>
  );
}
