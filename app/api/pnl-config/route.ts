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
    console.log('[P&L Config API] Starting to fetch configuration...');
    const history = await getPnLConfigHistory();
    console.log('[P&L Config API] Got history with', history.configurations.length, 'configurations');
    
    // Get the most recent configuration
    const currentConfig = history.configurations[history.configurations.length - 1];
    console.log('[P&L Config API] Current config effective date:', currentConfig?.effectiveDate);
    
    // Ensure we always have a valid config
    if (!currentConfig) {
      console.error('[P&L Config API] No current config found, this should not happen');
      const { DEFAULT_CONFIG_SNAPSHOT } = await import('@/lib/pnl-config-types');
      return NextResponse.json({
        success: true,
        currentConfig: DEFAULT_CONFIG_SNAPSHOT,
        history: [DEFAULT_CONFIG_SNAPSHOT],
      });
    }
    
    return NextResponse.json({
      success: true,
      currentConfig,
      history: history.configurations,
    });
  } catch (error) {
    console.error('[P&L Config API] Error fetching P&L config:', error);
    console.error('[P&L Config API] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    // Fallback to default config even on error
    try {
      const { DEFAULT_CONFIG_SNAPSHOT } = await import('@/lib/pnl-config-types');
      console.log('[P&L Config API] Falling back to default configuration');
      return NextResponse.json({
        success: true,
        currentConfig: DEFAULT_CONFIG_SNAPSHOT,
        history: [DEFAULT_CONFIG_SNAPSHOT],
        warning: 'Using default configuration due to storage error'
      });
    } catch (fallbackError) {
      console.error('[P&L Config API] Even fallback failed:', fallbackError);
      return NextResponse.json(
        { success: false, error: `Failed to fetch configuration: ${error instanceof Error ? error.message : 'Unknown error'}` },
        { status: 500 }
      );
    }
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
    
    if (!body.fixedCosts) {
      return NextResponse.json(
        { success: false, error: 'fixedCosts configuration is required' },
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
    
    // Validate fixed costs
    const requiredFixedCosts = ['laborCost', 'llm', 'proTransportation'];
    for (const cost of requiredFixedCosts) {
      if (typeof body.fixedCosts[cost] !== 'number') {
        return NextResponse.json(
          { success: false, error: `Missing or invalid fixed cost: ${cost}` },
          { status: 400 }
        );
      }
    }
    
    const newSnapshot: Omit<PnLConfigSnapshot, 'effectiveDate' | 'updatedAt'> = {
      services: body.services,
      fixedCosts: body.fixedCosts,
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

