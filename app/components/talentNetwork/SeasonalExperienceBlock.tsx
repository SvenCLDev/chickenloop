'use client';

import { useState } from 'react';
import { talentNetworkApi } from '@/lib/api';
import { MONTH_OPTIONS } from '@/lib/talentNetwork/constants';
import { REFERENCE_MANUAL_REMIND_AFTER_MS } from '@/lib/talentNetwork/referenceFollowupConstants';
import ExperienceVerificationBadge from './ExperienceVerificationBadge';
import type { SeasonalExperienceFormEntry } from './formTypes';
import { emptySeasonalExperience } from './formTypes';

interface SeasonalExperienceBlockProps {
  entries: SeasonalExperienceFormEntry[];
  onChange: (entries: SeasonalExperienceFormEntry[]) => void;
  dateRangeErrors?: Record<number, string>;
}

const currentYear = new Date().getFullYear();
const yearOptions = Array.from({ length: 35 }, (_, i) => currentYear - i);

function fieldClass(hasError: boolean): string {
  return hasError
    ? 'w-full px-3 py-2 border border-red-500 rounded-md bg-red-50 ring-1 ring-red-300 focus:outline-none focus:ring-2 focus:ring-red-400'
    : 'w-full px-3 py-2 border border-gray-300 rounded-md';
}

