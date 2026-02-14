import { NextResponse } from 'next/server';
import { getPnLConfigHistory, addConfigSnapshot } from '@/lib/pnl-config-storage';
import type { PnLConfigSnapshot } from '@/lib/pnl-config-types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET: Retrieve current P&L configuration history
 */
export async function GET() {
  try {
    const history = await getPnLConfigHistory();
    
    // Get the most recent configuration
    const currentConfig = history.configurations[history.configurations.length - 1];
    
    return NextResponse.json({
      success: true,
      currentConfig,
      history: history.configurations,
    });
  } catch (error) {
    console.error('Error fetching P&L config:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch configuration' },
      { status: 500 }
    );
  }
}

/**
 * POST: Add a new configuration (applies from today forward)
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    if (!body.services) {
      return NextResponse.json(
        { success: false, error: 'services configuration is required' },
        { status: 400 }
      );
    }
    
    // Validate that all required services are present
    const requiredServices = ['oec', 'owwa', 'ttl', 'tte', 'ttj', 'schengen', 'gcc', 'ethiopianPP', 'filipinaPP'];
    for (const service of requiredServices) {
      if (!body.services[service]) {
        return NextResponse.json(
          { success: false, error: `Missing configuration for service: ${service}` },
          { status: 400 }
        );
      }
    }
    
    const newSnapshot: Omit<PnLConfigSnapshot, 'effectiveDate' | 'updatedAt'> = {
      services: body.services,
      updatedBy: body.updatedBy,
    };
    
    const updatedHistory = await addConfigSnapshot(newSnapshot);
    const currentConfig = updatedHistory.configurations[updatedHistory.configurations.length - 1];
    
    return NextResponse.json({
      success: true,
      message: `Configuration updated. Changes will apply from ${currentConfig.effectiveDate} forward.`,
      currentConfig,
      history: updatedHistory.configurations,
    });
  } catch (error) {
    console.error('Error updating P&L config:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update configuration' },
      { status: 500 }
    );
  }
}

