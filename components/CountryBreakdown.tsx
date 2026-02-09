'use client';

import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface CountryBreakdownProps {
  countryCounts: Record<string, number>;
}

export default function CountryBreakdown({ countryCounts }: CountryBreakdownProps) {
  const [showAll, setShowAll] = useState(false);
  
  const allData = Object.entries(countryCounts)
    .filter(([country]) => country.toLowerCase() !== 'unspecified')
    .map(([country, count]) => ({ country, count }))
    .sort((a, b) => b.count - a.count);
  
  const displayData = showAll ? allData : allData.slice(0, 10);
  const hasMore = allData.length > 10;

  if (allData.length === 0) {
    return (
      <div className="flex items-center justify-center h-80 bg-white rounded-xl border border-slate-200">
        <p className="text-slate-400">No travel visa countries detected yet</p>
      </div>
    );
  }

  // Calculate dynamic height based on number of items
  const barHeight = 32;
  const chartHeight = Math.max(280, displayData.length * barHeight + 40);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-slate-800">Travel Visa Countries</h3>
          <p className="text-sm text-slate-500">{allData.length} countries detected</p>
        </div>
        {hasMore && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            {showAll ? 'Show Top 10' : `Show All ${allData.length}`}
          </button>
        )}
      </div>
      <div style={{ maxHeight: showAll ? '500px' : 'none', overflowY: showAll ? 'auto' : 'visible' }}>
        <ResponsiveContainer width="100%" height={chartHeight}>
          <BarChart data={displayData} layout="vertical" margin={{ left: 80, right: 20 }}>
            <XAxis type="number" stroke="#94a3b8" fontSize={12} />
            <YAxis 
              type="category" 
              dataKey="country" 
              stroke="#94a3b8"
              fontSize={12}
              width={75}
              tick={{ fill: '#475569' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
              }}
              formatter={(value) => [`${value} prospects`, 'Count']}
            />
            <Bar 
              dataKey="count" 
              fill="#2563eb"
              radius={[0, 4, 4, 0]}
              label={{ 
                position: 'right', 
                fill: '#64748b', 
                fontSize: 11 
              }}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      
      {/* Summary Table for All Countries */}
      {showAll && (
        <div className="mt-4 pt-4 border-t border-slate-100">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {allData.map(({ country, count }) => (
              <div key={country} className="flex justify-between px-3 py-2 bg-slate-50 rounded-lg text-sm">
                <span className="text-slate-600 truncate">{country}</span>
                <span className="text-slate-800 font-medium ml-2">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
