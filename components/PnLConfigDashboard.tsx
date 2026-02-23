'use client';

import { useState, useEffect } from 'react';
import type { PnLConfig } from '@/lib/pnl-config';
import { ALL_SERVICE_KEYS } from '@/lib/pnl-complaints-types';
import type { PnLServiceKey } from '@/lib/pnl-complaints-types';

const SERVICE_LABELS: Record<PnLServiceKey, string> = {
  oec: 'OEC',
  owwa: 'OWWA',
  ttl: 'Travel to Lebanon (Generic)',
  ttlSingle: 'Tourist Visa to Lebanon – Single Entry',
  ttlDouble: 'Tourist Visa to Lebanon – Double Entry',
  ttlMultiple: 'Tourist Visa to Lebanon – Multiple Entry',
  tte: 'Travel to Egypt (Generic)',
  tteSingle: 'Tourist Visa to Egypt – Single Entry',
  tteDouble: 'Tourist Visa to Egypt – Double Entry',
  tteMultiple: 'Tourist Visa to Egypt – Multiple Entry',
  ttj: 'Travel to Jordan',
  schengen: 'Schengen Countries',
  gcc: 'GCC',
  ethiopianPP: 'Ethiopian Passport Renewal',
  filipinaPP: 'Filipina Passport Renewal',
};

