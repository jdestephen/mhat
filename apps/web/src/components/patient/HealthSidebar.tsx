'use client';

import React from 'react';
import { Pill, Activity, AlertTriangle } from 'lucide-react';

export interface HealthMedication {
  id: number | string;
  name: string;
  dosage?: string | null;
  frequency?: string | null;
}

export interface HealthCondition {
  id: number | string;
  name: string;
  status?: string | null;
  since_year?: string | null;
  severity?: string | null;
}

export interface HealthAllergy {
  id: number | string;
  allergen: string;
  reaction?: string | null;
  severity?: string | null;
}

interface HealthSidebarProps {
  medications: HealthMedication[];
  conditions: HealthCondition[];
  allergies: HealthAllergy[];
}

export function HealthSidebar({ medications, conditions, allergies }: HealthSidebarProps) {
  return (
    <div className="lg:col-span-1 space-y-4">
      {/* Active Medications */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
        <h2 className="font-semibold text-slate-900 flex items-center gap-2 mb-3">
          <Pill className="w-5 h-5 text-blue-600" />
          Medicamentos Activos
        </h2>
        {!medications.length ? (
          <p className="text-sm text-slate-500">Ninguno</p>
        ) : (
          <ul className="space-y-2">
            {medications.map((med) => (
              <li key={med.id} className="text-sm">
                <p className="font-medium text-slate-800">{med.name}</p>
                {med.dosage && <p className="text-xs text-slate-600">{med.dosage}</p>}
                {med.frequency && <p className="text-xs text-slate-600">{med.frequency}</p>}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Conditions */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
        <h2 className="font-semibold text-slate-900 flex items-center gap-2 mb-3">
          <Activity className="w-5 h-5 text-purple-600" />
          Condiciones
        </h2>
        {!conditions.length ? (
          <p className="text-sm text-slate-500">Ninguna</p>
        ) : (
          <ul className="space-y-2">
            {conditions.map((cond) => (
              <li key={cond.id} className="text-sm">
                <p className="font-medium text-slate-800">{cond.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  {(cond.status || cond.severity) && (
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      (cond.status === 'active' || cond.severity === 'HIGH') ? 'bg-amber-100 text-amber-700' :
                      (cond.status === 'resolved' || cond.severity === 'LOW') ? 'bg-green-100 text-green-700' :
                      (cond.status === 'controlled' || cond.severity === 'MEDIUM') ? 'bg-amber-100 text-amber-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {cond.status || cond.severity}
                    </span>
                  )}
                  {cond.since_year && (
                    <span className="text-xs text-slate-500">desde {cond.since_year}</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Allergies */}
      <div className="bg-white rounded-lg shadow-sm border border-red-300 p-4">
        <h2 className="font-semibold text-red-900 flex items-center gap-2 mb-3">
          <AlertTriangle className="w-5 h-5 text-red-600" />
          Alergias
        </h2>
        {!allergies.length ? (
          <p className="text-sm text-red-600">Ninguna conocida</p>
        ) : (
          <ul className="space-y-2">
            {allergies.map((allergy) => (
              <li key={allergy.id} className="text-sm">
                <p className="font-medium text-red-800">{allergy.allergen}</p>
                {allergy.reaction && <p className="text-xs text-red-700">{allergy.reaction}</p>}
                {allergy.severity && (
                  <span className={`text-xs px-2 py-0.5 rounded mt-0.5 inline-block ${
                    allergy.severity === 'severe' ? 'bg-red-200 text-red-800' :
                    allergy.severity === 'moderate' ? 'bg-amber-100 text-amber-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {allergy.severity}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
