'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface ProspectDetail {
  id: string;
  maidId: string;
  clientId: string;
  isOECProspect: boolean;
  isOWWAProspect: boolean;
  isTravelVisaProspect: boolean;
}

interface HouseholdGroup {
  householdId: string;
  contractId: string;
  members: ProspectDetail[];
  hasClient: boolean;
  hasMaid: boolean;
  prospectTypes: {
    oec: boolean;
    owwa: boolean;
    travelVisa: boolean;
  };
}

interface AskingByChartProps {
  prospectDetails?: ProspectDetail[];
  households?: HouseholdGroup[];
  serviceFilter?: 'oec' | 'owwa' | 'travelVisa';
}

export default function AskingByChart({ prospectDetails, households, serviceFilter }: AskingByChartProps) {
  if (!prospectDetails || prospectDetails.length === 0) {
    return (
      <div className="flex items-center justify-center h-80 bg-white rounded-xl border border-slate-200">
        <p className="text-slate-400">No prospect data available</p>
      </div>
    );
  }

  // Get all contract IDs that are part of households (have both maid and client)
  const householdContractIds = new Set<string>();
  const householdProspectTypes: Record<string, { oec: boolean; owwa: boolean; travelVisa: boolean }> = {};
  
  if (households) {
    households.forEach(h => {
      if (h.hasClient && h.hasMaid) {
        householdContractIds.add(h.contractId);
        householdProspectTypes[h.contractId] = h.prospectTypes;
      }
    });
  }

  // Calculate metrics for each service
  const metrics = {
    oec: { maid: 0, client: 0, household: 0 },
    owwa: { maid: 0, client: 0, household: 0 },
    travelVisa: { maid: 0, client: 0, household: 0 },
  };

  // Track which households we've already counted
  const countedHouseholds = {
    oec: new Set<string>(),
    owwa: new Set<string>(),
    travelVisa: new Set<string>(),
  };

  prospectDetails.forEach(prospect => {
    // Extract contract ID from prospect ID if available
    const contractId = (prospect as { contractId?: string }).contractId;
    
    // Check if this prospect is part of a household
    const isPartOfHousehold = contractId && householdContractIds.has(contractId);
    
    // Determine who is asking
    const isMaidAsking = prospect.maidId && !prospect.clientId;
    const isClientAsking = prospect.clientId && !prospect.maidId;
    
    // OEC
    if (prospect.isOECProspect) {
      if (isPartOfHousehold && contractId) {
        if (!countedHouseholds.oec.has(contractId)) {
          metrics.oec.household++;
          countedHouseholds.oec.add(contractId);
        }
      } else if (isMaidAsking) {
        metrics.oec.maid++;
      } else if (isClientAsking) {
        metrics.oec.client++;
      }
    }
    
    // OWWA
    if (prospect.isOWWAProspect) {
      if (isPartOfHousehold && contractId) {
        if (!countedHouseholds.owwa.has(contractId)) {
          metrics.owwa.household++;
          countedHouseholds.owwa.add(contractId);
        }
      } else if (isMaidAsking) {
        metrics.owwa.maid++;
      } else if (isClientAsking) {
        metrics.owwa.client++;
      }
    }
    
    // Travel Visa
    if (prospect.isTravelVisaProspect) {
      if (isPartOfHousehold && contractId) {
        if (!countedHouseholds.travelVisa.has(contractId)) {
          metrics.travelVisa.household++;
          countedHouseholds.travelVisa.add(contractId);
        }
      } else if (isMaidAsking) {
        metrics.travelVisa.maid++;
      } else if (isClientAsking) {
        metrics.travelVisa.client++;
      }
    }
  });

  // Build data based on service filter
  const allData = [
    {
      name: 'OEC',
      key: 'oec' as const,
      Maid: metrics.oec.maid,
      Client: metrics.oec.client,
      Household: metrics.oec.household,
    },
    {
      name: 'OWWA',
      key: 'owwa' as const,
      Maid: metrics.owwa.maid,
      Client: metrics.owwa.client,
      Household: metrics.owwa.household,
    },
    {
      name: 'Travel Visa',
      key: 'travelVisa' as const,
      Maid: metrics.travelVisa.maid,
      Client: metrics.travelVisa.client,
      Household: metrics.travelVisa.household,
    },
  ];

  const data = serviceFilter 
    ? allData.filter(d => d.key === serviceFilter)
    : allData;

  const total = data.reduce(
    (sum, m) => sum + m.Maid + m.Client + m.Household,
    0
  );

  const serviceLabels: Record<string, string> = {
    oec: 'OEC',
    owwa: 'OWWA',
    travelVisa: 'Travel Visa',
  };

  const chartTitle = serviceFilter 
    ? `Who Is Asking for ${serviceLabels[serviceFilter]}`
    : 'Who Is Asking by Service';

  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-80 bg-white rounded-xl border border-slate-200">
        <p className="text-slate-400">No prospects detected yet</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-slate-800">{chartTitle}</h3>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: '#f59e0b' }} />
            <span className="text-slate-600">Maid</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: '#3b82f6' }} />
            <span className="text-slate-600">Client</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: '#10b981' }} />
            <span className="text-slate-600">Household</span>
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
            allowDecimals={false}
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
            dataKey="Maid" 
            fill="#f59e0b" 
            radius={[4, 4, 0, 0]}
            maxBarSize={40}
          />
          <Bar 
            dataKey="Client" 
            fill="#3b82f6" 
            radius={[4, 4, 0, 0]}
            maxBarSize={40}
          />
          <Bar 
            dataKey="Household" 
            fill="#10b981" 
            radius={[4, 4, 0, 0]}
            maxBarSize={40}
          />
        </BarChart>
      </ResponsiveContainer>

      {/* Summary */}
      <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-3 gap-4 text-center">
        {data.map((item) => (
          <div key={item.name}>
            <p className="text-xs text-slate-500 mb-1">{item.name}</p>
            <div className="flex justify-center gap-2 text-xs flex-wrap">
              <span className="text-amber-600 font-medium">M: {item.Maid}</span>
              <span className="text-blue-600 font-medium">C: {item.Client}</span>
              <span className="text-emerald-600 font-medium">H: {item.Household}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

