'use client';

import NPSScoreDistributionChart from '@/components/NPSScoreDistributionChart';
import type { NPSServiceMetrics } from '@/lib/nps-types';

interface NPSServiceScoreDistributionProps {
  services: NPSServiceMetrics[];
  isLoading?: boolean;
}

export default function NPSServiceScoreDistribution({ services, isLoading }: NPSServiceScoreDistributionProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200 p-6 animate-pulse">
            <div className="h-6 bg-slate-200 rounded w-48 mb-4"></div>
            <div className="h-64 bg-slate-100 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  if (!services || services.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-slate-800">Service Score Distributions</h3>
      {services.map((service) => (
        <div key={service.service} className="bg-white rounded-xl border border-slate-200 p-6">
          <h4 className="text-lg font-semibold text-slate-800 mb-4">{service.service}</h4>
          <NPSScoreDistributionChart metrics={service.metrics} isLoading={false} />
        </div>
      ))}
    </div>
  );
}

