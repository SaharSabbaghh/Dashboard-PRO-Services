import { NextResponse } from 'next/server';
import { getDailyData, saveDailyData, startRun, updateRun, completeRun, getLatestRun } from '@/lib/unified-storage';
import { analyzeConversationsBatch } from '@/lib/deepseek';

export const maxDuration = 300; // 5 minutes max

export async function POST(request: Request) {
  try {
    const { date, batchSize = 50 } = await request.json();
    
    if (!date) {
      return NextResponse.json({ error: 'Date is required' }, { status: 400 });
    }
    
    const dailyData = await getDailyData(date);
    if (!dailyData) {
      return NextResponse.json({ error: 'No data found for this date' }, { status: 404 });
    }
    
    // Find unprocessed conversations
    const unprocessed = dailyData.results.filter(r => !r.processedAt);
    
    if (unprocessed.length === 0) {
      // Complete any active run
      if (dailyData.currentRunId) {
        await completeRun(date, dailyData.currentRunId);
      }
      
      const latestRun = await getLatestRun(date);
      
      return NextResponse.json({
        message: 'All conversations processed',
        date,
        processedInBatch: 0,
        totalProcessed: dailyData.processedCount,
        totalConversations: dailyData.totalConversations,
        remaining: 0,
        isComplete: true,
        runStats: latestRun,
      });
    }
    
    // Start or get current run
    let runId = dailyData.currentRunId;
    if (!runId) {
      runId = await startRun(date);
      // Re-fetch to get updated data
      const updatedData = await getDailyData(date);
      if (updatedData) {
        Object.assign(dailyData, updatedData);
      }
    }
    
    // Take next batch - process in parallel
    const toProcess = unprocessed.slice(0, batchSize);
    const conversations = toProcess
      .filter(conv => conv.messages)
      .map(conv => ({ id: conv.id, messages: conv.messages || '' }));
    
    if (conversations.length === 0) {
      return NextResponse.json({
        message: 'No conversations with messages to process',
        date,
        processedInBatch: 0,
        totalProcessed: dailyData.processedCount,
        totalConversations: dailyData.totalConversations,
        remaining: unprocessed.length,
        isComplete: false,
      });
    }
    
    // Process batch in parallel (with concurrency control)
    const results = await analyzeConversationsBatch(conversations);
    
    let successCount = 0;
    let failureCount = 0;
    let batchCost = 0;
    
    // Build a map of results by ID for quick lookup
    const resultsMap = new Map<string, typeof results[0]['result']>();
    for (const { id, result } of results) {
      resultsMap.set(id, result);
      if (result.success) {
        successCount++;
        batchCost += result.cost;
      } else {
        failureCount++;
      }
    }
    
    // RE-FETCH fresh data before saving to avoid race conditions
    const freshData = await getDailyData(date);
    if (!freshData) {
      return NextResponse.json({ error: 'Data disappeared during processing' }, { status: 500 });
    }
    
    // Apply ONLY our processed results to the fresh data
    for (const [id, result] of resultsMap) {
      const index = freshData.results.findIndex(r => r.id === id);
      if (index === -1) continue;
      
      // Only update if not already processed (avoid overwriting)
      if (freshData.results[index].processedAt) continue;
      
      if (result.success) {
        freshData.results[index] = {
          ...freshData.results[index],
          isOECProspect: result.isOECProspect,
          isOECProspectConfidence: result.isOECProspectConfidence,
          oecConverted: result.oecConverted,
          oecConvertedConfidence: result.oecConvertedConfidence,
          isOWWAProspect: result.isOWWAProspect,
          isOWWAProspectConfidence: result.isOWWAProspectConfidence,
          owwaConverted: result.owwaConverted,
          owwaConvertedConfidence: result.owwaConvertedConfidence,
          isTravelVisaProspect: result.isTravelVisaProspect,
          isTravelVisaProspectConfidence: result.isTravelVisaProspectConfidence,
          travelVisaCountries: result.travelVisaCountries,
          travelVisaConverted: result.travelVisaConverted,
          travelVisaConvertedConfidence: result.travelVisaConvertedConfidence,
          processedAt: new Date().toISOString(),
        };
      } else {
        // Mark as processed but failed
        freshData.results[index].processedAt = new Date().toISOString();
      }
    }
    
    // Update processed count from fresh data
    freshData.processedCount = freshData.results.filter(r => r.processedAt).length;
    await saveDailyData(date, freshData);
    
    // Use freshData for response
    const dailyDataFinal = freshData;
    
    // Update run stats
    const currentRun = await getLatestRun(date);
    if (currentRun && runId) {
      await updateRun(date, runId, {
        successCount: currentRun.successCount + successCount,
        failureCount: currentRun.failureCount + failureCount,
        totalCost: currentRun.totalCost + batchCost,
        conversationsProcessed: currentRun.conversationsProcessed + results.length,
      });
    }
    
    const remaining = dailyDataFinal.totalConversations - dailyDataFinal.processedCount;
    const isComplete = remaining === 0;
    
    // Complete run if done
    if (isComplete && runId) {
      await completeRun(date, runId);
    }
    
    const latestRun = await getLatestRun(date);
    
    return NextResponse.json({
      message: `Processed ${successCount} conversations (${failureCount} failed)`,
      date,
      processedInBatch: successCount,
      failedInBatch: failureCount,
      batchCost,
      totalProcessed: dailyDataFinal.processedCount,
      totalConversations: dailyDataFinal.totalConversations,
      remaining,
      isComplete,
      runStats: latestRun,
    });
    
  } catch (error) {
    console.error('[Process-Date] Error:', error);
    return NextResponse.json(
      { error: 'Failed to process conversations', details: String(error) },
      { status: 500 }
    );
  }
}
