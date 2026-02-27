import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';

export async function GET() {
  try {
    // Read the CSV file from Downloads folder using absolute path
    const csvPath = '/Users/saharsabbagh/Downloads/flow.csv';
    const csvContent = readFileSync(csvPath, 'utf-8');
    
    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('Error reading CSV file:', error);
    return NextResponse.json(
      { error: 'Failed to read CSV file', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

