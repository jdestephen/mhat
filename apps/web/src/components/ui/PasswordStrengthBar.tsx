'use client';

import React from 'react';

interface PasswordStrengthBarProps {
  password: string;
}

interface Rule {
  label: string;
  test: (pw: string) => boolean;
}

const RULES: Rule[] = [
  { label: 'Al menos 8 caracteres', test: (pw) => pw.length >= 8 },
  { label: 'Una letra mayúscula', test: (pw) => /[A-Z]/.test(pw) },
  { label: 'Una letra minúscula', test: (pw) => /[a-z]/.test(pw) },
  { label: 'Un número', test: (pw) => /[0-9]/.test(pw) },
];

function getStrength(password: string): number {
  if (!password) return 0;
  return RULES.filter((r) => r.test(password)).length;
}

const STRENGTH_CONFIG = [
  { label: '', color: 'bg-slate-200', textColor: 'text-slate-400' },
  { label: 'Muy débil', color: 'bg-red-500', textColor: 'text-red-600' },
  { label: 'Débil', color: 'bg-orange-500', textColor: 'text-orange-600' },
  { label: 'Aceptable', color: 'bg-amber-500', textColor: 'text-amber-600' },
  { label: 'Buena', color: 'bg-emerald-500', textColor: 'text-emerald-600' },
];

export function PasswordStrengthBar({ password }: PasswordStrengthBarProps) {
  const strength = getStrength(password);
  const config = STRENGTH_CONFIG[strength];

  if (!password) return null;

  return (
    <div className="mt-2 space-y-2">
      {/* Strength bar */}
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((level) => (
          <div
            key={level}
            className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
              strength >= level ? config.color : 'bg-slate-200'
            }`}
          />
        ))}
      </div>

      {/* Label */}
      <div className="flex items-center justify-between">
        <span className={`text-xs font-medium ${config.textColor}`}>
          {config.label}
        </span>
      </div>

      {/* Rules checklist */}
      <ul className="space-y-0.5">
        {RULES.map((rule) => {
          const passed = rule.test(password);
          return (
            <li
              key={rule.label}
              className={`flex items-center gap-1.5 text-xs transition-colors ${
                passed ? 'text-emerald-600' : 'text-slate-400'
              }`}
            >
              {passed ? (
                <svg className="h-3 w-3 flex-shrink-0" viewBox="0 0 12 12" fill="currentColor">
                  <path d="M10.28 2.28a.75.75 0 0 1 0 1.06l-5.5 5.5a.75.75 0 0 1-1.06 0l-2.5-2.5a.75.75 0 1 1 1.06-1.06L4.25 7.22l4.97-4.94a.75.75 0 0 1 1.06 0Z" />
                </svg>
              ) : (
                <svg className="h-3 w-3 flex-shrink-0" viewBox="0 0 12 12" fill="currentColor">
                  <circle cx="6" cy="6" r="2.5" />
                </svg>
              )}
              {rule.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Utility: returns true if password meets all strength rules */
export function isPasswordStrong(password: string): boolean {
  return RULES.every((r) => r.test(password));
}