export default function PnLConfigDashboard() {
  const [config, setConfig] = useState<PnLConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [source, setSource] = useState<'blob' | 'default'>('default');
  const [effectiveDate, setEffectiveDate] = useState<string>(() => {
    // Default to today
    return new Date().toISOString().split('T')[0];
  });

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/pnl/config');
      const data = await res.json();
      
      if (data.success && data.config) {
        setConfig(data.config);
        setSource(data.source || 'default');
      } else {
        // Fallback to defaults if API fails
        const defaultRes = await fetch('/api/pnl/config');
        const defaultData = await defaultRes.json();
        if (defaultData.config) {
          setConfig(defaultData.config);
          setSource('default');
        }
      }
    } catch (error) {
      console.error('Failed to load config:', error);
      setSaveStatus({ type: 'error', message: 'Failed to load config' });
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    if (!config) return;
    
    try {
      setSaving(true);
      setSaveStatus(null);
      
      const res = await fetch('/api/pnl/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config,
          effectiveDate,
        }),
      });
      
      const data = await res.json();
      
      if (data.success) {
        setSaveStatus({ type: 'success', message: data.message || `Config saved successfully! Effective from ${effectiveDate}` });
        setSource('blob');
        setTimeout(() => setSaveStatus(null), 5000);
      } else {
        setSaveStatus({ type: 'error', message: data.error || 'Failed to save config' });
      }
    } catch (error) {
      console.error('Failed to save config:', error);
      setSaveStatus({ type: 'error', message: 'Failed to save config' });
    } finally {
      setSaving(false);
    }
  };

  const updateServiceCost = (key: PnLServiceKey, value: number) => {
    if (!config) return;
    setConfig({
      ...config,
      serviceCosts: {
        ...config.serviceCosts,
        [key]: Math.max(0, value),
      },
    });
  };

  const updateServiceFee = (key: PnLServiceKey, value: number) => {
    if (!config) return;
    setConfig({
      ...config,
      serviceFees: {
        ...config.serviceFees,
        [key]: Math.max(0, value),
      },
    });
  };

  const updateFixedCost = (key: 'laborCost' | 'llm' | 'proTransportation', value: number) => {
    if (!config) return;
    setConfig({
      ...config,
      monthlyFixedCosts: {
        ...config.monthlyFixedCosts,
        [key]: Math.max(0, value),
      },
    });
  };

  const resetToDefaults = async () => {
    try {
      const res = await fetch('/api/pnl/config');
      const data = await res.json();
      if (data.config) {
        setConfig(data.config);
        setSource('default');
      }
    } catch (error) {
      console.error('Failed to reset config:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-slate-500">Loading config...</div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-red-500">Failed to load config</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">P&L Configuration</h1>
          <p className="text-sm text-slate-500 mt-1">
            Configure service costs, fees, and fixed monthly costs
            {source === 'blob' && (
              <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">
                Saved
              </span>
            )}
            {source === 'default' && (
              <span className="ml-2 px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded text-xs">
                Using Defaults
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={resetToDefaults}
            className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
          >
            Reset to Defaults
          </button>
          <button
            onClick={saveConfig}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Config'}
          </button>
        </div>
      </div>

      {/* Effective Date */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-blue-900 mb-1">
              Effective Date
            </label>
            <p className="text-xs text-blue-700 mb-2">
              This config will apply to all P&L complaints from this date onwards. Complaints before this date will use the previous config (or defaults).
            </p>
            <input
              type="date"
              value={effectiveDate}
              onChange={(e) => setEffectiveDate(e.target.value)}
              className="px-3 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            />
          </div>
        </div>
      </div>

      {/* Save Status */}
      {saveStatus && (
        <div
          className={`p-4 rounded-lg ${
            saveStatus.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {saveStatus.message}
        </div>
      )}

      {/* Service Costs */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Service Costs (Unit Costs)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {ALL_SERVICE_KEYS.map((key) => (
            <div key={key} className="flex flex-col">
              <label className="text-sm font-medium text-slate-700 mb-1">
                {SERVICE_LABELS[key]}
              </label>
              <div className="flex items-center gap-2">
                <span className="text-slate-500 text-sm">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={config.serviceCosts[key]}
                  onChange={(e) => updateServiceCost(key, parseFloat(e.target.value) || 0)}
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Service Fees */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Service Fees (Markup)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {ALL_SERVICE_KEYS.map((key) => (
            <div key={key} className="flex flex-col">
              <label className="text-sm font-medium text-slate-700 mb-1">
                {SERVICE_LABELS[key]}
              </label>
              <div className="flex items-center gap-2">
                <span className="text-slate-500 text-sm">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={config.serviceFees[key]}
                  onChange={(e) => updateServiceFee(key, parseFloat(e.target.value) || 0)}
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Fixed Monthly Costs */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Fixed Monthly Costs</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex flex-col">
            <label className="text-sm font-medium text-slate-700 mb-1">Labor Cost</label>
            <div className="flex items-center gap-2">
              <span className="text-slate-500 text-sm">$</span>
              <input
                type="number"
                step="1"
                min="0"
                value={config.monthlyFixedCosts.laborCost}
                onChange={(e) => updateFixedCost('laborCost', parseFloat(e.target.value) || 0)}
                className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex flex-col">
            <label className="text-sm font-medium text-slate-700 mb-1">LLM Cost</label>
            <div className="flex items-center gap-2">
              <span className="text-slate-500 text-sm">$</span>
              <input
                type="number"
                step="1"
                min="0"
                value={config.monthlyFixedCosts.llm}
                onChange={(e) => updateFixedCost('llm', parseFloat(e.target.value) || 0)}
                className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex flex-col">
            <label className="text-sm font-medium text-slate-700 mb-1">Pro Transportation</label>
            <div className="flex items-center gap-2">
              <span className="text-slate-500 text-sm">$</span>
              <input
                type="number"
                step="1"
                min="0"
                value={config.monthlyFixedCosts.proTransportation}
                onChange={(e) => updateFixedCost('proTransportation', parseFloat(e.target.value) || 0)}
                className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>
        <div className="mt-4 p-3 bg-slate-50 rounded-lg">
          <div className="text-sm text-slate-600">
            <strong>Total Monthly Fixed Costs:</strong>{' '}
            <span className="font-mono">
              ${(
                config.monthlyFixedCosts.laborCost +
                config.monthlyFixedCosts.llm +
                config.monthlyFixedCosts.proTransportation
              ).toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

