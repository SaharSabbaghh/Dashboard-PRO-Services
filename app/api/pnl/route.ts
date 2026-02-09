import { NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import { parsePnLFile, aggregatePnLData } from '@/lib/pnl-parser';
import { getPnLComplaintsData, getServiceVolumes } from '@/lib/pnl-complaints-processor';
import type { ServicePnL, AggregatedPnL } from '@/lib/pnl-types';
import type { PnLServiceKey } from '@/lib/pnl-complaints-types';

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
    
    // Try to get complaint-derived data first
    const complaintsData = getPnLComplaintsData();
    const volumes = getServiceVolumes();
    const hasComplaintsData = complaintsData && complaintsData.summary.totalUniqueSales > 0;
    
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
      
      return NextResponse.json({
        source: 'complaints',
        aggregated,
        complaintsData: {
          lastUpdated: complaintsData!.lastUpdated,
          rawComplaintsCount: complaintsData!.rawComplaintsCount,
          summary: complaintsData!.summary,
          serviceBreakdown: Object.fromEntries(
            Object.entries(complaintsData!.services).map(([key, service]) => [
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
