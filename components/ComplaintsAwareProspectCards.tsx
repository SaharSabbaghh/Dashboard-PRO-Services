import React from 'react';

interface ComplaintsAwareProspectCardsProps {
  date: string;
  services: {
    oec: {
      prospects: number;
      conversions: number;
      withComplaints: number;
      conversionRate: number;
    };
    owwa: {
      prospects: number;
      conversions: number;
      withComplaints: number;
      conversionRate: number;
    };
    travelVisa: {
      prospects: number;
      conversions: number;
      withComplaints: number;
      conversionRate: number;
    };
    filipinaPassportRenewal: {
      prospects: number;
      conversions: number;
      withComplaints: number;
      conversionRate: number;
    };
    ethiopianPassportRenewal: {
      prospects: number;
      conversions: number;
      withComplaints: number;
      conversionRate: number;
    };
  };
  totalProspects: number;
  totalConversions: number;
  isLoading?: boolean;
}

export default function ComplaintsAwareProspectCards({
  date,
  services,
  totalProspects,
  totalConversions,
  isLoading = false
}: ComplaintsAwareProspectCardsProps) {
  
  const cards = [
    {
      title: 'Unique OEC Prospects',
      service: services.oec,
    },
    {
      title: 'Unique OWWA Prospects',
      service: services.owwa,
    },
    {
      title: 'Unique Visa Prospects',
      service: services.travelVisa,
    },
    {
      title: 'Filipina PP Renewal',
      service: services.filipinaPassportRenewal,
    },
    {
      title: 'Ethiopian PP Renewal',
      service: services.ethiopianPassportRenewal,
    },
  ];

  const overallConversionRate = totalProspects > 0 ? Math.round((totalConversions / totalProspects) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">
          Conversion Analysis for {date}
        </h3>
        <p className="text-sm text-blue-700">
          Shows conversion rates and complaint information for each service
        </p>
      </div>

      {/* Service cards row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {cards.map((card) => (
          <div
            key={card.title}
            className="bg-white rounded-xl p-5 border-2 border-slate-200 shadow-sm"
          >
            <p className="text-sm font-medium text-slate-600 mb-3">{card.title}</p>
            
            {/* Prospects count */}
            <p className="text-3xl font-bold text-slate-800 mb-2">
              {isLoading ? '...' : card.service.prospects}
            </p>
            
            {/* Conversion info */}
            {!isLoading && card.service.prospects > 0 && (
              <div className="space-y-2">
                {/* Regular conversions */}
                <div className="text-sm">
                  <span className="text-slate-600">
                    {card.service.conversions} converted ({card.service.conversionRate.toFixed(1)}%)
                  </span>
                </div>
                
                
                {/* Complaints info */}
                {card.service.withComplaints > 0 && (
                  <div className="text-xs text-red-500">
                    {card.service.withComplaints} with complaints
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Total Prospects */}
        <div className="bg-white border-2 border-slate-200 rounded-xl p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-600">Total Prospects</p>
          <p className="text-3xl font-bold mt-2 text-slate-800">
            {isLoading ? '...' : totalProspects}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Across all services
          </p>
        </div>

        {/* Overall Conversion Rate */}
        <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-5 shadow-sm">
          <p className="text-sm font-medium text-blue-700">Overall Conversion Rate</p>
          <p className="text-3xl font-bold mt-2 text-blue-800">
            {isLoading ? '...' : `${overallConversionRate}%`}
          </p>
          <p className="text-xs text-blue-600 mt-1">
            {totalConversions} of {totalProspects} converted
          </p>
        </div>

      </div>

      {/* Legend */}
      <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
        <h4 className="text-sm font-semibold text-slate-700 mb-2">Legend</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-slate-600">
          <div>
            <span className="font-medium">Regular Conversion:</span> Prospect who made a payment
          </div>
          <div>
            <span className="font-medium text-red-500">With Complaints:</span> Prospects who had complaints for the same service on this date
          </div>
        </div>
      </div>
    </div>
  );
}
