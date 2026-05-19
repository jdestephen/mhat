'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ChevronDown,
  ClipboardList,
  Activity,
  Mail,
  Phone,
  MapPin,
  IdCard,
  Droplets,
  Calendar,
} from 'lucide-react';

import { PatientAccess, AccessLevel } from '@/types';
import { computeAge } from '@/lib/dateUtils';

/* ─── Sex-based avatar SVGs ─── */

function MaleAvatar({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Head */}
      <circle cx="18" cy="12" r="6" fill="currentColor" opacity="0.85" />
      {/* Body */}
      <path
        d="M8 30c0-5.523 4.477-10 10-10s10 4.477 10 10"
        stroke="currentColor"
        strokeWidth="2"
        fill="currentColor"
        opacity="0.55"
      />
      {/* Short hair */}
      <path
        d="M12 11c0-3.314 2.686-6 6-6s6 2.686 6 6"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
        opacity="0.95"
      />
    </svg>
  );
}

function FemaleAvatar({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Head */}
      <circle cx="18" cy="12" r="6" fill="currentColor" opacity="0.85" />
      {/* Body */}
      <path
        d="M8 30c0-5.523 4.477-10 10-10s10 4.477 10 10"
        stroke="currentColor"
        strokeWidth="2"
        fill="currentColor"
        opacity="0.55"
      />
      {/* Long hair */}
      <path
        d="M11 12c0-3.866 3.134-7 7-7s7 3.134 7 7c0 1-0.5 2-1 3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
        opacity="0.95"
      />
      <path
        d="M11 12c-0.5 2-0.5 5 0 8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
        opacity="0.7"
      />
      <path
        d="M25 12c0.5 2 0.5 5 0 8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
        opacity="0.7"
      />
    </svg>
  );
}

function DefaultAvatar({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <circle cx="18" cy="12" r="6" fill="currentColor" opacity="0.85" />
      <path
        d="M8 30c0-5.523 4.477-10 10-10s10 4.477 10 10"
        stroke="currentColor"
        strokeWidth="2"
        fill="currentColor"
        opacity="0.55"
      />
    </svg>
  );
}

/* ─── Helpers ─── */

function getInitials(first: string, last: string): string {
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
}

function SexAvatar({
  sex,
  size = 'md',
}: {
  sex?: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10 lg:w-14 lg:h-14',
    lg: 'w-14 h-14',
  };
  const iconSizes = {
    sm: 'w-5 h-5',
    md: 'w-6 h-6 lg:w-8 lg:h-8',
    lg: 'w-8 h-8',
  };

  const AvatarIcon =
    sex === 'MASCULINO'
      ? MaleAvatar
      : sex === 'FEMENINO'
        ? FemaleAvatar
        : DefaultAvatar;

  return (
    <div
      className={`${sizeClasses[size]} rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0`}
    >
      <AvatarIcon className={`${iconSizes[size]} text-emerald-600`} />
    </div>
  );
}

function AccessBadge({ level }: { level: AccessLevel }) {
  if (level === AccessLevel.READ_ONLY) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700">
        Solo lectura
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700">
      Escritura
    </span>
  );
}

