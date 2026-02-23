import { NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import { parsePnLFile, aggregatePnLData } from '@/lib/pnl-parser';
import { aggregateDailyComplaints } from '@/lib/daily-complaints-storage';
import { ALL_SERVICE_KEYS } from '@/lib/pnl-complaints-types';
import type { PnLServiceKey } from '@/lib/pnl-complaints-types';
import type { ServicePnL, AggregatedPnL } from '@/lib/pnl-types';
import { getDefaultPnLConfig, loadPnLConfig } from '@/lib/pnl-config';

// Force Node.js runtime for filesystem access (required for fs operations)
export const runtime = 'nodejs';
// Disable caching for P&L data
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const PNL_DIR = path.join(process.cwd(), 'P&L');

// Optional: Set remote config URL via environment variable
// If not set, uses defaults (no network call)
const CONFIG_URL = process.env.PNL_CONFIG_URL;

// Create service P&L from volume and config
// Formula: Revenue = (serviceFee + actualCost) × volume
//          Gross Profit = Revenue - Cost = serviceFee × volume
function createServiceFromVolume(
  name: string, 
  volume: number, 
  actualCost: number,    // The actual cost per unit to the company
  serviceFee: number     // Service fee (markup) per unit
): ServicePnL {
  const totalCost = volume * actualCost;
  const totalRevenue = volume * (serviceFee + actualCost);
  const grossProfit = totalRevenue - totalCost; // = serviceFee × volume
  
  return {
    name,
    volume,
    price: serviceFee + actualCost,  // Price per unit (what customer pays)
    serviceFees: serviceFee,          // Service fee per unit
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
    const viewMode = searchParams.get('viewMode') || 'monthly'; // 'daily', 'monthly'
    
    console.log('[P&L] GET request - startDate:', startDate, 'endDate:', endDate, 'viewMode:', viewMode);
    
    // Load config safely (with fallback to defaults)
    let pnlConfig;
    try {
      pnlConfig = await loadPnLConfig(CONFIG_URL);
    } catch (error) {
      console.error('[P&L] Config load error, using defaults:', error);
      pnlConfig = getDefaultPnLConfig();
    }
    
    // Try daily complaints data FIRST (primary source)
    const dailyComplaintsResult = await aggregateDailyComplaints(startDate, endDate);
    const hasDailyData = dailyComplaintsResult.success && dailyComplaintsResult.data;
    
    console.log('[P&L] Daily complaints result:', { 
      success: dailyComplaintsResult.success, 
      hasDailyData,
      error: dailyComplaintsResult.error 
    });
    
    // Check if P&L Excel files exist (wrapped for serverless safety)
    let hasExcelFiles = false;
    try {
      hasExcelFiles = fs.existsSync(PNL_DIR) && 
        fs.readdirSync(PNL_DIR).some(f => f.endsWith('.xlsx') || f.endsWith('.xls'));
    } catch {
      // fs operations may fail in serverless
    }
    
    // Determine which source to use (daily complaints takes priority)
    const useComplaints = source === 'complaints' || 
      (source === 'auto' && hasDailyData);
    const useExcel = source === 'excel' || 
      (source === 'auto' && !hasDailyData && hasExcelFiles);
    
    // If using daily complaints data (PRIMARY SOURCE)
    if (useComplaints && hasDailyData && dailyComplaintsResult.data) {
      console.log('[P&L] Using daily complaints data');
      
      const dailyData = dailyComplaintsResult.data;
      
      const services: AggregatedPnL['services'] = {} as AggregatedPnL['services'];
      
      const serviceNames = {
        oec: 'OEC',
        owwa: 'OWWA',
        ttl: 'Travel to Lebanon',
        ttlSingle: 'Tourist Visa to Lebanon – Single Entry',
        ttlDouble: 'Tourist Visa to Lebanon – Double Entry',
        ttlMultiple: 'Tourist Visa to Lebanon – Multiple Entry',
        tte: 'Travel to Egypt',
        tteSingle: 'Tourist Visa to Egypt – Single Entry',
        tteDouble: 'Tourist Visa to Egypt – Double Entry',
        tteMultiple: 'Tourist Visa to Egypt – Multiple Entry',
        ttj: 'Travel to Jordan',
        schengen: 'Schengen Countries',
        gcc: 'GCC',
        ethiopianPP: 'Ethiopian Passport Renewal',
        filipinaPP: 'Filipina Passport Renewal',
      };
      
      // Create P&L for each service using config
      // Revenue = (serviceFee + unitCost) × volume
      // Gross Profit = serviceFee × volume
      ALL_SERVICE_KEYS.forEach(key => {
        const volume = dailyData.volumes[key] || 0;
        const unitCost = pnlConfig.serviceCosts[key];
        const serviceFee = pnlConfig.serviceFees[key];
        
        services[key] = createServiceFromVolume(
          serviceNames[key],
          volume,
          unitCost,
          serviceFee
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
      
      // Fixed costs multiplied by number of months (from config)
      const fixedCosts = {
        laborCost: pnlConfig.monthlyFixedCosts.laborCost * numberOfMonths,
        llm: pnlConfig.monthlyFixedCosts.llm * numberOfMonths,
        proTransportation: pnlConfig.monthlyFixedCosts.proTransportation * numberOfMonths,
        total: (pnlConfig.monthlyFixedCosts.laborCost + pnlConfig.monthlyFixedCosts.llm + pnlConfig.monthlyFixedCosts.proTransportation) * numberOfMonths,
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

      // Get available dates for date picker
      const { getAvailableDailyComplaintsDates } = await import('@/lib/daily-complaints-storage');
      const datesResult = await getAvailableDailyComplaintsDates();
      const availableDates = datesResult.success && datesResult.dates ? datesResult.dates : [];
      
      // Convert dates to months for the picker (YYYY-MM format)
      const availableMonths = [...new Set(availableDates.map(d => d.substring(0, 7)))].sort();

      return NextResponse.json({
        source: 'complaints',
        aggregated,
        dateFilter: startDate || endDate ? { startDate, endDate } : null,
        viewMode,
        availableMonths,
        availableDates, // Include individual dates for daily view
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
    // Never crash - log and return safe error response
    console.error('[P&L] Error fetching P&L data:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch P&L data',
      details: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}
