import { NextResponse } from 'next/server';
import { storeDailyOperations } from '@/lib/operations-storage';
import type { OperationsData, OperationsResponse } from '@/lib/operations-types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * API Endpoint: /api/ingest/operations
 * POST: Ingest daily operations data
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    console.log('[Operations Ingest] Received request:', {
      hasAnalysisDate: !!body.analysisDate,
      hasProspects: !!body.prospects,
      hasOperations: !!body.operations,
      hasSales: !!body.sales,
      hasSummary: !!body.summary
    });

    // Validate request structure
    if (!body.analysisDate) {
      const response: OperationsResponse = {
        success: false,
        message: 'Missing required field: analysisDate',
        error: 'analysisDate is required in YYYY-MM-DD format'
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(body.analysisDate)) {
      const response: OperationsResponse = {
        success: false,
        message: 'Invalid date format',
        error: 'analysisDate must be in YYYY-MM-DD format'
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Construct operations data
    const operationsData: OperationsData = {
      lastUpdated: new Date().toISOString(),
      analysisDate: body.analysisDate,
      prospects: body.prospects || [],
      operations: body.operations || [],
      sales: body.sales || [],
      summary: body.summary || {
        totalProspects: 0,
        totalPendingUs: 0,
        totalPendingClient: 0,
        totalPendingProVisit: 0,
        totalPendingGov: 0,
        totalDoneToday: 0,
        totalDoneMtd: 0,
        totalCasesDelayed: 0,
        totalDailySales: 0
      }
    };

    console.log('[Operations Ingest] Processed data:', {
      analysisDate: operationsData.analysisDate,
      prospectsCount: operationsData.prospects.length,
      operationsCount: operationsData.operations.length,
      salesCount: operationsData.sales.length,
      summary: operationsData.summary
    });

    // Store the data
    const storeResult = await storeDailyOperations(body.analysisDate, operationsData);
    
    if (!storeResult.success) {
      const response: OperationsResponse = {
        success: false,
        message: storeResult.message,
        error: storeResult.error
      };
      return NextResponse.json(response, { status: 500 });
    }

    console.log('[Operations Ingest] Successfully stored data for:', body.analysisDate);

    const response: OperationsResponse = {
      success: true,
      message: 'Operations data ingested successfully',
      data: operationsData
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('[Operations Ingest] Error:', error);
    
    const response: OperationsResponse = {
      success: false,
      message: 'Failed to ingest operations data',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
    
    return NextResponse.json(response, { status: 500 });
  }
}

// GET method to show API documentation
export async function GET() {
  const documentation = {
    endpoint: '/api/ingest/operations',
    method: 'POST',
    description: 'Ingest daily operations data into blob storage',
    requiredFields: {
      analysisDate: 'string (YYYY-MM-DD format) - The date for this operations data'
    },
    optionalFields: {
      prospects: 'ProspectMetric[] - Array of prospect metrics',
      operations: 'OperationMetric[] - Array of operation metrics', 
      sales: 'SalesMetric[] - Array of sales metrics',
      summary: 'object - Summary totals for the day'
    },
    exampleRequest: {
      analysisDate: '2026-02-16',
      prospects: [
        {
          product: 'OEC',
          currentDay: 71,
          trend: null,
          mtd: null,
          previousDay: null
        }
      ],
      operations: [
        {
          serviceType: 'OEC',
          pendingUs: 11,
          pendingClient: null,
          pendingProVisit: null,
          pendingGov: 43,
          doneToday: 8,
          doneMtd: 89,
          doneSince7Days: 15,
          casesDelayed: 27
        }
      ],
      sales: [
        {
          product: 'OEC',
          dailySales: 26,
          dailyConversionRate: '36.6%',
          mtdSales: null,
          previousConversionRate: null,
          monthlyConversionRate: null
        }
      ],
      summary: {
        totalProspects: 22,
        totalPendingUs: 50,
        totalPendingClient: 8,
        totalPendingProVisit: 10,
        totalPendingGov: 166,
        totalDoneToday: 12,
        totalDoneMtd: 148,
        totalCasesDelayed: 126,
        totalDailySales: 42
      }
    }
  };

  return NextResponse.json(documentation);
}
