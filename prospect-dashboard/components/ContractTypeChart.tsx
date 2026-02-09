'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface ContractTypeChartProps {
  byContractType?: {
    CC: { oec: number; owwa: number; travelVisa: number };
    MV: { oec: number; owwa: number; travelVisa: number };
  };
  serviceFilter?: 'oec' | 'owwa' | 'travelVisa';
}

export default function ContractTypeChart({ byContractType, serviceFilter }: ContractTypeChartProps) {
  if (!byContractType) {
    return (
      <div className="flex items-center justify-center h-80 bg-white rounded-lg border border-slate-200">
        <p className="text-slate-400">No contract type data available</p>
      </div>
    );
  }

  const allData = [
    {
      name: 'OEC',
      key: 'oec' as const,
      CC: byContractType.CC.oec,
      MV: byContractType.MV.oec,
    },
    {
      name: 'OWWA',
      key: 'owwa' as const,
      CC: byContractType.CC.owwa,
      MV: byContractType.MV.owwa,
    },
    {
      name: 'Travel Visa',
      key: 'travelVisa' as const,
      CC: byContractType.CC.travelVisa,
      MV: byContractType.MV.travelVisa,
    },
  ];

  const data = serviceFilter 
    ? allData.filter(d => d.key === serviceFilter)
    : allData;

  const total = data.reduce((sum, d) => sum + d.CC + d.MV, 0);

  const serviceLabels: Record<string, string> = {
    oec: 'OEC',
    owwa: 'OWWA',
    travelVisa: 'Travel Visa',
  };

  // Service-specific color palettes (softer shades)
  const serviceColors = {
    oec: { dark: '#b45309', light: '#d97706' },      // amber tones
    owwa: { dark: '#7c3aed', light: '#a78bfa' },     // violet tones
    travelVisa: { dark: '#2563eb', light: '#60a5fa' }, // blue tones
  };

  // Get colors based on service filter
  const getChartColors = () => {
    if (serviceFilter && serviceColors[serviceFilter]) {
      return serviceColors[serviceFilter];
    }
    return { dark: '#475569', light: '#94a3b8' }; // neutral slate
  };

  const chartColor = getChartColors();

  const chartTitle = serviceFilter 
    ? `${serviceLabels[serviceFilter]} by Contract Type`
    : 'Contract Type by Service';

  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-80 bg-white rounded-lg border border-slate-200">
        <p className="text-slate-400">No prospects detected yet</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-slate-800">{chartTitle}</h3>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: chartColor.dark }} />
            <span className="text-slate-600">CC</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: chartColor.light }} />
            <span className="text-slate-600">MV</span>
          </div>
        </div>
      </div>
      
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <XAxis 
            dataKey="name" 
            stroke="#94a3b8" 
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis 
            stroke="#94a3b8" 
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
              fontSize: '12px',
            }}
            formatter={(value, name) => [`${value} prospects`, name]}
          />
          <Bar 
            dataKey="CC" 
            fill={chartColor.dark} 
            radius={[4, 4, 0, 0]}
            maxBarSize={50}
          />
          <Bar 
            dataKey="MV" 
            fill={chartColor.light} 
            radius={[4, 4, 0, 0]}
            maxBarSize={50}
          />
        </BarChart>
      </ResponsiveContainer>

      {/* Summary */}
      <div className={`mt-4 pt-4 border-t border-slate-100 grid gap-4 text-center ${serviceFilter ? 'grid-cols-1' : 'grid-cols-3'}`}>
        {data.map((item) => (
          <div key={item.name}>
            <p className="text-xs text-slate-500 mb-1">{item.name}</p>
            <div className="flex justify-center gap-3 text-xs">
              <span className="font-medium" style={{ color: chartColor.dark }}>CC: {item.CC}</span>
              <span className="font-medium" style={{ color: chartColor.light }}>MV: {item.MV}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

