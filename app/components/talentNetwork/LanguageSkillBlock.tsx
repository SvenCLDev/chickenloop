'use client';

import { OFFICIAL_LANGUAGES } from '@/lib/languages';
import { PROFICIENCY_LABELS } from '@/lib/talentNetwork/constants';
import { LANGUAGE_PROFICIENCIES } from '@/lib/talentNetwork/types';
import type { LanguageSkillFormEntry } from './formTypes';
import { emptyLanguageSkill } from './formTypes';

interface LanguageSkillBlockProps {
  skills: LanguageSkillFormEntry[];
  onChange: (skills: LanguageSkillFormEntry[]) => void;
}

export default function LanguageSkillBlock({ skills, onChange }: LanguageSkillBlockProps) {
  const update = (index: number, patch: Partial<LanguageSkillFormEntry>) => {
    const next = [...skills];
    next[index] = { ...next[index], ...patch };
    onChange(next);
  };

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Language Skills</h2>
        <p className="text-sm text-gray-600 mt-1">
          Specify proficiency levels for teaching and safety briefings with international students.
        </p>
      </div>

      {skills.map((skill, index) => (
        <div key={skill.clientId} className="border border-gray-200 rounded-lg p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-medium text-gray-900">Language {index + 1}</h3>
            {skills.length > 1 && (
              <button
                type="button"
                onClick={() => onChange(skills.filter((_, i) => i !== index))}
                className="text-sm text-red-600 hover:text-red-800"
              >
                Remove
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Language</label>
              <select
                value={skill.language}
                onChange={(e) => update(index, { language: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              >
                <option value="">Select...</option>
                {OFFICIAL_LANGUAGES.map((lang) => (
                  <option key={lang} value={lang}>{lang}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Proficiency</label>
              <select
                value={skill.proficiency}
                onChange={(e) =>
                  update(index, {
                    proficiency: e.target.value as LanguageSkillFormEntry['proficiency'],
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              >
                <option value="">Select...</option>
                {LANGUAGE_PROFICIENCIES.map((level) => (
                  <option key={level} value={level}>{PROFICIENCY_LABELS[level]}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={() => onChange([...skills, emptyLanguageSkill()])}
        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
      >
        + Add language
      </button>
    </section>
  );
}
