'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import type { AggregatedPnL, ServicePnL, EntryType, CostBreakdown } from '@/lib/pnl-types';

type PnLServiceFilter = 'oec' | 'owwa' | 'ttl' | 'tte' | 'ttj' | 'schengen' | 'gcc' | 'ethiopianPP' | 'filipinaPP' | 'travel' | 'passport';

interface PnLServiceDetailProps {
  data: AggregatedPnL | null;
  filter: PnLServiceFilter;
}

// Muted, sophisticated colors matching main dashboard vibe
const SERVICE_COLORS = {
  oec: '#b45309',      // amber-700 (matches main dashboard OEC)
  owwa: '#7c3aed',     // violet-600 (matches main dashboard OWWA)
  ttl: '#2563eb',      // blue-600 (matches main dashboard travel)
  tte: '#6db39f',      // soft sage green
  ttj: '#e5a855',      // warm amber
  schengen: '#8ecae6', // soft sky blue
  gcc: '#e5c07b',      // soft golden
  ethiopianPP: '#a78bfa', // violet-400
  filipinaPP: '#d97706',  // amber-600
};

const SERVICE_LABELS: Record<string, string> = {
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

export default function PnLServiceDetail({ data, filter }: PnLServiceDetailProps) {
  if (!data) return null;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: 'AED',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Get services based on filter - each service has its own tab now
  const getFilteredServices = (): { key: string; service: ServicePnL }[] => {
    switch (filter) {
      case 'oec':
        return [{ key: 'oec', service: data.services.oec }];
      case 'owwa':
        return [{ key: 'owwa', service: data.services.owwa }];
      case 'ttl':
        return [{ key: 'ttl', service: data.services.ttl }];
      case 'tte':
        return [{ key: 'tte', service: data.services.tte }];
      case 'ttj':
        return [{ key: 'ttj', service: data.services.ttj }];
      case 'schengen':
        return [{ key: 'schengen', service: data.services.schengen }];
      case 'gcc':
        return [{ key: 'gcc', service: data.services.gcc }];
      case 'ethiopianPP':
        return [{ key: 'ethiopianPP', service: data.services.ethiopianPP }];
      case 'filipinaPP':
        return [{ key: 'filipinaPP', service: data.services.filipinaPP }];
      // Legacy grouped filters
      case 'travel':
        return [
          { key: 'ttl', service: data.services.ttl },
          { key: 'tte', service: data.services.tte },
          { key: 'ttj', service: data.services.ttj },
          { key: 'schengen', service: data.services.schengen },
          { key: 'gcc', service: data.services.gcc },
        ];
      case 'passport':
        return [
          { key: 'ethiopianPP', service: data.services.ethiopianPP },
          { key: 'filipinaPP', service: data.services.filipinaPP },
        ];
      default:
        return [];
    }
  };

  const services = getFilteredServices();
  
  // Calculate totals for this filter
  const totals = services.reduce(
    (acc, { service }) => ({
      volume: acc.volume + service.volume,
      revenue: acc.revenue + service.totalRevenue,
      cost: acc.cost + service.totalCost,
      grossProfit: acc.grossProfit + service.grossProfit,
      serviceFees: acc.serviceFees + service.serviceFees,
    }),
    { volume: 0, revenue: 0, cost: 0, grossProfit: 0, serviceFees: 0 }
  );
  
  // For single service, get the per-order service fee
  const perOrderServiceFee = services.length === 1 ? services[0].service.serviceFees : 0;

  // Chart data
  const chartData = services.map(({ key, service }) => ({
    name: SERVICE_LABELS[key] || key,
    revenue: service.totalRevenue,
    cost: service.totalCost,
    volume: service.volume,
    color: SERVICE_COLORS[key as keyof typeof SERVICE_COLORS] || '#94a3b8',
  }));

  const pieData = chartData
    .filter(d => d.revenue > 0)
    .map(d => ({ name: d.name, value: d.revenue, color: d.color }));

  const tooltipStyle = {
    backgroundColor: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
    fontSize: '12px',
  };

  const filterLabels: Record<PnLServiceFilter, string> = {
    oec: 'OEC',
    owwa: 'OWWA',
    ttl: 'Travel to Lebanon',
    tte: 'Travel to Egypt',
    ttj: 'Travel to Jordan',
    schengen: 'Schengen Countries',
    gcc: 'GCC',
    ethiopianPP: 'Ethiopian Passport Renewal',
    filipinaPP: 'Filipina Passport Renewal',
    travel: 'Travel Visas',
    passport: 'Passport Renewals',
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl p-5 border-2 border-gray-600">
          <p className="text-sm font-medium text-slate-600">Total Revenue</p>
          <p className="text-3xl font-bold mt-1 text-slate-800">
            {formatCurrency(totals.revenue)}
          </p>
          <p className="text-xs text-slate-400 mt-2">
            {totals.volume} orders{perOrderServiceFee > 0 && ' + fees'}
          </p>
        </div>

        <div className="bg-white rounded-xl p-5 border-2 border-gray-600">
          <p className="text-sm font-medium text-slate-600">Total Cost</p>
          <p className="text-3xl font-bold mt-1 text-slate-800">
            {formatCurrency(totals.cost)}
          </p>
          <p className="text-xs text-slate-400 mt-2">
            Direct costs (COGS)
          </p>
        </div>

        <div className="bg-white rounded-xl p-5 border-2 border-gray-600">
          <p className="text-sm font-medium text-slate-600">Gross Profit</p>
          <p className={`text-3xl font-bold mt-1 ${totals.grossProfit >= 0 ? 'text-slate-800' : 'text-red-600'}`}>
            {formatCurrency(totals.grossProfit)}
          </p>
          <p className="text-xs text-slate-400 mt-2">
            Revenue - COGS
          </p>
        </div>

        <div className="bg-white rounded-xl p-5 border-2 border-gray-600">
          <p className="text-sm font-medium text-slate-600">Service Fee</p>
          <p className="text-3xl font-bold mt-1 text-slate-800">
            {perOrderServiceFee > 0 ? formatCurrency(perOrderServiceFee) : '—'}
          </p>
          <p className="text-xs text-slate-400 mt-2">
            Per order
          </p>
        </div>

        <div className="bg-slate-800 rounded-xl p-5 text-white">
          <p className="text-sm font-medium text-slate-300">Avg. Price</p>
          <p className="text-3xl font-bold mt-1 text-white">
            {formatCurrency(totals.volume > 0 ? totals.revenue / totals.volume : 0)}
          </p>
          <p className="text-xs text-slate-500 mt-2">
            Per order
          </p>
        </div>
      </div>

      {/* Charts - only show for multi-service filters */}
      {services.length > 1 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Bar Chart */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="text-base font-semibold text-slate-800 mb-4">
              {filterLabels[filter]} Breakdown
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart 
                data={chartData} 
                margin={{ top: 20, right: 30, left: 10, bottom: 80 }}
                barCategoryGap="15%"
              >
                <defs>
                  {chartData.map((entry, index) => (
                    <linearGradient key={`gradient-${index}`} id={`detail-gradient-${index}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={entry.color} stopOpacity={1} />
                      <stop offset="100%" stopColor={entry.color} stopOpacity={0.7} />
                    </linearGradient>
                  ))}
                </defs>
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 11, fill: '#475569', fontWeight: 500 }} 
                  angle={-45} 
                  textAnchor="end" 
                  height={80}
                  axisLine={{ stroke: '#e2e8f0' }}
                  tickLine={false}
                />
                <YAxis 
                  tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v.toString()}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                  width={50}
                />
                <Tooltip 
                  formatter={(value) => formatCurrency(Number(value) || 0)}
                  contentStyle={tooltipStyle}
                  cursor={{ fill: 'rgba(148, 163, 184, 0.1)' }}
                />
                <Bar dataKey="revenue" name="Revenue" radius={[8, 8, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={`url(#detail-gradient-${index})`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Pie Chart */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="text-base font-semibold text-slate-800 mb-4">Revenue Distribution</h3>
            
            <div className="flex flex-wrap gap-2 mb-4 text-xs">
              {pieData.map((item) => (
                <div key={item.name} className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: item.color }} />
                  <span className="text-slate-600">{item.name}</span>
                </div>
              ))}
            </div>

            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={80}
                  paddingAngle={4}
                  cornerRadius={6}
                  dataKey="value"
                  stroke="none"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value) => [formatCurrency(Number(value) || 0), 'Revenue']}
                  contentStyle={tooltipStyle}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Service Details Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100">
          <h3 className="text-base font-semibold text-slate-800">{filterLabels[filter]} Details</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Service</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Volume</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Price</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Service Fee</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Revenue</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Cost</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Gross Profit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {services.map(({ key, service }) => (
                <tr key={key} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm font-medium text-slate-800">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded" 
                        style={{ backgroundColor: SERVICE_COLORS[key as keyof typeof SERVICE_COLORS] }}
                      />
                      {SERVICE_LABELS[key]}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-slate-600">{service.volume}</td>
                  <td className="px-4 py-3 text-sm text-right text-slate-600">{formatCurrency(service.price)}</td>
                  <td className="px-4 py-3 text-sm text-right text-slate-600">
                    {service.serviceFees > 0 ? formatCurrency(service.serviceFees) : '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-slate-800 font-medium">{formatCurrency(service.totalRevenue)}</td>
                  <td className="px-4 py-3 text-sm text-right text-slate-600">{formatCurrency(service.totalCost)}</td>
                  <td className={`px-4 py-3 text-sm text-right font-semibold ${service.grossProfit >= 0 ? 'text-slate-800' : 'text-red-600'}`}>
                    {formatCurrency(service.grossProfit)}
                  </td>
                </tr>
              ))}
            </tbody>
            {services.length > 1 && (
              <tfoot className="bg-slate-100 font-semibold">
                <tr>
                  <td className="px-4 py-3 text-sm text-slate-800">Total</td>
                  <td className="px-4 py-3 text-sm text-right text-slate-800">{totals.volume}</td>
                  <td className="px-4 py-3 text-sm text-right text-slate-500">—</td>
                  <td className="px-4 py-3 text-sm text-right text-slate-500">—</td>
                  <td className="px-4 py-3 text-sm text-right text-slate-800">{formatCurrency(totals.revenue)}</td>
                  <td className="px-4 py-3 text-sm text-right text-slate-600">{formatCurrency(totals.cost)}</td>
                  <td className={`px-4 py-3 text-sm text-right ${totals.grossProfit >= 0 ? 'text-slate-800' : 'text-red-600'}`}>
                    {formatCurrency(totals.grossProfit)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Entry Types Breakdown - for travel visas with single/double/multiple entry types */}
      {services.some(({ service }) => service.entryTypes && service.entryTypes.length > 0) && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <h3 className="text-base font-semibold text-slate-800">Entry Types Breakdown</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-amber-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-amber-700 uppercase">Service</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-amber-700 uppercase">Entry Type</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-amber-700 uppercase">Volume</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-amber-700 uppercase">Price</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-amber-700 uppercase">Embassy Fee</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-amber-700 uppercase">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {services.map(({ key, service }) => 
                  service.entryTypes?.map((entry, idx) => (
                    <tr key={`${key}-${idx}`} className="hover:bg-amber-50/50">
                      <td className="px-4 py-3 text-sm font-medium text-slate-800">
                        {idx === 0 ? SERVICE_LABELS[key] : ''}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">{entry.type}</td>
                      <td className="px-4 py-3 text-sm text-right text-slate-600">{entry.volume}</td>
                      <td className="px-4 py-3 text-sm text-right text-slate-600">{formatCurrency(entry.price)}</td>
                      <td className="px-4 py-3 text-sm text-right text-amber-600">{formatCurrency(entry.embassyFee)}</td>
                      <td className="px-4 py-3 text-sm text-right text-slate-800 font-medium">{formatCurrency(entry.revenue)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Cost Per Order - Unit Costs */}
      <div className="bg-white rounded-xl border-2 border-gray-600 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100">
          <h3 className="text-base font-semibold text-slate-800">Cost Per Order (COGS)</h3>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {services.map(({ key, service }) => {
              // Per-order unit costs for each service
              const unitCostData: Record<string, { items: { label: string; value: string; note?: string }[] }> = {
                oec: { items: [{ label: 'DMW Fees', value: 'AED 61.5' }] },
                owwa: { items: [{ label: 'OWWA Fees', value: 'AED 92' }] },
                ttl: { items: [
                  { label: 'Embassy Fees', value: 'Varies*', note: 'Single: 425, Double: 565, Multiple: 745' },
                  { label: 'Transport', value: 'AED 100' }
                ]},
                tte: { items: [
                  { label: 'Embassy Fees', value: 'Varies*', note: 'Single: 370, Multiple: 470' },
                  { label: 'Transport', value: 'AED 100' }
                ]},
                ttj: { items: [
                  { label: 'Embassy Fees', value: 'AED 220' },
                  { label: '3rd Party', value: 'AED 100' }
                ]},
                schengen: { items: [] },
                gcc: { items: [{ label: 'Dubai Police', value: 'AED 220' }] },
                ethiopianPP: { items: [{ label: 'Gov. Fees', value: 'AED 1,350' }] },
                filipinaPP: { items: [] },
              };
              
              const costs = unitCostData[key];
              const hasServiceFee = service.serviceFees > 0;
              const hasAnyCosts = (costs && costs.items.length > 0) || hasServiceFee;
              
              if (!hasAnyCosts) return null;
              
              return (
                <div key={key} className="bg-slate-50 rounded-lg p-3 space-y-2">
                  <p className="text-sm font-semibold text-slate-800 border-b border-slate-200 pb-2">
                    {SERVICE_LABELS[key]}
                  </p>
                  {costs?.items.map((item, idx) => (
                    <div key={idx}>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">{item.label}</span>
                        <span className="text-slate-700 font-medium">{item.value}</span>
                      </div>
                      {item.note && (
                        <p className="text-xs text-slate-400 mt-1">*{item.note}</p>
                      )}
                    </div>
                  ))}
                  {hasServiceFee && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Service Fee</span>
                      <span className="text-slate-700 font-medium">AED {service.serviceFees}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

