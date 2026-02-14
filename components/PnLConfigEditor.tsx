'use client';

import { useState, useEffect } from 'react';
import type { PnLConfigSnapshot, ServiceConfig } from '@/lib/pnl-config-types';

export default function PnLConfigEditor() {
  const [config, setConfig] = useState<PnLConfigSnapshot | null>(null);
  const [history, setHistory] = useState<PnLConfigSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editedConfig, setEditedConfig] = useState<PnLConfigSnapshot['services'] | null>(null);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/pnl-config');
      const data = await response.json();
      
      if (data.success) {
        setConfig(data.currentConfig);
        setHistory(data.history);
        setEditedConfig(data.currentConfig.services);
      }
    } catch (error) {
      console.error('Error fetching config:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!editedConfig) return;

    setSaving(true);
    try {
      const response = await fetch('/api/pnl-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ services: editedConfig }),
      });

      const data = await response.json();
      
      if (data.success) {
        alert(data.message);
        await fetchConfig();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error saving config:', error);
      alert('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const updateService = (serviceKey: keyof PnLConfigSnapshot['services'], field: keyof ServiceConfig, value: number) => {
    if (!editedConfig) return;

    setEditedConfig({
      ...editedConfig,
      [serviceKey]: {
        ...editedConfig[serviceKey],
        [field]: value,
      },
    });
  };

  if (loading) {
    return <div className="p-8">Loading configuration...</div>;
  }

  if (!config || !editedConfig) {
    return <div className="p-8">No configuration found</div>;
  }

  const serviceLabels = {
    oec: 'OEC',
    owwa: 'OWWA',
    ttl: 'Travel to Lebanon',
    tte: 'Travel to Egypt',
    ttj: 'Travel to Jordan',
    schengen: 'Schengen Countries',
    gcc: 'GCC',
    ethiopianPP: 'Ethiopian Passport Renewal',
    filipinaPP: 'Filipina Passport Renewal',
  };

  return (
    <div className="p-8 space-y-8">
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-2xl font-bold text-slate-800 mb-6">P&L Cost Configuration</h2>
        
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> Changes will apply from today ({new Date().toISOString().split('T')[0]}) forward. 
            Historical data will keep its original cost calculations.
          </p>
        </div>

        <div className="space-y-4">
          {(Object.keys(serviceLabels) as Array<keyof typeof serviceLabels>).map((key) => (
            <div key={key} className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg">
              <div className="flex-1">
                <h3 className="font-semibold text-slate-800">{serviceLabels[key]}</h3>
              </div>
              
              <div className="flex items-center gap-2">
                <label className="text-sm text-slate-600">Unit Cost:</label>
                <input
                  type="number"
                  step="0.01"
                  value={editedConfig[key].unitCost}
                  onChange={(e) => updateService(key, 'unitCost', parseFloat(e.target.value) || 0)}
                  className="w-28 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <span className="text-sm text-slate-600">AED</span>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-sm text-slate-600">Service Fee:</label>
                <input
                  type="number"
                  step="0.01"
                  value={editedConfig[key].serviceFee || 0}
                  onChange={(e) => updateService(key, 'serviceFee', parseFloat(e.target.value) || 0)}
                  className="w-28 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <span className="text-sm text-slate-600">AED</span>
              </div>

              <div className="text-sm font-semibold text-slate-700 w-32 text-right">
                Total: {((editedConfig[key].unitCost || 0) + (editedConfig[key].serviceFee || 0)).toFixed(2)} AED
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex justify-end gap-4">
          <button
            onClick={() => setEditedConfig(config.services)}
            className="px-6 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Reset
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </div>

      {/* Configuration History */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="text-xl font-bold text-slate-800 mb-4">Configuration History</h3>
        
        <div className="space-y-3">
          {history.map((snapshot, index) => (
            <div key={index} className="p-4 bg-slate-50 rounded-lg">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-semibold text-slate-800">Effective from: {snapshot.effectiveDate}</p>
                  <p className="text-sm text-slate-600">Updated: {new Date(snapshot.updatedAt).toLocaleString()}</p>
                </div>
                {index === history.length - 1 && (
                  <span className="px-3 py-1 bg-green-100 text-green-700 text-sm font-medium rounded-full">
                    Current
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