function AccountBadge({ hasAccount }: { hasAccount: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
        hasAccount
          ? 'bg-emerald-50 text-emerald-600'
          : 'bg-gray-100 text-gray-500'
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          hasAccount ? 'bg-emerald-500' : 'bg-gray-400'
        }`}
      />
      {hasAccount ? 'Cuenta activa' : 'Sin cuenta'}
    </span>
  );
}

/* ─── Detail Field ─── */

function DetailField({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string | undefined | null;
}) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-2 min-w-0">
      <Icon className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
      <div className="min-w-0">
        <p className="text-[10px] text-gray-400 uppercase tracking-wider leading-none mb-0.5">
          {label}
        </p>
        <p className="text-sm text-gray-800 truncate">{value}</p>
      </div>
    </div>
  );
}

/* ─── Quick Links (for extended view) ─── */

function QuickLinks({ patientId }: { patientId: string }) {
  return (
    <div className="flex items-center gap-2">
      <Link
        href={`/doctor/patients/${patientId}/health-history`}
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-purple-700 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
        target='_blank'
      >
        <ClipboardList className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Historial de Salud</span>
      </Link>
      <Link
        href={`/doctor/patients/${patientId}`}
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-rose-700 bg-rose-50 rounded-lg hover:bg-rose-100 transition-colors"
        target='_blank'
      >
        <Activity className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Registros</span>
      </Link>
    </div>
  );
}

/* ─── Detail Grid (shared between compact expand panel and extended view) ─── */

function PatientDetailGrid({ patient, variant = 'compact' }: { patient: PatientAccess, variant?: 'compact' | 'extended' }) {
  const age = computeAge(patient.date_of_birth);

  return (
    <div className={`grid grid-cols-2 sm:grid-cols-3 ${variant === 'compact' ? 'lg:grid-cols-2' : 'lg:grid-cols-4'} gap-x-6 gap-y-3`}>
      <DetailField
        icon={Calendar}
        label="Edad"
        value={age ?? undefined}
      />
      <DetailField
        icon={Droplets}
        label="Tipo de sangre"
        value={patient.blood_type}
      />
      <DetailField icon={IdCard} label="DNI" value={patient.dni} />
      <DetailField icon={Mail} label="Email" value={patient.email} />
      <DetailField icon={Phone} label="Teléfono" value={patient.phone} />
      <DetailField icon={MapPin} label="Dirección" value={patient.address} />
      {/* <div className="flex items-center gap-2">
        <AccessBadge level={patient.access_level} />
        <AccountBadge hasAccount={patient.has_account} />
      </div> */}
    </div>
  );
}

/* ─── Main Component ─── */

interface PatientInfoBannerProps {
  patient: PatientAccess;
  /** 'compact' = small header row with expandable panel, 'extended' = full detail card */
  variant?: 'compact' | 'extended';
  /** For extended variant: horizontal row vs vertical column layout */
  layout?: 'row' | 'column';
  /** For extended variant: make it collapsible */
  collapsible?: boolean;
  /** Start collapsed (only applies when collapsible=true) */
  defaultCollapsed?: boolean;
}

export function PatientInfoBanner({
  patient,
  variant = 'compact',
  layout = 'row',
  collapsible = false,
  defaultCollapsed = false,
}: PatientInfoBannerProps) {
  if (variant === 'compact') {
    return <CompactBanner patient={patient} />;
  }
  return (
    <ExtendedBanner
      patient={patient}
      layout={layout}
      collapsible={collapsible}
      defaultCollapsed={defaultCollapsed}
    />
  );
}

/* ─── Compact Banner ─── */

function CompactBanner({ patient }: { patient: PatientAccess }) {
  const [expanded, setExpanded] = useState(false);
  const age = computeAge(patient.date_of_birth);

  const subtitle = [
    age ?? null,
    patient.sex === 'MASCULINO'
      ? 'Masculino'
      : patient.sex === 'FEMENINO'
        ? 'Femenino'
        : null,
    patient.blood_type ? `🩸 ${patient.blood_type}` : null,
  ]
    .filter(Boolean)
    .join(' • ');

  return (
    <div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <SexAvatar sex={patient.sex} />
          <div>
            <h1 className="text-lg lg:text-xl font-bold text-gray-900">
              {patient.first_name} {patient.last_name}
            </h1>
            {subtitle && (
              <p className="text-gray-500 text-xs lg:text-sm">{subtitle}</p>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="p-1.5 rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer"
          aria-label={expanded ? 'Ocultar detalles' : 'Ver más detalles'}
          aria-expanded={expanded}
        >
          <ChevronDown
            className={`w-4 h-4 transition-transform duration-200 ${
              expanded ? 'rotate-180' : ''
            }`}
          />
        </button>
      </div>

      {/* Expandable detail panel */}
      <div
        className={`overflow-hidden transition-all duration-200 ease-in-out ${
          expanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="mt-3 pt-3 border-t border-gray-100 bg-white px-2 py-2 rounded-b-lg">
          <PatientDetailGrid patient={patient} variant="compact" />
        </div>
      </div>
    </div>
  );
}

/* ─── Extended Banner ─── */

function ExtendedBanner({
  patient,
  layout,
  collapsible,
  defaultCollapsed,
}: {
  patient: PatientAccess;
  layout: 'row' | 'column';
  collapsible: boolean;
  defaultCollapsed: boolean;
}) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const initials = getInitials(patient.first_name, patient.last_name);
  const age = computeAge(patient.date_of_birth);

  const subtitle = [
    age ?? null,
    patient.sex === 'MASCULINO'
      ? 'Masculino'
      : patient.sex === 'FEMENINO'
        ? 'Femenino'
        : null,
    patient.blood_type ? `🩸 ${patient.blood_type}` : null,
    patient.dni ?? '',
  ]
    .filter(Boolean)
    .join(' • ');

  const headerContent = (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <SexAvatar sex={patient.sex} size="md" />
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg font-bold text-gray-900">
              {patient.first_name} {patient.last_name}
            </h2>
          </div>
          {subtitle && (
            <p className="text-gray-500 text-xs">{subtitle}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <QuickLinks patientId={patient.patient_id} />
        {collapsible && (
          <button
            type="button"
            onClick={() => setCollapsed((prev) => !prev)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer"
            aria-label={collapsed ? 'Mostrar detalles' : 'Ocultar detalles'}
            aria-expanded={!collapsed}
          >
            <ChevronDown
              className={`w-4 h-4 transition-transform duration-200 ${
                collapsed ? '' : 'rotate-180'
              }`}
            />
          </button>
        )}
      </div>
    </div>
  );

  const detailContent = (
    <div
      className={
        layout === 'column'
          ? 'flex flex-col gap-3'
          : ''
      }
    >
      <PatientDetailGrid patient={patient} variant={'extended'} />
    </div>
  );

  if (collapsible) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
        {headerContent}
        <div
          className={`overflow-hidden transition-all duration-200 ease-in-out ${
            collapsed ? 'max-h-0 opacity-0' : 'max-h-[500px] opacity-100'
          }`}
        >
          <div className="mt-4 pt-4 border-t border-gray-100">
            {detailContent}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
      {headerContent}
      <div className="mt-4 pt-4 border-t border-gray-100">{detailContent}</div>
    </div>
  );
}
