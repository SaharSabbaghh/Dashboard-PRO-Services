/**
 * Deduplicates conversation data by entity (contract/client/maid)
 * Similar to chat analysis aggregation logic
 */

function deduplicateByEntity(data) {
    if (!data || data.length === 0) {
        return [];
    }

    console.log(`[Deduplication] Starting with ${data.length} records`);

    // Step 0: First merge by conversation ID (if same conversation ID appears, merge regardless of entity)
    const conversationIdMap = new Map();
    
    for (const item of data) {
        const convId = item.conversationId;
        if (!convId) continue;
        
        const convIds = convId.split(',').map(id => id.trim()).filter(Boolean);
        
        // Check if any of these conversation IDs already exist
        let mergeKey = null;
        for (const id of convIds) {
            for (const [key, existing] of conversationIdMap.entries()) {
                const existingIds = Array.from(existing.mergedConversationIds || [existing.conversationId]);
                if (existingIds.includes(id)) {
                    mergeKey = key;
                    break;
                }
            }
            if (mergeKey) break;
        }
        
        if (mergeKey && conversationIdMap.has(mergeKey)) {
            // Merge with existing conversation
            const existing = conversationIdMap.get(mergeKey);
            
            // Merge conversation IDs
            const existingConvIds = existing.mergedConversationIds || new Set();
            convIds.forEach(id => existingConvIds.add(id));
            existing.mergedConversationIds = existingConvIds;
            
            // Merge phrases
            const existingPhrases = existing.matched_phrases || [];
            const currentPhrases = item.matched_phrases || [];
            const mergedPhrases = new Set([...existingPhrases, ...currentPhrases]);
            existing.matched_phrases = Array.from(mergedPhrases).filter(p => p && p.trim());
            
            // Preserve flags (if any record has it, keep it)
            existing.is_pro_services_related = existing.is_pro_services_related || item.is_pro_services_related === true;
            existing.is_asking_if_maids_provides_it = existing.is_asking_if_maids_provides_it || item.is_asking_if_maids_provides_it === true;
            
            // Keep earliest timestamp
            const existingTime = existing.chatStartDateTime ? new Date(existing.chatStartDateTime).getTime() : Infinity;
            const newTime = item.chatStartDateTime ? new Date(item.chatStartDateTime).getTime() : Infinity;
            if (newTime < existingTime && item.chatStartDateTime) {
                existing.chatStartDateTime = item.chatStartDateTime;
            }
            
            // Merge entity IDs (keep all contract/client/maid IDs)
            if (item.contractId && !existing.contractId) existing.contractId = item.contractId;
            if (item.clientId && !existing.clientId) existing.clientId = item.clientId;
            if (item.maidId && !existing.maidId) existing.maidId = item.maidId;
            if (item.clientName && !existing.clientName) existing.clientName = item.clientName;
            if (item.maidName && !existing.maidName) existing.maidName = item.maidName;
            if (item.contractType && !existing.contractType) existing.contractType = item.contractType;
            
            // Keep succeeded status if any record succeeded
            if (item.processingStatus === 'succeeded') {
                existing.processingStatus = 'succeeded';
            }
            
        } else {
            // New conversation
            const newConvIds = new Set(convIds);
            conversationIdMap.set(convIds[0], {
                ...item,
                mergedConversationIds: newConvIds,
            });
        }
    }
    
    const mergedByConversationId = Array.from(conversationIdMap.values());
    console.log(`[Deduplication] Merged by conversation ID: ${data.length} → ${mergedByConversationId.length} conversations`);

    // Step 1: Merge conversations by entity (contract > client > maid)
    const entityMap = new Map();
    
    for (const item of mergedByConversationId) {
        const contractId = item.contractId;
        const clientId = item.clientId;
        const maidId = item.maidId;
        const convIds = Array.from(item.mergedConversationIds || [item.conversationId]);
        
        // Determine entity key (priority: contract > client > maid)
        let entityKey = '';
        if (contractId) {
            entityKey = `contract_${contractId}`;
        } else if (clientId) {
            entityKey = `client_${clientId}`;
        } else if (maidId) {
            entityKey = `maid_${maidId}`;
        } else {
            // No entity ID, use conversation ID as fallback
            entityKey = `conv_${convIds[0]}`;
        }
        
        const existing = entityMap.get(entityKey);
        
        if (existing) {
            // Merge into existing entity
            // Merge conversation IDs
            const existingConvIds = existing.mergedConversationIds || new Set();
            convIds.forEach(id => existingConvIds.add(id));
            existing.mergedConversationIds = existingConvIds;
            
            // Merge phrases
            const existingPhrases = existing.matched_phrases || [];
            const currentPhrases = item.matched_phrases || [];
            const mergedPhrases = new Set([...existingPhrases, ...currentPhrases]);
            existing.matched_phrases = Array.from(mergedPhrases).filter(p => p && p.trim());
            
            // Preserve flags
            existing.is_pro_services_related = existing.is_pro_services_related || item.is_pro_services_related === true;
            existing.is_asking_if_maids_provides_it = existing.is_asking_if_maids_provides_it || item.is_asking_if_maids_provides_it === true;
            
            // Keep earliest timestamp
            const existingTime = existing.chatStartDateTime ? new Date(existing.chatStartDateTime).getTime() : Infinity;
            const newTime = item.chatStartDateTime ? new Date(item.chatStartDateTime).getTime() : Infinity;
            if (newTime < existingTime && item.chatStartDateTime) {
                existing.chatStartDateTime = item.chatStartDateTime;
            }
            
            // Keep entity IDs (prefer non-empty values)
            if (item.contractId && !existing.contractId) existing.contractId = item.contractId;
            if (item.clientId && !existing.clientId) existing.clientId = item.clientId;
            if (item.maidId && !existing.maidId) existing.maidId = item.maidId;
            if (item.clientName && !existing.clientName) existing.clientName = item.clientName;
            if (item.maidName && !existing.maidName) existing.maidName = item.maidName;
            if (item.contractType && !existing.contractType) existing.contractType = item.contractType;
            
            // Keep succeeded status if any record succeeded
            if (item.processingStatus === 'succeeded') {
                existing.processingStatus = 'succeeded';
            }
            
        } else {
            // New entity - add to map
            entityMap.set(entityKey, {
                ...item,
                mergedConversationIds: new Set(convIds),
            });
        }
    }
    
    let mergedByEntity = Array.from(entityMap.values());
    console.log(`[Deduplication] Merged by entity: ${mergedByConversationId.length} → ${mergedByEntity.length} unique entities`);

    // Step 2: Merge entities that share conversation IDs
    const phraseBasedMergeMap = new Map();
    const conversationIdIndex = new Map(); // conversationId -> mergeKey
    
    for (const entity of mergedByEntity) {
        // If entity has contract/client/maid ID, keep as-is (already properly merged)
        if (entity.contractId || entity.clientId || entity.maidId) {
            const entityKey = entity.contractId 
                ? `contract_${entity.contractId}`
                : entity.clientId 
                ? `client_${entity.clientId}`
                : `maid_${entity.maidId}`;
            phraseBasedMergeMap.set(entityKey, entity);
            // Index conversation IDs for this entity
            const convIds = Array.from(entity.mergedConversationIds || [entity.conversationId]);
            convIds.forEach(id => conversationIdIndex.set(id, entityKey));
            continue;
        }
        
        // For conversations without entity IDs, check if they share conversation IDs
        const convIds = Array.from(entity.mergedConversationIds || [entity.conversationId]);
        let mergeKey = null;
        
        // Check if any conversation ID already exists in another entity
        for (const convId of convIds) {
            if (conversationIdIndex.has(convId)) {
                mergeKey = conversationIdIndex.get(convId);
                break;
            }
        }
        
        // If no shared conversation ID, use conversation ID as fallback
        if (!mergeKey) {
            mergeKey = `conv_${convIds[0]}`;
        }
        
        // Merge with existing or create new
        if (phraseBasedMergeMap.has(mergeKey)) {
            const existing = phraseBasedMergeMap.get(mergeKey);
            
            // Merge conversation IDs
            const existingConvIds = existing.mergedConversationIds || new Set();
            convIds.forEach(id => existingConvIds.add(id));
            existing.mergedConversationIds = existingConvIds;
            
            // Merge phrases
            const existingPhrases = existing.matched_phrases || [];
            const currentPhrases = entity.matched_phrases || [];
            const mergedPhrases = new Set([...existingPhrases, ...currentPhrases]);
            existing.matched_phrases = Array.from(mergedPhrases).filter(p => p && p.trim());
            
            // Preserve flags
            existing.is_pro_services_related = existing.is_pro_services_related || entity.is_pro_services_related === true;
            existing.is_asking_if_maids_provides_it = existing.is_asking_if_maids_provides_it || entity.is_asking_if_maids_provides_it === true;
            
            // Update conversation ID index
            convIds.forEach(id => conversationIdIndex.set(id, mergeKey));
        } else {
            // New entity
            phraseBasedMergeMap.set(mergeKey, entity);
            convIds.forEach(id => conversationIdIndex.set(id, mergeKey));
        }
    }
    
    mergedByEntity = Array.from(phraseBasedMergeMap.values());
    console.log(`[Deduplication] Final merged entities: ${mergedByEntity.length}`);

    // Convert Set to Array for JSON serialization
    const result = mergedByEntity.map(entity => {
        const convIds = Array.from(entity.mergedConversationIds || [entity.conversationId]);
        return {
            ...entity,
            conversationId: convIds.join(', '), // Join multiple conversation IDs
            mergedConversationIds: convIds, // Keep as array for reference
            matched_phrases: entity.matched_phrases || [],
        };
    });

    return result;
}

// Export for use in browser
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { deduplicateByEntity };
}

