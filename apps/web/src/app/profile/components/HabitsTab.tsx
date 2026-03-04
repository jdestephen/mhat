'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import api from '@/lib/api';
import {
  HealthHabit,
  TobaccoUse,
  AlcoholUse,
  PhysicalActivity,
  DietType,
} from '@/types';

const TOBACCO_OPTIONS = [
  { value: '', label: 'Selecciona...' },
  { value: TobaccoUse.NEVER, label: 'Nunca' },
  { value: TobaccoUse.EX_SMOKER, label: 'Exfumador' },
  { value: TobaccoUse.OCCASIONAL, label: 'Fumador ocasional' },
  { value: TobaccoUse.ACTIVE, label: 'Fumador activo' },
];

const ALCOHOL_OPTIONS = [
  { value: '', label: 'Selecciona...' },
  { value: AlcoholUse.NONE, label: 'No consume' },
  { value: AlcoholUse.OCCASIONAL, label: 'Ocasional' },
  { value: AlcoholUse.SOCIAL, label: 'Social' },
  { value: AlcoholUse.FREQUENT, label: 'Frecuente' },
];

const ACTIVITY_OPTIONS = [
  { value: '', label: 'Selecciona...' },
  { value: PhysicalActivity.SEDENTARY, label: 'Sedentario' },
  { value: PhysicalActivity.ONE_TWO, label: '1-2 veces por semana' },
  { value: PhysicalActivity.THREE_FOUR, label: '3-4 veces por semana' },
  { value: PhysicalActivity.FIVE_PLUS, label: '5+ veces por semana' },
];

const DIET_OPTIONS = [
  { value: '', label: 'Selecciona...' },
  { value: DietType.BALANCED, label: 'Balanceada' },
  { value: DietType.HIGH_CARB, label: 'Alta en carbohidratos' },
  { value: DietType.HIGH_FAT, label: 'Alta en grasas' },
  { value: DietType.VEGETARIAN, label: 'Vegetariana' },
  { value: DietType.VEGAN, label: 'Vegana' },
  { value: DietType.OTHER, label: 'Otra' },
];

const DRUG_OPTIONS = [
  { value: '', label: 'Selecciona...' },
  { value: 'true', label: 'Sí' },
  { value: 'false', label: 'No' },
];

const SLEEP_PROBLEM_OPTIONS = [
  { value: '', label: 'Selecciona...' },
  { value: 'true', label: 'Sí' },
  { value: 'false', label: 'No' },
];

interface HabitsTabProps {
  onRefresh: () => void;
}

