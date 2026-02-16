import { NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import { parsePnLFile, aggregatePnLData } from '@/lib/pnl-parser';
import { getPnLConfigHistory } from '@/lib/pnl-config-storage';
import { aggregateDailyComplaints } from '@/lib/daily-complaints-storage';
import type { ServicePnL, AggregatedPnL } from '@/lib/pnl-types';
import type { PnLConfigSnapshot } from '@/lib/pnl-config-types';
import { DEFAULT_CONFIG_SNAPSHOT } from '@/lib/pnl-config-types';

// Force Node.js runtime for filesystem access (required for fs operations)
export const runtime = 'nodejs';
// Disable caching for P&L data
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Service keys for P&L
type PnLServiceKey = 'oec' | 'owwa' | 'ttl' | 'tte' | 'ttj' | 'schengen' | 'gcc' | 'ethiopianPP' | 'filipinaPP';
const ALL_SERVICE_KEYS: PnLServiceKey[] = ['oec', 'owwa', 'ttl', 'tte', 'ttj', 'schengen', 'gcc', 'ethiopianPP', 'filipinaPP'];

const PNL_DIR = path.join(process.cwd(), 'P&L');

// Fixed unit prices for each service (revenue per sale)
const SERVICE_PRICES: Record<PnLServiceKey, number> = {
  oec: 61.5,
  owwa: 92,
  ttl: 500, // Average across entry types
  tte: 420, // Average across entry types
  ttj: 320,
  schengen: 450, // Average
  gcc: 220,
  ethiopianPP: 1350,
  filipinaPP: 600, // Average
};

// Create service P&L from volume and config prices/costs
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
    
    // Try daily complaints data FIRST (primary source)
    const dailyComplaintsResult = await aggregateDailyComplaints(startDate, endDate);
    const hasDailyData = dailyComplaintsResult.success && dailyComplaintsResult.data;
    
    // Check if P&L Excel files exist
    const hasExcelFiles = fs.existsSync(PNL_DIR) && 
      fs.readdirSync(PNL_DIR).some(f => f.endsWith('.xlsx') || f.endsWith('.xls'));
    
    // Determine which source to use (daily complaints takes priority)
    const useComplaints = source === 'complaints' || 
      (source === 'auto' && hasDailyData);
    const useExcel = source === 'excel' || 
      (source === 'auto' && !hasDailyData && hasExcelFiles);
    
    // If using daily complaints data (PRIMARY SOURCE)
    if (useComplaints && hasDailyData && dailyComplaintsResult.data) {
      console.log('[P&L] Using daily complaints data');
      
      const dailyData = dailyComplaintsResult.data;
      
      // Get configuration history for cost calculations
      const configHistory = await getPnLConfigHistory();
      const latestConfig = configHistory.configurations[configHistory.configurations.length - 1] || DEFAULT_CONFIG_SNAPSHOT;
      
      const services: AggregatedPnL['services'] = {} as AggregatedPnL['services'];
      
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
      
      // Create P&L for each service using config prices and costs
      ALL_SERVICE_KEYS.forEach(key => {
        const serviceConfig = latestConfig.services[key];
        const volume = dailyData.volumes[key];
        const price = SERVICE_PRICES[key]; // Use fixed prices
        const unitCost = serviceConfig.unitCost + (serviceConfig.serviceFee || 0);
        
        services[key] = createServiceFromVolume(
          serviceNames[key],
          volume,
          price,
          unitCost
        );
      });
      
      const totalRevenue = Object.values(services).reduce((sum, s) => sum + s.totalRevenue, 0);
      const totalCost = Object.values(services).reduce((sum, s) => sum + s.totalCost, 0);
      const totalGrossProfit = Object.values(services).reduce((sum, s) => sum + s.grossProfit, 0);
      
      // Calculate number of months in the date range
      let numberOfMonths = 1;
      if (dailyData.dateRange.start && dailyData.dateRange.end) {
        const start = new Date(dailyData.dateRange.start);
        const end = new Date(dailyData.dateRange.end);
        const yearDiff = end.getFullYear() - start.getFullYear();
        const monthDiff = end.getMonth() - start.getMonth();
        numberOfMonths = yearDiff * 12 + monthDiff + 1;
      }
      
      // Fixed costs multiplied by number of months
      const monthlyFixedCosts = latestConfig.fixedCosts;
      const fixedCosts = {
        laborCost: monthlyFixedCosts.laborCost * numberOfMonths,
        llm: monthlyFixedCosts.llm * numberOfMonths,
        proTransportation: monthlyFixedCosts.proTransportation * numberOfMonths,
        total: (monthlyFixedCosts.laborCost + monthlyFixedCosts.llm + monthlyFixedCosts.proTransportation) * numberOfMonths,
      };
      
      const aggregated: AggregatedPnL = {
        files: ['daily-complaints-data'],
        services,
        summary: {
          totalRevenue,
          totalCost,
          totalGrossProfit,
          fixedCosts,
          netProfit: totalGrossProfit - fixedCosts.total,
        },
      };
      
      // Build daily complaints info for display
      const complaintsInfo = {
        totalComplaints: dailyData.totalComplaints,
        dateRange: dailyData.dateRange,
        source: 'Daily Complaints (Date-based)',
        serviceBreakdown: {} as Record<string, { uniqueSales: number }>,
      };
      
      // Add service breakdown
      ALL_SERVICE_KEYS.forEach(key => {
        complaintsInfo.serviceBreakdown[key] = {
          uniqueSales: dailyData.volumes[key],
        };
      });

      return NextResponse.json({
        source: 'complaints',
        aggregated,
        dateFilter: startDate || endDate ? { startDate, endDate } : null,
        availableMonths: [],
        complaintsData: complaintsInfo,
        files: null,
        fileCount: 0,
        monthsInRange: numberOfMonths,
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
      error: 'No P&L data available. Upload complaints via /api/complaints-daily or add Excel files to P&L directory.',
      source: 'none',
      hasComplaintsData: false,
      hasExcelFiles: false,
    }, { status: 404 });
    
  } catch (error) {
    console.error('Error fetching P&L data:', error);
    return NextResponse.json({ error: 'Failed to fetch P&L data' }, { status: 500 });
  }
}
