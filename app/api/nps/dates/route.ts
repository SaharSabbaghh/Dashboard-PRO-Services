import { NextResponse } from 'next/server';
import fs from 'fs';
import { parse } from 'date-fns';

interface NPSRawData {
  [dateKey: string]: {
    date: string;
    scores: Array<{
      nps_score: number;
      services: Record<string, number>;
    }>;
  };
}

/**
 * Parse date from "Feb 9" format to ISO date string (YYYY-MM-DD)
 * NPS data is from 2026, so we parse with 2026 as the year
 */
function parseNPSDate(dateStr: string): string | null {
  try {
    // NPS data is from 2026
    const year = 2026;
    const parsed = parse(`${dateStr} ${year}`, 'MMM d yyyy', new Date());
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().split('T')[0];
    }
    
    return null;
  } catch (error) {
    console.error(`Error parsing date "${dateStr}":`, error);
    return null;
  }
}

export async function GET() {
  try {
    // Use absolute path to NPS data file
    const npsDataPath = '/Users/saharsabbagh/Downloads/nps_data.json';
    
    // Check if file exists
    if (!fs.existsSync(npsDataPath)) {
      return NextResponse.json({
        success: false,
        error: 'NPS data file not found at ' + npsDataPath,
      }, { status: 404 });
    }

    const fileContent = fs.readFileSync(npsDataPath, 'utf-8');
    const npsData: NPSRawData = JSON.parse(fileContent);

    // Extract all date keys and convert to ISO format
    const dates: string[] = [];
    const dateKeys = Object.keys(npsData);
    
    console.log(`[NPS Dates] Found ${dateKeys.length} date keys in file`);
    console.log(`[NPS Dates] Sample keys:`, dateKeys.slice(0, 5));

    for (const dateKey of dateKeys) {
      const isoDate = parseNPSDate(dateKey);
      if (isoDate) {
        dates.push(isoDate);
      } else {
        console.warn(`[NPS Dates] Failed to parse date key: "${dateKey}"`);
      }
    }

    // Sort dates
    dates.sort();
    
    console.log(`[NPS Dates] Successfully parsed ${dates.length} dates`);
    console.log(`[NPS Dates] Sample dates:`, dates.slice(0, 5));

    return NextResponse.json({
      success: true,
      dates,
    });
  } catch (error) {
    console.error('Error fetching NPS dates:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch NPS dates',
    }, { status: 500 });
  }
}

