import { NextResponse } from 'next/server';
import { storeNPSData } from '@/lib/nps-storage';

// Verify API key from Authorization header
function verifyApiKey(request: Request): boolean {
  const validKey = process.env.INGEST_API_KEY || 'saharsspp18';
  
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) {
    return false;
  }
  
  // Support both "Bearer <token>" and plain "<token>" formats
  const token = authHeader.startsWith('Bearer ') 
    ? authHeader.slice(7) 
    : authHeader;
  
  return token === validKey;
}

export async function POST(request: Request) {
  try {
    // Validate API key
    if (!verifyApiKey(request)) {
      return NextResponse.json(
        { error: 'Unauthorized. Provide valid API key in Authorization header.' },
        { status: 401 }
      );
    }
    
    const npsData = await request.json();
    
    // Validate data structure
    if (!npsData || typeof npsData !== 'object') {
      return NextResponse.json(
        { error: 'Invalid NPS data format' },
        { status: 400 }
      );
    }
    
    // Store using blob storage or filesystem
    const result = await storeNPSData(npsData);
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to save NPS data' },
        { status: 500 }
      );
    }
    
    const dateCount = Object.keys(npsData).length;
    
    console.log(`[NPS Ingest] Saved ${dateCount} dates - ${result.message}`);
    
    return NextResponse.json({
      success: true,
      message: result.message,
      datesCount: dateCount,
    });
  } catch (error) {
    console.error('[NPS Ingest] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save NPS data',
    }, { status: 500 });
  }
}

