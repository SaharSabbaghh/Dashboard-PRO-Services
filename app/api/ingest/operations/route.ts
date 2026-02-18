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
      hasOperations: !!body.operations
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

    // Validate required arrays
    if (!Array.isArray(body.operations)) {
      const response: OperationsResponse = {
        success: false,
        message: 'Invalid data format',
        error: 'operations must be an array'
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Construct operations data
    const operationsData: OperationsData = {
      lastUpdated: new Date().toISOString(),
      analysisDate: body.analysisDate,
      operations: body.operations
    };

    console.log('[Operations Ingest] Processed data:', {
      analysisDate: operationsData.analysisDate,
      operationsCount: operationsData.operations.length
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
      analysisDate: 'string (YYYY-MM-DD format) - The date for this operations data',
      operations: 'OperationMetric[] - Array of operation metrics'
    },
    exampleRequest: {
      analysisDate: '2026-02-16',
      operations: [
        {
          serviceType: 'OEC',
          pendingUs: 11,
          pendingClient: 0,
          pendingProVisit: 0,
          pendingGov: 43,
          doneToday: 8,
          casesDelayed: 27,
          delayedNotes: 'Optional delay notes'
        },
        {
          serviceType: 'OWWA',
          pendingUs: 22,
          pendingClient: 0,
          pendingProVisit: 0,
          pendingGov: 45,
          doneToday: 4,
          casesDelayed: 45,
          delayedNotes: 'GCash App Error + Funds Transfer issues'
        }
      ]
    }
  };

  return NextResponse.json(documentation);
}
