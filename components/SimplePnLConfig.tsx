'use client';

import { useState, useEffect } from 'react';
import { PnLConfig, SERVICE_NAMES } from '@/lib/simple-pnl-config';

export default function SimplePnLConfig() {
  const [config, setConfig] = useState<PnLConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/simple-pnl-config');
      const data = await response.json();
      
      if (data.success) {
        setConfig(data.config);
      } else {
        setMessage('Error loading configuration');
      }
    } catch (error) {
      console.error('Error fetching config:', error);
      setMessage('Network error loading configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!config) return;

    setSaving(true);
    setMessage(null);
    
    try {
      const response = await fetch('/api/simple-pnl-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      const data = await response.json();
      
      if (data.success) {
        setMessage('✅ Configuration saved successfully!');
        setConfig(data.config);
      } else {
        setMessage(`❌ Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error saving config:', error);
      setMessage('❌ Network error saving configuration');
    } finally {
      setSaving(false);
    }
  };

  const updateServiceField = (serviceKey: keyof typeof SERVICE_NAMES, field: 'unitCost' | 'serviceFee', value: number) => {
    if (!config) return;
    
    setConfig({
      ...config,
      [serviceKey]: {
        ...config[serviceKey],
        [field]: value
      }
    });
  };

  const updateFixedCost = (field: keyof PnLConfig['fixedCosts'], value: number) => {
    if (!config) return;
    
    setConfig({
      ...config,
      fixedCosts: {
        ...config.fixedCosts,
        [field]: value
      }
    });
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-slate-600">Loading P&L configuration...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-red-800 mb-2">Configuration Error</h3>
          <p className="text-red-700 mb-4">{message || 'Failed to load configuration'}</p>
          <button
            onClick={fetchConfig}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-2xl font-bold text-slate-800 mb-6">P&L Configuration</h2>
        
        {message && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.includes('✅') 
              ? 'bg-green-50 border border-green-200 text-green-800' 
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            {message}
          </div>
        )}
        
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Currency:</strong> All amounts are in AED (UAE Dirhams)<br />
            <strong>Formula:</strong> Total Price = Unit Cost + Service Fee | Revenue = Total Price × Volume<br />
            <strong>Last Updated:</strong> {new Date(config.lastUpdated).toLocaleString()}
          </p>
        </div>

        {/* Service Pricing */}
        <div className="space-y-4 mb-8">
          <h3 className="text-lg font-semibold text-slate-800">Service Pricing</h3>
          {(Object.keys(SERVICE_NAMES) as Array<keyof typeof SERVICE_NAMES>).map((serviceKey) => (
            <div key={serviceKey} className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg">
              <div className="flex-1">
                <h4 className="font-semibold text-slate-800">{SERVICE_NAMES[serviceKey]}</h4>
              </div>
              <div className="flex items-center gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Unit Cost (AED)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={config[serviceKey].unitCost}
                    onChange={(e) => updateServiceField(serviceKey, 'unitCost', parseFloat(e.target.value) || 0)}
                    className="w-24 px-3 py-2 border border-slate-300 rounded-md text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Service Fee (AED)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={config[serviceKey].serviceFee}
                    onChange={(e) => updateServiceField(serviceKey, 'serviceFee', parseFloat(e.target.value) || 0)}
                    className="w-24 px-3 py-2 border border-slate-300 rounded-md text-sm"
                  />
                </div>
                <div className="text-right">
                  <div className="text-xs font-medium text-slate-600">Total Price</div>
                  <div className="text-sm font-semibold text-slate-800">
                    {(config[serviceKey].unitCost + config[serviceKey].serviceFee).toFixed(2)} AED
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Fixed Costs */}
        <div className="space-y-4 mb-8">
          <h3 className="text-lg font-semibold text-slate-800">Monthly Fixed Costs</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-50 rounded-lg">
              <label className="block text-sm font-medium text-slate-600 mb-2">Labor Cost (AED/month)</label>
              <input
                type="number"
                step="0.01"
                value={config.fixedCosts.laborCost}
                onChange={(e) => updateFixedCost('laborCost', parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md"
              />
            </div>
            <div className="p-4 bg-slate-50 rounded-lg">
              <label className="block text-sm font-medium text-slate-600 mb-2">LLM Cost (AED/month)</label>
              <input
                type="number"
                step="0.01"
                value={config.fixedCosts.llm}
                onChange={(e) => updateFixedCost('llm', parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md"
              />
            </div>
            <div className="p-4 bg-slate-50 rounded-lg">
              <label className="block text-sm font-medium text-slate-600 mb-2">Transportation (AED/month)</label>
              <input
                type="number"
                step="0.01"
                value={config.fixedCosts.proTransportation}
                onChange={(e) => updateFixedCost('proTransportation', parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md"
              />
            </div>
          </div>
          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="text-sm font-medium text-blue-800">
              Total Monthly Fixed Costs: {(config.fixedCosts.laborCost + config.fixedCosts.llm + config.fixedCosts.proTransportation).toLocaleString()} AED
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </div>
    </div>
  );
}
