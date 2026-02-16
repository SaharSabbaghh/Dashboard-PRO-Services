import { NextRequest, NextResponse } from 'next/server';
import { deleteBlob } from '@vercel/blob';

// Verify API key from Authorization header
function verifyApiKey(request: NextRequest): boolean {
  const validKey = process.env.INGEST_API_KEY;
  if (!validKey) {
    console.warn('[Delete] Warning: INGEST_API_KEY not set, rejecting all requests for security');
    return false;
  }

  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }

  const providedKey = authHeader.slice(7); // Remove 'Bearer ' prefix
  return providedKey === validKey;
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ date: string }> }
) {
  try {
    // Verify API key
    if (!verifyApiKey(request)) {
      return NextResponse.json(
        { error: 'Unauthorized. Provide valid API key in Authorization header.' },
        { status: 401 }
      );
    }

    const { date } = await context.params;
    
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { error: 'Invalid date format. Use YYYY-MM-DD' },
        { status: 400 }
      );
    }

    // Delete from Vercel Blob
    const blobPath = `daily/${date}.json`;
    
    try {
      await deleteBlob(blobPath);
      console.log(`[Delete] Successfully deleted blob: ${blobPath}`);
      
      return NextResponse.json({
        success: true,
        message: `Data for ${date} has been deleted`,
        date,
      });
    } catch (error: any) {
      // If blob doesn't exist, that's fine
      if (error?.message?.includes('not found') || error?.message?.includes('does not exist')) {
        return NextResponse.json({
          success: true,
          message: `No data found for ${date} (already deleted or never existed)`,
          date,
        });
      }
      throw error;
    }
  } catch (error) {
    console.error('[Delete] Error:', error);
    return NextResponse.json(
      { error: 'Failed to delete data', details: String(error) },
      { status: 500 }
    );
  }
}

// GET endpoint to show info
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/dates/[date]/delete',
    method: 'DELETE',
    description: 'Delete stored data for a specific date',
    authentication: {
      type: 'Bearer token',
      header: 'Authorization: Bearer <your-api-key>',
    },
    example: 'DELETE /api/dates/2026-02-16/delete',
  });
}

