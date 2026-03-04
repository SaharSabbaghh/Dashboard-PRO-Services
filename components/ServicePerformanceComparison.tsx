'use client';

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { OperationMetric } from '@/lib/operations-types';

interface ServicePerformanceComparisonProps {
  operations: OperationMetric[];
  mtdData: Record<string, number>;
}

export default function ServicePerformanceComparison({ 
  operations, 
  mtdData 
}: ServicePerformanceComparisonProps) {

  const services = operations.map(op => {
    const totalPending = op.pendingUs + op.pendingClient + op.pendingProVisit + op.pendingGov;
    const totalCases = totalPending + op.doneToday + op.casesDelayed;
    const delayRate = totalCases > 0 ? (op.casesDelayed / totalCases) * 100 : 0;
    const completionRate = totalPending > 0 
      ? (op.doneToday / (totalPending + op.doneToday)) * 100 
      : (op.doneToday > 0 ? 100 : 0);

    return {
      name: op.serviceType,
      totalPending,
      doneToday: op.doneToday,
      casesDelayed: op.casesDelayed,
      delayRate,
      completionRate,
      mtd: mtdData[op.serviceType] || 0,
    };
  }).sort((a, b) => b.delayRate - a.delayRate);

  return (
    <div className="bg-white rounded-xl border-2 border-slate-200 overflow-hidden shadow-sm">
      <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
        <h3 className="text-lg font-bold text-slate-900">Service Performance</h3>
        <p className="text-sm text-slate-600 mt-1">Delay and completion rates by service</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left py-3 px-6 text-xs font-semibold text-slate-600 uppercase tracking-wider">Service</th>
              <th className="text-center py-3 px-6 text-xs font-semibold text-slate-600 uppercase tracking-wider">Delay Rate</th>
              <th className="text-center py-3 px-6 text-xs font-semibold text-slate-600 uppercase tracking-wider">Completion Rate</th>
              <th className="text-center py-3 px-6 text-xs font-semibold text-slate-600 uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {services.map((s) => {
              const status = s.delayRate > 40 ? 'critical' : s.delayRate > 20 ? 'warning' : 'good';
              return (
                <tr key={s.name} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-6">
                    <span className="font-semibold text-sm text-slate-900">{s.name}</span>
                  </td>
                  <td className="py-3 px-6 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      {s.delayRate > 20 ? (
                        <TrendingUp className="w-3.5 h-3.5 text-red-500" />
                      ) : s.delayRate > 0 ? (
                        <Minus className="w-3.5 h-3.5 text-amber-500" />
                      ) : (
                        <TrendingDown className="w-3.5 h-3.5 text-green-500" />
                      )}
                      <span className={`text-sm font-medium ${
                        s.delayRate > 20 ? 'text-red-600' : s.delayRate > 0 ? 'text-amber-600' : 'text-green-600'
                      }`}>
                        {s.delayRate.toFixed(1)}%
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-6 text-center">
                    <span className={`text-sm font-medium ${
                      s.completionRate >= 50 ? 'text-green-600' : s.completionRate >= 25 ? 'text-blue-600' : 'text-slate-600'
                    }`}>
                      {s.completionRate.toFixed(1)}%
                    </span>
                  </td>
                  <td className="py-3 px-6 text-center">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      status === 'critical' 
                        ? 'bg-red-100 text-red-700' 
                        : status === 'warning' 
                          ? 'bg-amber-100 text-amber-700' 
                          : 'bg-green-100 text-green-700'
                    }`}>
                      {status === 'critical' ? 'Critical' : status === 'warning' ? 'Attention' : 'Good'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

