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
 * Tries current year first, then previous year if that fails
 */
function parseNPSDate(dateStr: string, year: number = new Date().getFullYear()): string | null {
  try {
    // Try current year first
    const parsed = parse(`${dateStr} ${year}`, 'MMM d yyyy', new Date());
    if (!isNaN(parsed.getTime())) {
      const isoDate = parsed.toISOString().split('T')[0];
      // If parsed date is in the future (more than 30 days), it's likely from previous year
      const daysDiff = (parsed.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24);
      if (daysDiff > 30) {
        // Try previous year
        const prevYearParsed = parse(`${dateStr} ${year - 1}`, 'MMM d yyyy', new Date());
        if (!isNaN(prevYearParsed.getTime())) {
          return prevYearParsed.toISOString().split('T')[0];
        }
      }
      return isoDate;
    }
    
    // Try previous year
    const prevYearParsed = parse(`${dateStr} ${year - 1}`, 'MMM d yyyy', new Date());
    if (!isNaN(prevYearParsed.getTime())) {
      return prevYearParsed.toISOString().split('T')[0];
    }
    
    return null;
  } catch {
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
    const currentYear = new Date().getFullYear();
    const dates: string[] = [];

    for (const dateKey of Object.keys(npsData)) {
      const isoDate = parseNPSDate(dateKey, currentYear);
      if (isoDate) {
        dates.push(isoDate);
      }
    }

    // Sort dates
    dates.sort();

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