function formatShortDate(value?: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function canManualRemind(entry: SeasonalExperienceFormEntry): boolean {
  if (entry.verificationStatus !== 'reference_requested') return false;
  if (entry.reminderSentAt) return false;
  if (!entry.lastReferenceEmailSentAt) return false;
  const sent = new Date(entry.lastReferenceEmailSentAt).getTime();
  return Date.now() - sent >= REFERENCE_MANUAL_REMIND_AFTER_MS;
}

export default function SeasonalExperienceBlock({
  entries,
  onChange,
  dateRangeErrors = {},
}: SeasonalExperienceBlockProps) {
  const [actionKey, setActionKey] = useState<string | null>(null);
  const [actionError, setActionError] = useState<Record<string, string>>({});
  const [actionInfo, setActionInfo] = useState<Record<string, string>>({});

  const update = (index: number, patch: Partial<SeasonalExperienceFormEntry>) => {
    const next = [...entries];
    next[index] = { ...next[index], ...patch };
    onChange(next);
  };

  const runAction = async (
    index: number,
    action: 'remind' | 'cancel' | 'resend'
  ) => {
    const entry = entries[index];
    if (!entry?.clientId) return;
    setActionError((prev) => ({ ...prev, [entry.clientId]: '' }));
    setActionInfo((prev) => ({ ...prev, [entry.clientId]: '' }));
    setActionKey(`${entry.clientId}:${action}`);
    try {
      const result = (await talentNetworkApi.referenceAction(
        entry.clientId,
        action
      )) as {
        ok?: boolean;
        verificationStatus?: SeasonalExperienceFormEntry['verificationStatus'];
        error?: string;
      };
      const nextStatus = result.verificationStatus ?? entry.verificationStatus;
      update(index, {
        verificationStatus: nextStatus,
        ...(action === 'cancel'
          ? {
              lastReferenceEmailSentAt: undefined,
              reminderSentAt: undefined,
            }
          : {}),
        ...(action === 'remind'
          ? { reminderSentAt: new Date().toISOString() }
          : {}),
        ...(action === 'resend'
          ? {
              lastReferenceEmailSentAt: new Date().toISOString(),
              reminderSentAt: undefined,
              verificationStatus: nextStatus ?? 'reference_requested',
            }
          : {}),
      });
      const messages: Record<typeof action, string> = {
        remind: 'Reminder sent to the manager. We also emailed you.',
        cancel: 'Reference request cancelled.',
        resend: 'New reference request sent.',
      };
      setActionInfo((prev) => ({ ...prev, [entry.clientId]: messages[action] }));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Action failed';
      setActionError((prev) => ({ ...prev, [entry.clientId]: message }));
    } finally {
      setActionKey(null);
    }
  };

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Work Experience</h2>
        <p className="text-sm text-gray-600 mt-1">
          Add your past seasons at watersports schools.{' '}
          <strong className="font-medium text-gray-800">
            Verified work experience stands out to recruiters
          </strong>{' '}
          — we email a former manager a one-click confirmation when you save.
        </p>
      </div>

      {entries.map((entry, index) => {
        const dateError = dateRangeErrors[index];
        const hasDateError = Boolean(dateError);
        const sentLabel = formatShortDate(entry.lastReferenceEmailSentAt);
        const reminderLabel = formatShortDate(entry.reminderSentAt);
        const busy = actionKey?.startsWith(`${entry.clientId}:`);

        return (
          <div
            key={entry.clientId}
            id={`experience-entry-${index}`}
            className={`rounded-lg p-4 space-y-4 ${
              hasDateError
                ? 'border-2 border-red-300 bg-red-50/40'
                : 'border border-gray-200'
            }`}
          >
            <div className="flex flex-wrap justify-between items-center gap-2">
              <h3 className="font-medium text-gray-900">Experience {index + 1}</h3>
              <div className="flex items-center gap-2">
                <ExperienceVerificationBadge
                  status={entry.verificationStatus}
                  referenceEmail={entry.referenceEmail}
                  editForm
                />
                {entries.length > 1 && (
                  <button
                    type="button"
                    onClick={() => onChange(entries.filter((_, i) => i !== index))}
                    className="text-sm text-red-600 hover:text-red-800"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  School / center name
                </label>
                <input
                  type="text"
                  value={entry.schoolName}
                  onChange={(e) => update(index, { schoolName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <input
                  type="text"
                  value={entry.role}
                  onChange={(e) => update(index, { role: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Season tag (optional)
              </label>
              <input
                type="text"
                value={entry.seasonTag}
                onChange={(e) => update(index, { seasonTag: e.target.value })}
                placeholder="e.g. Summer 2024"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <div>
              <p className="block text-sm font-medium text-gray-700 mb-2">Dates</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Start month</label>
                  <select
                    value={entry.startMonth}
                    onChange={(e) =>
                      update(index, {
                        startMonth: e.target.value ? Number(e.target.value) : '',
                      })
                    }
                    className={fieldClass(hasDateError)}
                    aria-invalid={hasDateError}
                    aria-describedby={
                      hasDateError ? `experience-date-error-${index}` : undefined
                    }
                    required
                  >
                    <option value="">Month</option>
                    {MONTH_OPTIONS.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Start year</label>
                  <select
                    value={entry.startYear}
                    onChange={(e) =>
                      update(index, {
                        startYear: e.target.value ? Number(e.target.value) : '',
                      })
                    }
                    className={fieldClass(hasDateError)}
                    aria-invalid={hasDateError}
                    required
                  >
                    <option value="">Year</option>
                    {yearOptions.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">End month</label>
                  <select
                    value={entry.endMonth}
                    onChange={(e) =>
                      update(index, {
                        endMonth: e.target.value ? Number(e.target.value) : '',
                      })
                    }
                    className={fieldClass(hasDateError)}
                    aria-invalid={hasDateError}
                  >
                    <option value="">Month</option>
                    {MONTH_OPTIONS.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">End year</label>
                  <select
                    value={entry.endYear}
                    onChange={(e) =>
                      update(index, {
                        endYear: e.target.value ? Number(e.target.value) : '',
                      })
                    }
                    className={fieldClass(hasDateError)}
                    aria-invalid={hasDateError}
                  >
                    <option value="">Year</option>
                    {yearOptions.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {dateError && (
                <p
                  id={`experience-date-error-${index}`}
                  role="alert"
                  className="mt-2 text-sm text-red-700"
                >
                  {dateError}
                </p>
              )}
            </div>

            <div className="border-t pt-4 space-y-3">
              <p className="text-sm font-medium text-gray-900">Verify with a manager reference</p>
              {entry.verificationStatus === 'reference_email_bounced' && (
                <div
                  className="rounded-lg border border-red-200 bg-red-50 p-4"
                  role="alert"
                >
                  <p className="text-sm font-medium text-red-900">
                    We could not deliver the reference email
                    {entry.referenceEmail?.trim()
                      ? ` to ${entry.referenceEmail.trim()}`
                      : ''}
                    .
                  </p>
                  <p className="text-sm text-red-800 mt-1">
                    Please enter a different manager email below and save your profile so we can
                    send a new verification request.
                  </p>
                </div>
              )}
              {entry.verificationStatus === 'reference_requested' && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-2">
                  <p className="text-sm text-amber-900">
                    {sentLabel
                      ? `Reference email sent ${sentLabel}.`
                      : 'Reference email sent.'}{' '}
                    {reminderLabel
                      ? `Reminder sent ${reminderLabel}.`
                      : 'We automatically remind the manager after 5 days if there is no reply.'}
                  </p>
                  <p className="text-sm text-amber-800">
                    You can change the manager email and save anytime (we send immediately to the new
                    address), send a reminder after 3 days, or cancel the request.
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {canManualRemind(entry) && (
                      <button
                        type="button"
                        disabled={Boolean(busy)}
                        onClick={() => runAction(index, 'remind')}
                        className="text-sm px-3 py-1.5 rounded-md bg-amber-700 text-white hover:bg-amber-800 disabled:opacity-50"
                      >
                        {actionKey === `${entry.clientId}:remind`
                          ? 'Sending…'
                          : 'Send reminder now'}
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={Boolean(busy)}
                      onClick={() => runAction(index, 'cancel')}
                      className="text-sm px-3 py-1.5 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      {actionKey === `${entry.clientId}:cancel`
                        ? 'Cancelling…'
                        : 'Cancel request'}
                    </button>
                  </div>
                </div>
              )}
              {entry.verificationStatus === 'reference_expired' && (
                <div className="rounded-lg border border-gray-300 bg-gray-50 p-4 space-y-2">
                  <p className="text-sm font-medium text-gray-900">
                    This reference request expired with no reply.
                  </p>
                  <p className="text-sm text-gray-700">
                    Change the manager email below and save, or request again with the same email.
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      type="button"
                      disabled={Boolean(busy) || !entry.referenceEmail?.trim()}
                      onClick={() => runAction(index, 'resend')}
                      className="text-sm px-3 py-1.5 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                      {actionKey === `${entry.clientId}:resend`
                        ? 'Sending…'
                        : 'Request again'}
                    </button>
                    <button
                      type="button"
                      disabled={Boolean(busy)}
                      onClick={() => runAction(index, 'cancel')}
                      className="text-sm px-3 py-1.5 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Clear request
                    </button>
                  </div>
                </div>
              )}
              {actionError[entry.clientId] && (
                <p className="text-sm text-red-700" role="alert">
                  {actionError[entry.clientId]}
                </p>
              )}
              {actionInfo[entry.clientId] && (
                <p className="text-sm text-emerald-700">{actionInfo[entry.clientId]}</p>
              )}
              <div className="rounded-lg border border-blue-200 bg-blue-50/60 p-4">
                <p className="text-sm font-medium text-gray-900">Why add a manager email?</p>
                <p className="text-sm text-gray-600 mt-1">
                  Chickenloop emails your manager to confirm you worked there and whether they would
                  rehire you. Verified entries show a <strong>Verified reference</strong> badge on your
                  profile. Unverified entries appear as self-reported only.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Manager email
                  </label>
                  <input
                    type="email"
                    value={entry.referenceEmail}
                    onChange={(e) => update(index, { referenceEmail: e.target.value })}
                    placeholder="manager@school.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Required for verification. We send a one-click confirm link when you save.
                    Changing the email while awaiting a reply sends a new request immediately.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Manager name <span className="font-normal text-gray-500">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={entry.referenceName}
                    onChange={(e) => update(index, { referenceName: e.target.value })}
                    placeholder="Manager name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                  <p className="text-xs text-gray-500 mt-1">Helps personalize the email.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Manager phone <span className="font-normal text-gray-500">(optional)</span>
                  </label>
                  <input
                    type="tel"
                    value={entry.referencePhone}
                    onChange={(e) => update(index, { referencePhone: e.target.value })}
                    placeholder="Manager phone"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              </div>
            </div>
          </div>
        );
      })}

      <button
        type="button"
        onClick={() => onChange([...entries, emptySeasonalExperience()])}
        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
      >
        + Add work experience
      </button>
    </section>
  );
}
