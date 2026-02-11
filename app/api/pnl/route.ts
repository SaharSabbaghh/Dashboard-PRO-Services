import { NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import { parsePnLFile, aggregatePnLData } from '@/lib/pnl-parser';
import { getPnLComplaintsDataAsync } from '@/lib/pnl-complaints-processor';
import type { ServicePnL, AggregatedPnL } from '@/lib/pnl-types';
import type { PnLServiceKey, PnLComplaintsData } from '@/lib/pnl-complaints-types';
import { ALL_SERVICE_KEYS } from '@/lib/pnl-complaints-types';

// Disable caching for P&L data
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Filter complaints data by date range and recalculate volumes
function filterComplaintsDataByDate(
  data: PnLComplaintsData,
  startDate?: string,
  endDate?: string
): { volumes: Record<PnLServiceKey, number>; filteredData: PnLComplaintsData } {
  if (!startDate && !endDate) {
    // No filter, return original volumes
    const volumes: Record<PnLServiceKey, number> = {} as Record<PnLServiceKey, number>;
    for (const key of ALL_SERVICE_KEYS) {
      volumes[key] = data.services[key].uniqueSales;
    }
    return { volumes, filteredData: data };
  }

  const start = startDate ? new Date(startDate) : new Date(0);
  const end = endDate ? new Date(endDate + 'T23:59:59') : new Date('9999-12-31');

  // Calculate filtered volumes by counting sales within date range
  const volumes: Record<PnLServiceKey, number> = {} as Record<PnLServiceKey, number>;
  const filteredByMonth: Record<PnLServiceKey, Record<string, number>> = {} as Record<PnLServiceKey, Record<string, number>>;
  let totalFilteredSales = 0;
  let totalFilteredComplaints = 0;
  const uniqueClients = new Set<string>();
  const uniqueContracts = new Set<string>();

  for (const key of ALL_SERVICE_KEYS) {
    volumes[key] = 0;
    filteredByMonth[key] = {};
    const service = data.services[key];

    for (const sale of service.sales) {
      const saleDate = new Date(sale.firstSaleDate);
      if (saleDate >= start && saleDate <= end) {
        volumes[key]++;
        totalFilteredSales++;
        
        if (sale.clientId) uniqueClients.add(sale.clientId);
        if (sale.contractId) uniqueContracts.add(sale.contractId);

        // Count by month
        const monthKey = sale.firstSaleDate.substring(0, 7);
        filteredByMonth[key][monthKey] = (filteredByMonth[key][monthKey] || 0) + 1;

        // Count complaints in range
        for (const dateStr of sale.complaintDates) {
          const date = new Date(dateStr);
          if (date >= start && date <= end) {
            totalFilteredComplaints++;
          }
        }
      }
    }
  }

  // Create filtered data structure
  const filteredData: PnLComplaintsData = {
    ...data,
    rawComplaintsCount: totalFilteredComplaints,
    summary: {
      totalUniqueSales: totalFilteredSales,
      totalUniqueClients: uniqueClients.size,
      totalUniqueContracts: uniqueContracts.size,
    },
    services: {} as PnLComplaintsData['services'],
  };

  for (const key of ALL_SERVICE_KEYS) {
    filteredData.services[key] = {
      ...data.services[key],
      uniqueSales: volumes[key],
      byMonth: filteredByMonth[key],
      uniqueClients: new Set(
        data.services[key].sales
          .filter(s => {
            const d = new Date(s.firstSaleDate);
            return d >= start && d <= end;
          })
          .map(s => s.clientId)
          .filter(Boolean)
      ).size,
      uniqueContracts: new Set(
        data.services[key].sales
          .filter(s => {
            const d = new Date(s.firstSaleDate);
            return d >= start && d <= end;
          })
          .map(s => s.contractId)
          .filter(Boolean)
      ).size,
    };
  }

  return { volumes, filteredData };
}

const PNL_DIR = path.join(process.cwd(), 'P&L');

// Unit prices for each service (revenue per sale)
const SERVICE_PRICES: Record<PnLServiceKey, number> = {
  oec: 61.5,
  owwa: 92,
  ttl: 500, // Average across entry types
  tte: 420, // Average across entry types
  ttj: 320,
  schengen: 0, // Price varies
  gcc: 220,
  ethiopianPP: 1350,
  filipinaPP: 0, // Price varies
};

// Unit costs for each service
const SERVICE_UNIT_COSTS: Record<PnLServiceKey, number> = {
  oec: 61.5,    // DMW Fees
  owwa: 92,     // OWWA Fees
  ttl: 400,     // Embassy + transport (average)
  tte: 370,     // Embassy + transport (average)
  ttj: 320,     // Embassy + facilitator
  schengen: 0,
  gcc: 220,     // Dubai Police
  ethiopianPP: 1350, // Government fees
  filipinaPP: 0,
};

// Map service keys to aggregated services keys
const SERVICE_KEY_MAP: Record<PnLServiceKey, keyof AggregatedPnL['services']> = {
  oec: 'oec',
  owwa: 'owwa',
  ttl: 'ttl',
  tte: 'tte',
  ttj: 'ttj',
  schengen: 'schengen',
  gcc: 'gcc',
  ethiopianPP: 'ethiopianPP',
  filipinaPP: 'filipinaPP',
};

// Create service P&L from complaint-derived volume
function createServiceFromVolume(
  name: string, 
  volume: number, 
  price: number, 
  unitCost: number
): ServicePnL {
  const totalRevenue = volume * price;
  const totalCost = volume * unitCost;
  const grossProfit = totalRevenue - totalCost;
  
  return {
    name,
    volume,
    price,
    serviceFees: 0,
    totalRevenue,
    totalCost,
    grossProfit,
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const source = searchParams.get('source') || 'auto'; // 'auto', 'complaints', 'excel'
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    
    // Try to get complaint-derived data first
    const complaintsData = await getPnLComplaintsDataAsync();
    const hasComplaintsData = complaintsData && complaintsData.summary.totalUniqueSales > 0;
    
    // Apply date filter if provided
    let volumes: Record<PnLServiceKey, number>;
    let filteredComplaintsData: PnLComplaintsData | null = complaintsData;
    
    if (hasComplaintsData && complaintsData) {
      const filtered = filterComplaintsDataByDate(complaintsData, startDate, endDate);
      volumes = filtered.volumes;
      filteredComplaintsData = filtered.filteredData;
    } else {
      volumes = {
        oec: 0, owwa: 0, ttl: 0, tte: 0, ttj: 0,
        schengen: 0, gcc: 0, ethiopianPP: 0, filipinaPP: 0,
      };
    }
    
    // Check if P&L Excel files exist
    const hasExcelFiles = fs.existsSync(PNL_DIR) && 
      fs.readdirSync(PNL_DIR).some(f => f.endsWith('.xlsx') || f.endsWith('.xls'));
    
    // Determine which source to use
    const useComplaints = source === 'complaints' || 
      (source === 'auto' && hasComplaintsData);
    const useExcel = source === 'excel' || 
      (source === 'auto' && !hasComplaintsData && hasExcelFiles);
    
    // If using complaints data
    if (useComplaints && hasComplaintsData) {
      // Build P&L from complaint-derived volumes
      const serviceNames: Record<PnLServiceKey, string> = {
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
      
      const services: AggregatedPnL['services'] = {
        oec: createServiceFromVolume(serviceNames.oec, volumes.oec, SERVICE_PRICES.oec, SERVICE_UNIT_COSTS.oec),
        owwa: createServiceFromVolume(serviceNames.owwa, volumes.owwa, SERVICE_PRICES.owwa, SERVICE_UNIT_COSTS.owwa),
        ttl: createServiceFromVolume(serviceNames.ttl, volumes.ttl, SERVICE_PRICES.ttl, SERVICE_UNIT_COSTS.ttl),
        tte: createServiceFromVolume(serviceNames.tte, volumes.tte, SERVICE_PRICES.tte, SERVICE_UNIT_COSTS.tte),
        ttj: createServiceFromVolume(serviceNames.ttj, volumes.ttj, SERVICE_PRICES.ttj, SERVICE_UNIT_COSTS.ttj),
        schengen: createServiceFromVolume(serviceNames.schengen, volumes.schengen, SERVICE_PRICES.schengen, SERVICE_UNIT_COSTS.schengen),
        gcc: createServiceFromVolume(serviceNames.gcc, volumes.gcc, SERVICE_PRICES.gcc, SERVICE_UNIT_COSTS.gcc),
        ethiopianPP: createServiceFromVolume(serviceNames.ethiopianPP, volumes.ethiopianPP, SERVICE_PRICES.ethiopianPP, SERVICE_UNIT_COSTS.ethiopianPP),
        filipinaPP: createServiceFromVolume(serviceNames.filipinaPP, volumes.filipinaPP, SERVICE_PRICES.filipinaPP, SERVICE_UNIT_COSTS.filipinaPP),
      };
      
      const totalRevenue = Object.values(services).reduce((sum, s) => sum + s.totalRevenue, 0);
      const totalCost = Object.values(services).reduce((sum, s) => sum + s.totalCost, 0);
      const totalGrossProfit = Object.values(services).reduce((sum, s) => sum + s.grossProfit, 0);
      
      // Fixed costs (monthly)
      const fixedCosts = {
        laborCost: 55000,
        llm: 3650,
        proTransportation: 2070,
        total: 60720,
      };
      
      const aggregated: AggregatedPnL = {
        files: ['complaints-data'],
        services,
        summary: {
          totalRevenue,
          totalCost,
          totalGrossProfit,
          fixedCosts,
          netProfit: totalGrossProfit - fixedCosts.total,
        },
      };
      
      // Collect all available months from original data for the date picker
      const allAvailableMonths = new Set<string>();
      for (const key of ALL_SERVICE_KEYS) {
        Object.keys(complaintsData!.services[key].byMonth).forEach(month => {
          allAvailableMonths.add(month);
        });
      }

      return NextResponse.json({
        source: 'complaints',
        aggregated,
        dateFilter: startDate || endDate ? { startDate, endDate } : null,
        availableMonths: Array.from(allAvailableMonths).sort(),
        complaintsData: {
          lastUpdated: complaintsData!.lastUpdated,
          rawComplaintsCount: filteredComplaintsData!.rawComplaintsCount,
          summary: filteredComplaintsData!.summary,
          serviceBreakdown: Object.fromEntries(
            Object.entries(filteredComplaintsData!.services).map(([key, service]) => [
              key,
              {
                uniqueSales: service.uniqueSales,
                uniqueClients: service.uniqueClients,
                totalComplaints: service.totalComplaints,
                byMonth: service.byMonth,
              }
            ])
          ),
        },
        files: null,
        fileCount: 0,
      });
    }
    
    // Fall back to Excel files
    if (useExcel && hasExcelFiles) {
      // Get all Excel files in the P&L directory
      const files = fs.readdirSync(PNL_DIR)
        .filter(file => file.endsWith('.xlsx') || file.endsWith('.xls'))
        .map(file => path.join(PNL_DIR, file));

      if (files.length === 0) {
        return NextResponse.json({ 
          error: 'No P&L files found',
          source: 'excel',
          hasComplaintsData,
        }, { status: 404 });
      }

      // Parse all P&L files
      const pnlDataList = files.map(file => {
        try {
          return parsePnLFile(file);
        } catch (err) {
          console.error(`Error parsing ${file}:`, err);
          return null;
        }
      }).filter(Boolean);

      if (pnlDataList.length === 0) {
        return NextResponse.json({ 
          error: 'Failed to parse P&L files',
          source: 'excel',
        }, { status: 500 });
      }

      // Aggregate all P&L data
      const aggregated = aggregatePnLData(pnlDataList as ReturnType<typeof parsePnLFile>[]);

      // Also return individual file data for detailed view
      return NextResponse.json({
        source: 'excel',
        aggregated,
        files: pnlDataList,
        fileCount: pnlDataList.length,
        complaintsData: null,
      });
    }
    
    // No data available
    return NextResponse.json({
      error: 'No P&L data available. Upload complaints via /api/ingest/pnl-complaints or add Excel files to P&L directory.',
      source: 'none',
      hasComplaintsData: false,
      hasExcelFiles: false,
    }, { status: 404 });
    
  } catch (error) {
    console.error('Error fetching P&L data:', error);
    return NextResponse.json({ error: 'Failed to fetch P&L data' }, { status: 500 });
  }
}
