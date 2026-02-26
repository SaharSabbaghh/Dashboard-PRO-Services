import { NextResponse } from 'next/server';
import { parse, isAfter, isBefore, parseISO } from 'date-fns';
import { getNPSData } from '@/lib/nps-storage';
import type { NPSAggregatedData, NPSMetrics, NPSServiceMetrics, NPSRawData } from '@/lib/nps-types';

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

/**
 * Calculate NPS metrics from score entries
 */
function calculateMetrics(scores: Array<{ nps_score: number; services: Record<string, number> }>): NPSMetrics {
  let total = 0;
  let promoters = 0;
  let detractors = 0;
  let passives = 0;
  const scoreDistribution: Record<number, number> = {};

  // Initialize score distribution for 0-10
  for (let i = 0; i <= 10; i++) {
    scoreDistribution[i] = 0;
  }

  for (const entry of scores) {
    const count = entry.services.TOTAL || 0;
    total += count;

    // Add to score distribution
    const score = entry.nps_score;
    if (score >= 0 && score <= 10) {
      scoreDistribution[score] = (scoreDistribution[score] || 0) + count;
    }

    if (entry.nps_score >= 9) {
      promoters += count;
    } else if (entry.nps_score <= 6) {
      detractors += count;
    } else {
      passives += count;
    }
  }

  const promoterPercentage = total > 0 ? (promoters / total) * 100 : 0;
  const detractorPercentage = total > 0 ? (detractors / total) * 100 : 0;
  const passivePercentage = total > 0 ? (passives / total) * 100 : 0;
  const npsScore = promoterPercentage - detractorPercentage;

  return {
    total,
    promoters,
    detractors,
    passives,
    npsScore: Math.round(npsScore * 100) / 100, // Round to 2 decimal places
    promoterPercentage: Math.round(promoterPercentage * 100) / 100,
    detractorPercentage: Math.round(detractorPercentage * 100) / 100,
    passivePercentage: Math.round(passivePercentage * 100) / 100,
    scoreDistribution,
  };
}

/**
 * Calculate service-level metrics
 */
function calculateServiceMetrics(
  scores: Array<{ nps_score: number; services: Record<string, number> }>,
  serviceName: string
): NPSMetrics {
  let total = 0;
  let promoters = 0;
  let detractors = 0;
  let passives = 0;
  const scoreDistribution: Record<number, number> = {};

  // Initialize score distribution for 0-10
  for (let i = 0; i <= 10; i++) {
    scoreDistribution[i] = 0;
  }

  for (const entry of scores) {
    const count = entry.services[serviceName] || 0;
    total += count;

    // Add to score distribution
    const score = entry.nps_score;
    if (score >= 0 && score <= 10) {
      scoreDistribution[score] = (scoreDistribution[score] || 0) + count;
    }

    if (entry.nps_score >= 9) {
      promoters += count;
    } else if (entry.nps_score <= 6) {
      detractors += count;
    } else {
      passives += count;
    }
  }

  const promoterPercentage = total > 0 ? (promoters / total) * 100 : 0;
  const detractorPercentage = total > 0 ? (detractors / total) * 100 : 0;
  const passivePercentage = total > 0 ? (passives / total) * 100 : 0;
  const npsScore = promoterPercentage - detractorPercentage;

  return {
    total,
    promoters,
    detractors,
    passives,
    npsScore: Math.round(npsScore * 100) / 100,
    promoterPercentage: Math.round(promoterPercentage * 100) / 100,
    detractorPercentage: Math.round(detractorPercentage * 100) / 100,
    passivePercentage: Math.round(passivePercentage * 100) / 100,
    scoreDistribution,
  };
}

/**
 * Aggregate NPS data for a date range
 */
function aggregateNPSData(
  npsData: NPSRawData,
  startDate?: string,
  endDate?: string
): NPSAggregatedData {
  const allScores: Array<{ nps_score: number; services: Record<string, number> }> = [];
  const serviceNames = new Set<string>();

  // Parse date range
  const start = startDate ? parseISO(startDate) : null;
  const end = endDate ? parseISO(endDate) : null;

  // Collect all scores within date range
  for (const [dateKey, dayData] of Object.entries(npsData)) {
    const isoDate = parseNPSDate(dateKey);
    if (!isoDate) continue;

    const date = parseISO(isoDate);

    // Filter by date range
    if (start && isBefore(date, start)) continue;
    if (end && isAfter(date, end)) continue;

    // Collect scores
    allScores.push(...dayData.scores);

    // Collect service names
    for (const entry of dayData.scores) {
      for (const serviceName of Object.keys(entry.services)) {
        if (serviceName !== 'TOTAL') {
          serviceNames.add(serviceName);
        }
      }
    }
  }

  // Calculate overall metrics
  const overall = calculateMetrics(allScores);

  // Calculate service-level metrics
  const services: NPSServiceMetrics[] = Array.from(serviceNames)
    .sort()
    .map(service => ({
      service,
      metrics: calculateServiceMetrics(allScores, service),
    }))
    .filter(item => item.metrics.total > 0); // Only include services with data

  return {
    overall,
    services,
    dateRange: {
      startDate: startDate || '',
      endDate: endDate || startDate || '',
    },
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Get NPS data from blob storage or filesystem
    const result = await getNPSData();
    
    if (!result.success || !result.data) {
      return NextResponse.json({
        success: false,
        error: result.error || 'NPS data not found',
      }, { status: 404 });
    }

    const npsData = result.data;

    // Aggregate data for the date range
    const aggregated = aggregateNPSData(npsData, startDate || undefined, endDate || undefined);

    return NextResponse.json({
      success: true,
      data: aggregated,
    });
  } catch (error) {
    console.error('Error fetching NPS data:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch NPS data',
    }, { status: 500 });
  }
}

