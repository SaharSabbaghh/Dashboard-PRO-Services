/**
 * Distributed Lock Manager
 * 
 * Provides simple file-based locking to prevent concurrent processing
 * For production with multiple servers, consider Redis or database locks
 */

import { put, del, list } from '@vercel/blob';

const LOCK_PREFIX = 'locks/';
const LOCK_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
const MAX_LOCK_WAIT_MS = 30 * 1000; // 30 seconds max wait
const LOCK_CHECK_INTERVAL_MS = 1000; // Check every second

interface LockData {
  lockId: string;
  acquiredAt: string;
  expiresAt: string;
  holder: string;
}

// In-memory locks for file system (development)
const memoryLocks = new Map<string, LockData>();

/**
 * Check if we're using blob storage
 */
function useBlobStorage(): boolean {
  return !!process.env.BLOB_READ_WRITE_TOKEN;
}

/**
 * Acquire a lock for a specific resource
 */
export async function acquireLock(
  resourceId: string,
  holder: string = `process-${process.pid || Date.now()}`
): Promise<string | null> {
  const lockKey = `${LOCK_PREFIX}${resourceId}`;
  const lockId = `${holder}-${Date.now()}`;
  const now = Date.now();
  const expiresAt = new Date(now + LOCK_TIMEOUT_MS).toISOString();
  
  const lockData: LockData = {
    lockId,
    acquiredAt: new Date(now).toISOString(),
    expiresAt,
    holder,
  };
  
  const startTime = Date.now();
  
  // Try to acquire lock with retry
  while (Date.now() - startTime < MAX_LOCK_WAIT_MS) {
    try {
      if (useBlobStorage()) {
        // Check if lock exists and is still valid
        const { blobs } = await list({ prefix: lockKey });
        
        if (blobs.length > 0) {
          // Lock exists, check if expired
          const response = await fetch(blobs[0].url);
          const existingLock: LockData = await response.json();
          
          if (new Date(existingLock.expiresAt).getTime() > Date.now()) {
            // Lock is still valid, wait and retry
            await new Promise(resolve => setTimeout(resolve, LOCK_CHECK_INTERVAL_MS));
            continue;
          }
          
          // Lock expired, delete it
          await del(blobs[0].url);
        }
        
        // Try to acquire lock
        await put(lockKey, JSON.stringify(lockData), {
          access: 'public',
          addRandomSuffix: false,
        });
        
        return lockId;
      } else {
        // File system / memory locks
        const existingLock = memoryLocks.get(resourceId);
        
        if (existingLock) {
          // Check if expired
          if (new Date(existingLock.expiresAt).getTime() > Date.now()) {
            // Lock is still valid, wait and retry
            await new Promise(resolve => setTimeout(resolve, LOCK_CHECK_INTERVAL_MS));
            continue;
          }
          
          // Lock expired, remove it
          memoryLocks.delete(resourceId);
        }
        
        // Acquire lock
        memoryLocks.set(resourceId, lockData);
        return lockId;
      }
    } catch (error) {
      console.error(`[Lock] Error acquiring lock for ${resourceId}:`, error);
      await new Promise(resolve => setTimeout(resolve, LOCK_CHECK_INTERVAL_MS));
    }
  }
  
  // Timeout waiting for lock
  return null;
}

/**
 * Release a lock
 */
export async function releaseLock(resourceId: string, lockId: string): Promise<void> {
  const lockKey = `${LOCK_PREFIX}${resourceId}`;
  
  try {
    if (useBlobStorage()) {
      const { blobs } = await list({ prefix: lockKey });
      
      if (blobs.length > 0) {
        const response = await fetch(blobs[0].url);
        const existingLock: LockData = await response.json();
        
        // Only release if we own the lock
        if (existingLock.lockId === lockId) {
          await del(blobs[0].url);
        }
      }
    } else {
      // File system / memory locks
      const existingLock = memoryLocks.get(resourceId);
      
      // Only release if we own the lock
      if (existingLock && existingLock.lockId === lockId) {
        memoryLocks.delete(resourceId);
      }
    }
  } catch (error) {
    console.error(`[Lock] Error releasing lock for ${resourceId}:`, error);
  }
}

/**
 * Execute a function with a lock
 */
export async function withLock<T>(
  resourceId: string,
  fn: () => Promise<T>,
  holder?: string
): Promise<T | null> {
  const lockId = await acquireLock(resourceId, holder);
  
  if (!lockId) {
    console.error(`[Lock] Failed to acquire lock for ${resourceId}`);
    return null;
  }
  
  try {
    return await fn();
  } finally {
    await releaseLock(resourceId, lockId);
  }
}

