import { NextResponse } from 'next/server';
import { parseTodoCSVContent, parseAllTodosCSVContent } from '@/lib/todo-parser';
import { processTodosAndSave } from '@/lib/unified-storage';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }
    
    if (!file.name.endsWith('.csv')) {
      return NextResponse.json(
        { error: 'File must be a CSV' },
        { status: 400 }
      );
    }
    
    console.log(`[Todo Upload] Starting upload: ${file.name}`);
    
    // Read and parse CSV
    const content = await file.text();
    
    // Parse To Dos (filter to Overseas only by default)
    const allTodos = await parseAllTodosCSVContent(content);
    const overseasTodos = await parseTodoCSVContent(content);
    
    console.log(`[Todo Upload] Parsed ${allTodos.length} total To Dos, ${overseasTodos.length} are Overseas`);
    
    if (overseasTodos.length === 0) {
      return NextResponse.json({
        success: true,
        warning: 'No Overseas To Dos found in the file',
        fileName: file.name,
        totalTodos: allTodos.length,
        overseasTodos: 0,
        salesProcessed: 0,
      });
    }
    
    // Process and save overseas sales with deduplication
    const salesData = await processTodosAndSave(overseasTodos);
    
    console.log(`[Todo Upload] Complete: ${salesData.totalDedupedSales} deduplicated sales from ${salesData.totalRawTodos} To Dos`);
    
    return NextResponse.json({
      success: true,
      message: 'To Do file processed successfully',
      fileName: file.name,
      totalTodos: allTodos.length,
      overseasTodos: overseasTodos.length,
      totalDedupedSales: salesData.totalDedupedSales,
      salesByMonth: salesData.salesByMonth,
    });
    
  } catch (error) {
    console.error('[Todo Upload] Error:', error);
    return NextResponse.json(
      { error: 'Failed to upload To Do file', details: String(error) },
      { status: 500 }
    );
  }
}
