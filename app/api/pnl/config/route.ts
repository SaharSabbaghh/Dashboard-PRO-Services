import { NextResponse } from 'next/server';
import { savePnLConfig, parsePnLConfigFromJSON, getDefaultPnLConfig } from '@/lib/pnl-config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET - Retrieve current P&L config
 */
export async function GET() {
  try {
    const { loadPnLConfigFromBlob } = await import('@/lib/pnl-config');
    const result = await loadPnLConfigFromBlob();
    
    if (result.success && result.config) {
      return NextResponse.json({
        success: true,
        config: result.config,
        source: 'blob',
      });
    }
    
    // Return defaults if no saved config
    return NextResponse.json({
      success: true,
      config: getDefaultPnLConfig(),
      source: 'default',
    });
  } catch (error) {
    console.error('[P&L Config API] Error loading config:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      config: getDefaultPnLConfig(), // Always return valid config
    }, { status: 500 });
  }
}

/**
 * POST - Save P&L config
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Parse and validate config
    const config = parsePnLConfigFromJSON(body);
    
    // Save to blob storage
    const result = await savePnLConfig(config);
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message,
        config,
      });
    }
    
    return NextResponse.json({
      success: false,
      error: result.error,
    }, { status: 500 });
  } catch (error) {
    console.error('[P&L Config API] Error saving config:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

