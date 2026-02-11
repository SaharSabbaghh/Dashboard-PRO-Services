import { NextResponse } from 'next/server';
import { list } from '@vercel/blob';

export async function GET() {
  try {
    // List all blobs (no prefix filter) to see everything
    const { blobs } = await list();
    
    const blobInfo = blobs.map(blob => ({
      pathname: blob.pathname,
      url: blob.url,
      size: blob.size,
      uploadedAt: blob.uploadedAt,
    }));
    
    // Also try to list with 'daily/' prefix specifically
    const { blobs: dailyBlobs } = await list({ prefix: 'daily/' });
    
    return NextResponse.json({
      totalBlobs: blobs.length,
      allBlobs: blobInfo,
      dailyBlobsCount: dailyBlobs.length,
      dailyBlobs: dailyBlobs.map(b => b.pathname),
    });
  } catch (error) {
    return NextResponse.json({
      error: String(error),
    }, { status: 500 });
  }
}

