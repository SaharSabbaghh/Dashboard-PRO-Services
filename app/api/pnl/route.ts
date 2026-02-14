
import { NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import { parsePnLFile, aggregatePnLData } from '@/lib/pnl-parser';
import { getPaymentData } from '@/lib/payment-processor';
import type { ServicePnL, AggregatedPnL } from '@/lib/pnl-types';
import type { ProcessedPayment } from '@/lib/payment-types';

// Force Node.js runtime for filesystem access (required for fs operations)
export const runtime = 'nodejs';
// Disable caching for P&L data
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Service keys for P&L
type PnLServiceKey = 'oec' | 'owwa' | 'ttl' | 'tte' | 'ttj' | 'schengen' | 'gcc' | 'ethiopianPP' | 'filipinaPP';
const ALL_SERVICE_KEYS: PnLServiceKey[] = ['oec', 'owwa', 'ttl', 'tte', 'ttj', 'schengen', 'gcc', 'ethiopianPP', 'filipinaPP'];

interface PaymentInfo {
  lastUpdated: string;
  totalPayments: number;
  receivedPayments: number;
  summary: {
    totalUniqueSales: number;
    totalUniqueClients: number;
    totalUniqueContracts: number;
    totalRevenue: number; // Sum of all payment amounts
  };
  serviceBreakdown: Record<string, {
    uniqueSales: number;
    uniqueClients: number;
    totalPayments: number;
    totalRevenue: number; // Sum of payment amounts for this service
    avgRevenue: number; // Average payment amount
    byMonth: Record<string, number>;
  }>;
}

// Filter payment data by date range and recalculate volumes and revenues
function filterPaymentsDataByDate(
  payments: ProcessedPayment[],
  startDate?: string,
  endDate?: string
): { volumes: Record<PnLServiceKey, number>; revenues: Record<PnLServiceKey, number>; paymentInfo: PaymentInfo } {
  const start = startDate ? new Date(startDate) : new Date(0);
  const end = endDate ? new Date(endDate + 'T23:59:59') : new Date('9999-12-31');

  // Filter payments by date and status - ONLY RECEIVED
  const filteredPayments = payments.filter(p => {
    if (p.status !== 'received') return false;
    const paymentDate = new Date(p.dateOfPayment);
    return paymentDate >= start && paymentDate <= end;
  });

  // Calculate volumes (number of payments) and revenues by service
  const volumes: Record<PnLServiceKey, number> = {
    oec: 0, owwa: 0, ttl: 0, tte: 0, ttj: 0,
    schengen: 0, gcc: 0, ethiopianPP: 0, filipinaPP: 0,
  };
  
  const revenues: Record<PnLServiceKey, number> = {
    oec: 0, owwa: 0, ttl: 0, tte: 0, ttj: 0,
    schengen: 0, gcc: 0, ethiopianPP: 0, filipinaPP: 0,
  };
  
  const serviceBreakdown: Record<string, {
    totalPayments: number;
    totalRevenue: number;
    avgRevenue: number;
    byMonth: Record<string, number>;
  }> = {};

  // Initialize service breakdown
  ALL_SERVICE_KEYS.forEach(key => {
    serviceBreakdown[key] = {
      totalPayments: 0,
      totalRevenue: 0,
      avgRevenue: 0,
      byMonth: {},
    };
  });

  let totalRevenue = 0;

  // Process each payment
  filteredPayments.forEach(payment => {
    let serviceKey: PnLServiceKey | null = null;

    // Map payment service to P&L service key
    if (payment.service === 'oec') {
      serviceKey = 'oec';
    } else if (payment.service === 'owwa') {
      serviceKey = 'owwa';
    } else if (payment.service === 'filipina_pp') {
      serviceKey = 'filipinaPP';
    } else if (payment.service === 'ethiopian_pp') {
      serviceKey = 'ethiopianPP';
    } else if (payment.service === 'travel_visa') {
      // Map travel visa to specific destination
      const paymentTypeLower = payment.paymentType.toLowerCase();
      if (paymentTypeLower.includes('lebanon')) {
        serviceKey = 'ttl';
      } else if (paymentTypeLower.includes('egypt')) {
        serviceKey = 'tte';
      } else if (paymentTypeLower.includes('jordan')) {
        serviceKey = 'ttj';
      } else if (paymentTypeLower.includes('schengen')) {
        serviceKey = 'schengen';
      } else if (paymentTypeLower.includes('gcc')) {
        serviceKey = 'gcc';
      } else {
        // Default to TTL if destination unclear
        serviceKey = 'ttl';
      }
    }

    if (serviceKey) {
      volumes[serviceKey]++;
      revenues[serviceKey] += payment.amountOfPayment;
      totalRevenue += payment.amountOfPayment;

      // Count by month
      const monthKey = payment.dateOfPayment.substring(0, 7); // "YYYY-MM"
      serviceBreakdown[serviceKey].byMonth[monthKey] = 
        (serviceBreakdown[serviceKey].byMonth[monthKey] || 0) + 1;
      serviceBreakdown[serviceKey].totalPayments++;
      serviceBreakdown[serviceKey].totalRevenue += payment.amountOfPayment;
    }
  });

  // Finalize service breakdown
  const finalServiceBreakdown: PaymentInfo['serviceBreakdown'] = {};
  ALL_SERVICE_KEYS.forEach(key => {
    const service = serviceBreakdown[key];
    finalServiceBreakdown[key] = {
      uniqueSales: service.totalPayments, // Changed from unique contracts to total payments
      uniqueClients: 0, // Not tracking uniqueness anymore
      totalPayments: service.totalPayments,
      totalRevenue: service.totalRevenue,
      avgRevenue: service.totalPayments > 0 ? service.totalRevenue / service.totalPayments : 0,
      byMonth: service.byMonth,
    };
  });

  const paymentInfo: PaymentInfo = {
    lastUpdated: new Date().toISOString(),
    totalPayments: filteredPayments.length,
    receivedPayments: filteredPayments.length,
    summary: {
      totalUniqueSales: filteredPayments.length, // Changed to total payments
      totalUniqueClients: 0, // Not tracking anymore
      totalUniqueContracts: 0, // Not tracking anymore
      totalRevenue,
    },
    serviceBreakdown: finalServiceBreakdown,
  };

  return { volumes, revenues, paymentInfo };
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
  ethiopianPP: 1330, // Government fees
  filipinaPP: 0,     // No cost
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

// Create service P&L from actual payment revenue
function createServiceFromRevenue(
  name: string, 
  volume: number, 
  actualRevenue: number,
  unitCost: number
): ServicePnL {
  const totalRevenue = actualRevenue;
  const totalCost = volume * unitCost;
  const grossProfit = totalRevenue - totalCost;
  const avgPrice = volume > 0 ? actualRevenue / volume : 0;
  
  return {
    name,
    volume,
    price: avgPrice, // Average price from actual payments
    serviceFees: 0,
    totalRevenue,
    totalCost,
    grossProfit,
  };
}

// Create service P&L from fixed unit price (fallback for when no payment amount data)
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
    const source = searchParams.get('source') || 'auto'; // 'auto', 'payments', 'excel'
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    
    // Try to get payment data first
    const paymentData = await getPaymentData();
    const hasPaymentData = paymentData && paymentData.totalPayments > 0;
    
    // Apply date filter if provided
    let volumes: Record<PnLServiceKey, number>;
    let revenues: Record<PnLServiceKey, number>;
    let paymentInfo: PaymentInfo | null = null;
    
    if (hasPaymentData && paymentData) {
      const filtered = filterPaymentsDataByDate(paymentData.payments, startDate, endDate);
      volumes = filtered.volumes;
      revenues = filtered.revenues;
      paymentInfo = filtered.paymentInfo;
    } else {
      volumes = {
        oec: 0, owwa: 0, ttl: 0, tte: 0, ttj: 0,
        schengen: 0, gcc: 0, ethiopianPP: 0, filipinaPP: 0,
      };
      revenues = {
        oec: 0, owwa: 0, ttl: 0, tte: 0, ttj: 0,
        schengen: 0, gcc: 0, ethiopianPP: 0, filipinaPP: 0,
      };
    }
    
    // Check if P&L Excel files exist
    const hasExcelFiles = fs.existsSync(PNL_DIR) && 
      fs.readdirSync(PNL_DIR).some(f => f.endsWith('.xlsx') || f.endsWith('.xls'));
    
    // Determine which source to use
    const usePayments = source === 'payments' || 
      (source === 'auto' && hasPaymentData);
    const useExcel = source === 'excel' || 
      (source === 'auto' && !hasPaymentData && hasExcelFiles);
    
    // If using payment data
    if (usePayments && hasPaymentData && paymentInfo) {
      // Build P&L from actual payment revenues
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
      
      // Use actual revenue from payments (not fixed prices)
      const services: AggregatedPnL['services'] = {
        oec: createServiceFromRevenue(serviceNames.oec, volumes.oec, revenues.oec, SERVICE_UNIT_COSTS.oec),
        owwa: createServiceFromRevenue(serviceNames.owwa, volumes.owwa, revenues.owwa, SERVICE_UNIT_COSTS.owwa),
        ttl: createServiceFromRevenue(serviceNames.ttl, volumes.ttl, revenues.ttl, SERVICE_UNIT_COSTS.ttl),
        tte: createServiceFromRevenue(serviceNames.tte, volumes.tte, revenues.tte, SERVICE_UNIT_COSTS.tte),
        ttj: createServiceFromRevenue(serviceNames.ttj, volumes.ttj, revenues.ttj, SERVICE_UNIT_COSTS.ttj),
        schengen: createServiceFromRevenue(serviceNames.schengen, volumes.schengen, revenues.schengen, SERVICE_UNIT_COSTS.schengen),
        gcc: createServiceFromRevenue(serviceNames.gcc, volumes.gcc, revenues.gcc, SERVICE_UNIT_COSTS.gcc),
        ethiopianPP: createServiceFromRevenue(serviceNames.ethiopianPP, volumes.ethiopianPP, revenues.ethiopianPP, SERVICE_UNIT_COSTS.ethiopianPP),
        filipinaPP: createServiceFromRevenue(serviceNames.filipinaPP, volumes.filipinaPP, revenues.filipinaPP, SERVICE_UNIT_COSTS.filipinaPP),
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
        files: ['payment-data'],
        services,
        summary: {
          totalRevenue,
          totalCost,
          totalGrossProfit,
          fixedCosts,
          netProfit: totalGrossProfit - fixedCosts.total,
        },
      };
      
      // Collect all available months from payment data for the date picker
      const allAvailableMonths = new Set<string>();
      Object.values(paymentInfo.serviceBreakdown).forEach(service => {
        Object.keys(service.byMonth).forEach(month => {
          allAvailableMonths.add(month);
        });
      });

      return NextResponse.json({
        source: 'payments',
        aggregated,
        dateFilter: startDate || endDate ? { startDate, endDate } : null,
        availableMonths: Array.from(allAvailableMonths).sort(),
        paymentData: paymentInfo,
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
          hasPaymentData,
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
      error: 'No P&L data available. Upload payments via /api/ingest/payments or add Excel files to P&L directory.',
      source: 'none',
      hasPaymentData: false,
      hasExcelFiles: false,
    }, { status: 404 });
    
  } catch (error) {
    console.error('Error fetching P&L data:', error);
    return NextResponse.json({ error: 'Failed to fetch P&L data' }, { status: 500 });
  }
}
