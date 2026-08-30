'use client';

import { useState } from 'react';

type FilterCollapsibleSectionProps = {
  title: string;
  defaultOpen?: boolean;
  activeCount?: number;
  children: React.ReactNode;
};

export default function FilterCollapsibleSection({
  title,
  defaultOpen = false,
  activeCount = 0,
  children,
}: FilterCollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen || activeCount > 0);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 py-1 text-left"
      >
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          {title}
          {activeCount > 0 && !open && (
            <span className="ml-1 normal-case font-medium text-blue-600">· {activeCount}</span>
          )}
        </span>
        <span className="text-gray-400 text-sm" aria-hidden="true">
          {open ? '▾' : '▸'}
        </span>
      </button>
      {open && <div className="mt-3 space-y-3">{children}</div>}
    </div>
  );
}
