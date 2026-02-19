import { NextResponse } from 'next/server';
import { getCurrentPnLConfig, getPnLConfigHistory, addPnLConfig, type PnLConfig } from '@/lib/simple-pnl-config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET: Get current P&L configuration
 */
export async function GET() {
  try {
    const currentConfig = getCurrentPnLConfig();
    const history = getPnLConfigHistory();
    
    return NextResponse.json({
      success: true,
      currentConfig,
      history: history.configs
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
 * POST: Update P&L configuration
 */
export async function POST(request: Request) {
  try {
    const configData = await request.json();
    
    // Validate the configuration data
    if (!configData || typeof configData !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Invalid configuration data' },
        { status: 400 }
      );
    }
    
    // Add new configuration (effective from today)
    const newConfig = addPnLConfig(configData);
    const history = getPnLConfigHistory();
    
    return NextResponse.json({
      success: true,
      message: `Configuration saved! Changes will apply from ${newConfig.effectiveDate} forward. Historical data keeps original pricing.`,
      currentConfig: newConfig,
      history: history.configs
    });
  } catch (error) {
    console.error('Error updating P&L config:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update configuration' },
      { status: 500 }
    );
  }
}
