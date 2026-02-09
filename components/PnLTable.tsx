'use client';

import type { AggregatedPnL } from '@/lib/pnl-types';

interface PnLTableProps {
  data: AggregatedPnL | null;
}

export default function PnLTable({ data }: PnLTableProps) {
  if (!data) return null;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: 'AED',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const serviceLabels: Record<string, string> = {
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

  const services = Object.entries(data.services).map(([key, service]) => ({
    ...service,
    key,
    name: serviceLabels[key] || key,
  }));

  // Calculate totals (service fees are per-order, don't sum them)
  const totals = {
    volume: services.reduce((sum, s) => sum + s.volume, 0),
    totalRevenue: services.reduce((sum, s) => sum + s.totalRevenue, 0),
    totalCost: services.reduce((sum, s) => sum + s.totalCost, 0),
    grossProfit: services.reduce((sum, s) => sum + s.grossProfit, 0),
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
              Service
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
              Volume
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
              Avg. Price
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
              Service Fee
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
              Revenue
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
              Cost
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
              Gross Profit
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
              Margin
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {services.map((service) => {
            const margin = service.totalRevenue > 0 
              ? ((service.grossProfit / service.totalRevenue) * 100).toFixed(1)
              : '0.0';
            
            return (
              <tr key={service.key} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 text-sm font-medium text-slate-800">
                  {service.name}
                </td>
                <td className="px-4 py-3 text-sm text-right text-slate-600">
                  {service.volume.toLocaleString()}
                </td>
                <td className="px-4 py-3 text-sm text-right text-slate-600">
                  {formatCurrency(service.price)}
                </td>
                <td className="px-4 py-3 text-sm text-right text-slate-600">
                  {service.serviceFees > 0 ? formatCurrency(service.serviceFees) : '—'}
                </td>
                <td className="px-4 py-3 text-sm text-right text-slate-800 font-medium">
                  {formatCurrency(service.totalRevenue)}
                </td>
                <td className="px-4 py-3 text-sm text-right text-slate-600">
                  {formatCurrency(service.totalCost)}
                </td>
                <td className={`px-4 py-3 text-sm text-right font-semibold ${
                  service.grossProfit >= 0 ? 'text-slate-800' : 'text-red-600'
                }`}>
                  {formatCurrency(service.grossProfit)}
                </td>
                <td className={`px-4 py-3 text-sm text-right font-medium ${
                  parseFloat(margin) > 0 ? 'text-green-600' : parseFloat(margin) < 0 ? 'text-red-600' : 'text-slate-500'
                }`}>
                  {margin}%
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot className="bg-slate-100 font-semibold">
          <tr>
            <td className="px-4 py-3 text-sm text-slate-800">
              Total
            </td>
            <td className="px-4 py-3 text-sm text-right text-slate-800">
              {totals.volume.toLocaleString()}
            </td>
            <td className="px-4 py-3 text-sm text-right text-slate-500">
              —
            </td>
            <td className="px-4 py-3 text-sm text-right text-slate-500">
              —
            </td>
            <td className="px-4 py-3 text-sm text-right text-slate-800">
              {formatCurrency(totals.totalRevenue)}
            </td>
            <td className="px-4 py-3 text-sm text-right text-slate-600">
              {formatCurrency(totals.totalCost)}
            </td>
            <td className={`px-4 py-3 text-sm text-right ${
              totals.grossProfit >= 0 ? 'text-slate-800' : 'text-red-600'
            }`}>
              {formatCurrency(totals.grossProfit)}
            </td>
            <td className={`px-4 py-3 text-sm text-right ${
              totals.grossProfit >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {totals.totalRevenue > 0 
                ? ((totals.grossProfit / totals.totalRevenue) * 100).toFixed(1) 
                : '0.0'}%
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