export function HabitsTab({ onRefresh }: HabitsTabProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Form state - all fields
  const [tobaccoUse, setTobaccoUse] = useState('');
  const [cigarettesPerDay, setCigarettesPerDay] = useState('');
  const [yearsSmoking, setYearsSmoking] = useState('');
  const [yearsSinceQuit, setYearsSinceQuit] = useState('');
  const [alcoholUse, setAlcoholUse] = useState('');
  const [drinksPerWeek, setDrinksPerWeek] = useState('');
  const [drugUse, setDrugUse] = useState('');
  const [drugType, setDrugType] = useState('');
  const [drugFrequency, setDrugFrequency] = useState('');
  const [physicalActivity, setPhysicalActivity] = useState('');
  const [diet, setDiet] = useState('');
  const [sleepHours, setSleepHours] = useState('');
  const [sleepProblems, setSleepProblems] = useState('');
  const [observations, setObservations] = useState('');

  useEffect(() => {
    fetchHabits();
  }, []);

  const fetchHabits = async () => {
    try {
      const res = await api.get<HealthHabit | null>('/profiles/patient/habits');
      if (res.data) {
        const h = res.data;
        setTobaccoUse(h.tobacco_use || '');
        setCigarettesPerDay(h.cigarettes_per_day?.toString() || '');
        setYearsSmoking(h.years_smoking?.toString() || '');
        setYearsSinceQuit(h.years_since_quit?.toString() || '');
        setAlcoholUse(h.alcohol_use || '');
        setDrinksPerWeek(h.drinks_per_week?.toString() || '');
        setDrugUse(h.drug_use === true ? 'true' : h.drug_use === false ? 'false' : '');
        setDrugType(h.drug_type || '');
        setDrugFrequency(h.drug_frequency || '');
        setPhysicalActivity(h.physical_activity || '');
        setDiet(h.diet || '');
        setSleepHours(h.sleep_hours?.toString() || '');
        setSleepProblems(h.sleep_problems === true ? 'true' : h.sleep_problems === false ? 'false' : '');
        setObservations(h.observations || '');
      }
    } catch (error) {
      console.error('Error fetching habits', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await api.put('/profiles/patient/habits', {
        tobacco_use: tobaccoUse || null,
        cigarettes_per_day: cigarettesPerDay ? parseInt(cigarettesPerDay) : null,
        years_smoking: yearsSmoking ? parseInt(yearsSmoking) : null,
        years_since_quit: yearsSinceQuit ? parseInt(yearsSinceQuit) : null,
        alcohol_use: alcoholUse || null,
        drinks_per_week: drinksPerWeek ? parseInt(drinksPerWeek) : null,
        drug_use: drugUse === 'true' ? true : drugUse === 'false' ? false : null,
        drug_type: drugType || null,
        drug_frequency: drugFrequency || null,
        physical_activity: physicalActivity || null,
        diet: diet || null,
        sleep_hours: sleepHours ? parseFloat(sleepHours) : null,
        sleep_problems: sleepProblems === 'true' ? true : sleepProblems === 'false' ? false : null,
        observations: observations || null,
      });
      setSaved(true);
      onRefresh();
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error('Error saving habits', error);
    } finally {
      setSaving(false);
    }
  };

  // Conditional visibility helpers
  const showTobaccoDetails = tobaccoUse === TobaccoUse.ACTIVE || tobaccoUse === TobaccoUse.EX_SMOKER || tobaccoUse === TobaccoUse.OCCASIONAL;
  const showYearsSinceQuit = tobaccoUse === TobaccoUse.EX_SMOKER;
  const showAlcoholDetails = alcoholUse === AlcoholUse.OCCASIONAL || alcoholUse === AlcoholUse.SOCIAL || alcoholUse === AlcoholUse.FREQUENT;
  const showDrugDetails = drugUse === 'true';

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-700" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tabaco */}
      <div className="border border-slate-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-emerald-900 mb-3">🚬 Tabaco</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Consumo de tabaco</label>
            <Select
              options={TOBACCO_OPTIONS}
              value={tobaccoUse}
              onChange={(v) => setTobaccoUse(v as string)}
              placeholder="Selecciona..."
            />
          </div>
          {showTobaccoDetails && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Cigarros por día</label>
                <Input
                  type="number"
                  value={cigarettesPerDay}
                  onChange={(e) => setCigarettesPerDay(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Años fumando</label>
                <Input
                  type="number"
                  value={yearsSmoking}
                  onChange={(e) => setYearsSmoking(e.target.value)}
                  placeholder="0"
                />
              </div>
              {showYearsSinceQuit && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Años desde que dejó</label>
                  <Input
                    type="number"
                    value={yearsSinceQuit}
                    onChange={(e) => setYearsSinceQuit(e.target.value)}
                    placeholder="0"
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Alcohol */}
      <div className="border border-slate-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-emerald-900 mb-3">🍺 Alcohol</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Consumo de alcohol</label>
            <Select
              options={ALCOHOL_OPTIONS}
              value={alcoholUse}
              onChange={(v) => setAlcoholUse(v as string)}
              placeholder="Selecciona..."
            />
          </div>
          {showAlcoholDetails && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Bebidas por semana</label>
              <Input
                type="number"
                value={drinksPerWeek}
                onChange={(e) => setDrinksPerWeek(e.target.value)}
                placeholder="0"
              />
            </div>
          )}
        </div>
      </div>

      {/* Drogas */}
      <div className="border border-slate-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-emerald-900 mb-3">💊 Drogas / Sustancias</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Consumo de sustancias</label>
            <Select
              options={DRUG_OPTIONS}
              value={drugUse}
              onChange={(v) => setDrugUse(v as string)}
              placeholder="Selecciona..."
            />
          </div>
          {showDrugDetails && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de sustancia</label>
                <Input
                  value={drugType}
                  onChange={(e) => setDrugType(e.target.value)}
                  placeholder="Tipo de sustancia"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Frecuencia</label>
                <Input
                  value={drugFrequency}
                  onChange={(e) => setDrugFrequency(e.target.value)}
                  placeholder="Frecuencia de uso"
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Actividad Física */}
      <div className="border border-slate-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-emerald-900 mb-3">🏃 Actividad Física</h3>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Frecuencia de actividad</label>
          <Select
            options={ACTIVITY_OPTIONS}
            value={physicalActivity}
            onChange={(v) => setPhysicalActivity(v as string)}
            placeholder="Selecciona..."
          />
        </div>
      </div>

      {/* Alimentación */}
      <div className="border border-slate-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-emerald-900 mb-3">🥗 Alimentación</h3>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de alimentación</label>
          <Select
            options={DIET_OPTIONS}
            value={diet}
            onChange={(v) => setDiet(v as string)}
            placeholder="Selecciona..."
          />
        </div>
      </div>

      {/* Sueño */}
      <div className="border border-slate-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-emerald-900 mb-3">😴 Sueño</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Horas de sueño promedio</label>
            <Input
              type="number"
              step="0.5"
              value={sleepHours}
              onChange={(e) => setSleepHours(e.target.value)}
              placeholder="8"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Problemas de sueño</label>
            <Select
              options={SLEEP_PROBLEM_OPTIONS}
              value={sleepProblems}
              onChange={(v) => setSleepProblems(v as string)}
              placeholder="Selecciona..."
            />
          </div>
        </div>
      </div>

      {/* Observaciones */}
      <div className="border border-slate-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-emerald-900 mb-3">📝 Observaciones</h3>
        <textarea
          className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600 resize-none"
          rows={3}
          value={observations}
          onChange={(e) => setObservations(e.target.value)}
          placeholder="Observaciones generales sobre hábitos..."
        />
      </div>

      {/* Save button */}
      <div className="flex justify-end gap-3 items-center">
        {saved && (
          <span className="text-sm text-emerald-600 font-medium">✓ Guardado</span>
        )}
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-emerald-700 hover:bg-emerald-800 text-white"
        >
          {saving ? 'Guardando...' : 'Guardar Cambios'}
        </Button>
      </div>
    </div>
  );
}
