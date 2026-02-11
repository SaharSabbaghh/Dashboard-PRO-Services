/**
 * Migration Script: Add processingStatus field to existing data
 * 
 * This script updates all existing daily data files to include the new
 * processingStatus, retryCount, and processingError fields.
 * 
 * Usage: node scripts/migrate-add-status-field.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(process.cwd(), 'data', 'daily');

function migrateConversation(conversation) {
  // Add new fields if they don't exist
  if (!conversation.processingStatus) {
    // Determine status based on processedAt
    if (!conversation.processedAt) {
      conversation.processingStatus = 'pending';
    } else {
      // If it was processed, assume success
      conversation.processingStatus = 'success';
    }
  }
  
  if (conversation.retryCount === undefined) {
    conversation.retryCount = 0;
  }
  
  // processingError is optional, only add if needed
  
  return conversation;
}

function migrateDailyFile(filePath) {
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    
    if (!data.results || !Array.isArray(data.results)) {
      console.log(`Skipping ${path.basename(filePath)} - no results array`);
      return { updated: false };
    }
    
    let updated = false;
    
    // Migrate each conversation
    data.results = data.results.map(conv => {
      const migrated = migrateConversation(conv);
      if (migrated !== conv) updated = true;
      return migrated;
    });
    
    // Update processedCount to match 'success' status
    const successCount = data.results.filter(r => r.processingStatus === 'success').length;
    if (data.processedCount !== successCount) {
      data.processedCount = successCount;
      updated = true;
    }
    
    if (updated) {
      // Write back the migrated data
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      return { updated: true, totalConversations: data.results.length, successCount };
    }
    
    return { updated: false };
    
  } catch (error) {
    console.error(`Error migrating ${path.basename(filePath)}:`, error.message);
    return { error: error.message };
  }
}

async function main() {
  console.log('[Migration] Starting migration to add processingStatus field...\n');
  
  if (!fs.existsSync(DATA_DIR)) {
    console.log('[Migration] No data directory found. Nothing to migrate.');
    return;
  }
  
  const files = fs.readdirSync(DATA_DIR)
    .filter(f => f.endsWith('.json'))
    .sort();
  
  if (files.length === 0) {
    console.log('[Migration] No daily data files found. Nothing to migrate.');
    return;
  }
  
  console.log(`[Migration] Found ${files.length} daily data file(s)\n`);
  
  let totalUpdated = 0;
  let totalConversations = 0;
  let totalSuccess = 0;
  
  for (const file of files) {
    const filePath = path.join(DATA_DIR, file);
    const result = migrateDailyFile(filePath);
    
    if (result.error) {
      console.log(`❌ ${file}: Error - ${result.error}`);
    } else if (result.updated) {
      console.log(`✅ ${file}: Updated (${result.successCount}/${result.totalConversations} successful)`);
      totalUpdated++;
      totalConversations += result.totalConversations;
      totalSuccess += result.successCount;
    } else {
      console.log(`⏭️  ${file}: Already up to date`);
    }
  }
  
  console.log(`\n[Migration] Complete!`);
  console.log(`  - Files updated: ${totalUpdated}/${files.length}`);
  console.log(`  - Total conversations: ${totalConversations}`);
  console.log(`  - Successfully processed: ${totalSuccess}`);
}

main();

