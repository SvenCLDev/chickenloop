'use client';

import React from 'react';
import RichTextLite from './RichTextLite';

export interface JobDescriptionEditorProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  className?: string;
}

/**
 * Job description field: RichTextLite with job-specific defaults.
 */
export default function JobDescriptionEditor({
  id,
  value,
  onChange,
  placeholder = 'Describe the role, responsibilities, and requirements...',
  label = 'Description',
  required = false,
  className = '',
}: JobDescriptionEditorProps) {
  const displayLabel = required ? `${label} *` : label;

  return (
    <RichTextLite
      id={id}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      label={displayLabel}
      className={className}
    />
  );
}
