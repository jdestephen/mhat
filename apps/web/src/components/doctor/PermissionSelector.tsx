'use client';

import { useCallback, useMemo } from 'react';
import { Check, Eye, Pencil } from 'lucide-react';

/**
 * Permission groups map readable labels to their READ/WRITE permission keys.
 * Mirrors backend AssistantPermission enum.
 */
const PERMISSION_GROUPS = [
  {
    key: 'patient_info',
    label: 'Información de Pacientes',
    read: 'PATIENT_INFO_READ',
    write: 'PATIENT_INFO_WRITE',
  },
  {
    key: 'health_history',
    label: 'Historial de Salud',
    read: 'HEALTH_HISTORY_READ',
    write: 'HEALTH_HISTORY_WRITE',
  },
  {
    key: 'vital_signs',
    label: 'Signos Vitales',
    read: 'VITAL_SIGNS_READ',
    write: 'VITAL_SIGNS_WRITE',
  },
  {
    key: 'records',
    label: 'Registros Médicos',
    read: 'RECORDS_READ',
    write: 'RECORDS_WRITE',
  },
  {
    key: 'documents',
    label: 'Documentos',
    read: 'DOCUMENTS_READ',
    write: 'DOCUMENTS_WRITE',
  },
] as const;

type AccessLevel = 'none' | 'read' | 'write';

interface PermissionSelectorProps {
  value: string[];
  onChange: (permissions: string[]) => void;
  disabled?: boolean;
}

/** Determines the access level for a group given the current permission list. */
function getLevel(permissions: string[], read: string, write: string): AccessLevel {
  if (permissions.includes(write)) return 'write';
  if (permissions.includes(read)) return 'read';
  return 'none';
}

export function PermissionSelector({ value, onChange, disabled }: PermissionSelectorProps) {
  const levels = useMemo(() => {
    return PERMISSION_GROUPS.map((g) => ({
      ...g,
      level: getLevel(value, g.read, g.write),
    }));
  }, [value]);

  const handleToggle = useCallback(
    (group: typeof PERMISSION_GROUPS[number], current: AccessLevel) => {
      if (disabled) return;

      // Cycle: none → read → write → none
      const next: AccessLevel =
        current === 'none' ? 'read' : current === 'read' ? 'write' : 'none';

      const updated = value.filter((p) => p !== group.read && p !== group.write);
      if (next === 'read') updated.push(group.read);
      if (next === 'write') {
        updated.push(group.read, group.write);
      }
      onChange(updated);
    },
    [value, onChange, disabled],
  );

  return (
    <div className="space-y-2">
      <p className="text-sm text-gray-500 mb-3">
        Haz clic en cada permiso para cambiar el nivel de acceso
      </p>
      {levels.map(({ key, label, level, read, write }) => (
        <button
          key={key}
          type="button"
          disabled={disabled}
          onClick={() =>
            handleToggle(
              PERMISSION_GROUPS.find((g) => g.key === key)!,
              level,
            )
          }
          className={`
            w-full flex items-center justify-between gap-3 px-4 py-3
            rounded-lg border transition-all text-left
            ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:shadow-sm'}
            ${level === 'none'
              ? 'border-gray-200 bg-gray-50 text-gray-400'
              : level === 'read'
                ? 'border-blue-200 bg-blue-50 text-blue-800'
                : 'border-emerald-200 bg-emerald-50 text-emerald-800'
            }
          `}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-5 h-5 rounded flex items-center justify-center text-xs
                ${level === 'none'
                  ? 'bg-gray-200 text-gray-400'
                  : level === 'read'
                    ? 'bg-blue-200 text-blue-700'
                    : 'bg-emerald-200 text-emerald-700'
                }
              `}
            >
              {level !== 'none' && <Check className="w-3.5 h-3.5" />}
            </div>
            <span className="text-sm font-medium">{label}</span>
          </div>
          <div className="flex items-center gap-1.5">
            {level === 'none' && (
              <span className="text-xs text-gray-400 font-medium">Sin acceso</span>
            )}
            {level === 'read' && (
              <span className="flex items-center gap-1 text-xs text-blue-600 font-medium">
                <Eye className="w-3.5 h-3.5" />
                Solo lectura
              </span>
            )}
            {level === 'write' && (
              <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                <Pencil className="w-3.5 h-3.5" />
                Lectura / Escritura
              </span>
            )}
          </div>
        </button>
      ))}
    </div>
  );
}

/** Renders a read-only view of permissions as compact badges. */
export function PermissionBadges({ permissions }: { permissions: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {PERMISSION_GROUPS.map((group) => {
        const level = getLevel(permissions, group.read, group.write);
        if (level === 'none') return null;
        return (
          <span
            key={group.key}
            className={`
              inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium
              ${level === 'read'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-emerald-100 text-emerald-700'
              }
            `}
          >
            {level === 'read' ? (
              <Eye className="w-3 h-3" />
            ) : (
              <Pencil className="w-3 h-3" />
            )}
            {group.label}
          </span>
        );
      })}
    </div>
  );
}
