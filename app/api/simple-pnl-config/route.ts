import { NextResponse } from 'next/server';
import { getPnLConfig, updatePnLConfig, type PnLConfig } from '@/lib/simple-pnl-config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET: Get current P&L configuration
 */
export async function GET() {
  try {
    const config = getPnLConfig();
    
    return NextResponse.json({
      success: true,
      config
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
    const updates = await request.json();
    
    // Validate the updates
    if (!updates || typeof updates !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Invalid configuration data' },
        { status: 400 }
      );
    }
    
    // Update the configuration
    const updatedConfig = updatePnLConfig(updates);
    
    return NextResponse.json({
      success: true,
      message: 'Configuration updated successfully',
      config: updatedConfig
    });
  } catch (error) {
    console.error('Error updating P&L config:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update configuration' },
      { status: 500 }
    );
  }
}
