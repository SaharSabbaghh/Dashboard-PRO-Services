import { NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import { parsePnLFile, aggregatePnLData } from '@/lib/pnl-parser';

const PNL_DIR = path.join(process.cwd(), 'P&L');

export async function GET() {
  try {
    // Check if P&L directory exists
    if (!fs.existsSync(PNL_DIR)) {
      return NextResponse.json({ error: 'P&L directory not found' }, { status: 404 });
    }

    // Get all Excel files in the P&L directory
    const files = fs.readdirSync(PNL_DIR)
      .filter(file => file.endsWith('.xlsx') || file.endsWith('.xls'))
      .map(file => path.join(PNL_DIR, file));

    if (files.length === 0) {
      return NextResponse.json({ error: 'No P&L files found' }, { status: 404 });
    }

    // Parse all P&L files
    const pnlDataList = files.map(file => {
      try {
        return parsePnLFile(file);
      } catch (err) {
        console.error(`Error parsing ${file}:`, err);
        return null;
      }
    }).filter(Boolean);

    if (pnlDataList.length === 0) {
      return NextResponse.json({ error: 'Failed to parse P&L files' }, { status: 500 });
    }

    // Aggregate all P&L data
    const aggregated = aggregatePnLData(pnlDataList as ReturnType<typeof parsePnLFile>[]);

    // Also return individual file data for detailed view
    return NextResponse.json({
      aggregated,
      files: pnlDataList,
      fileCount: pnlDataList.length,
    });
  } catch (error) {
    console.error('Error fetching P&L data:', error);
    return NextResponse.json({ error: 'Failed to fetch P&L data' }, { status: 500 });
  }
}

