import { useCallback } from 'react';
import { supabase } from '../lib/supabase';

/**
 * N8N Auto-Tagging Webhook Configuration
 * 
 * Webhook URL: https://callistoai.app.n8n.cloud/webhook/d2855857-3e7b-4465-b627-89ed188f2151
 * 
 * HOW TAGS ARE STORED IN SUPABASE:
 * ================================
 * - Table: "files"
 * - Column: "tags" 
 * - Type: text[] (PostgreSQL text array)
 * - Default: '{}' (empty array)
 * 
 * TAG PAYLOAD SENT TO N8N:
 * ========================
 * The webhook receives:
 * {
 *   fileId: string,              // UUID of the file in Supabase
 *   fileName: string,             // Display name (no extension)
 *   originalName: string,         // Full file name with extension
 *   fileType: string,             // MIME type (e.g., "image/jpeg")
 *   fileCategory: string,         // Category: "image", "video", "audio", "document", "archive", "other"
 *   fileSize: number,             // Size in bytes
 *   fileUrl: string,              // Public URL to download/analyze the file
 *   thumbnailUrl: string | null,  // Public thumbnail URL (for images/videos)
 *   filePath: string,             // Storage path in Supabase
 *   workspaceId: string,          // Workspace UUID
 *   projectId: string | null,     // Project UUID (if in a project)
 *   folderId: string | null,      // Folder UUID (if in a folder)
 *   currentTags: string[],        // Existing tags (for manual re-tagging)
 *   timestamp: string,            // ISO 8601 timestamp
 *   triggerType: string,          // "manual" or "automatic"
 *   context: {
 *     workspace?: string,
 *     uploadSource: string        // "filevault-manual-retag" or "filevault-web"
 *   }
 * }
 * 
 * EXPECTED N8N RESPONSE:
 * ======================
 * The n8n workflow should return:
 * {
 *   tags: string[]                // Array of tag strings (e.g., ["design", "ui", "mockup"])
 * }
 * 
 * TAG SYNCING LOGIC:
 * ==================
 * 1. File uploaded → webhook triggered → n8n analyzes → returns tags array
 * 2. Tags stored directly in files.tags column as PostgreSQL text array
 * 3. No separate tags table - tags are embedded in each file record
 * 4. Tags can be updated via: 
 *    UPDATE files SET tags = ARRAY['tag1', 'tag2'] WHERE id = 'file-uuid'
 * 
 * IMPORTANT NOTES FOR N8N WORKFLOW:
 * ==================================
 * - Return tags as a JSON array of strings
 * - Tags should be lowercase for consistency
 * - Empty array [] is valid (means "no tags")
 * - n8n can use fileUrl to download and analyze the file
 * - thumbnailUrl is available for visual content analysis
 * - The workflow should respond within 30 seconds to avoid timeouts
 */
const N8N_WEBHOOK_URL = 'https://callistoai.app.n8n.cloud/webhook/d2855857-3e7b-4465-b627-89ed188f2151';

export interface AutoTaggingResult {
  success: boolean;
  suggestedTags?: string[];
  error?: string;
}

export const useAutoTagging = () => {
  const triggerAutoTagging = useCallback(async (fileId: string): Promise<AutoTaggingResult> => {
    try {
      // Get file data from database
      const { data: file, error: fetchError } = await supabase
        .from('files')
        .select('*')
        .eq('id', fileId)
        .single();

      if (fetchError || !file) {
        throw new Error('File not found');
      }

      // Generate public URLs for the file and thumbnail
      const fileUrl = file.file_url || (() => {
        const { data } = supabase.storage.from('files').getPublicUrl(file.file_path);
        return data.publicUrl;
      })();

      const thumbnailUrl = file.thumbnail_url || (() => {
        if (file.thumbnail_url) {
          return file.thumbnail_url;
        }
        // For images, use the file itself as thumbnail
        if (file.file_category === 'image') {
          return fileUrl;
        }
        return null;
      })();

      // Prepare webhook payload
      const webhookPayload = {
        fileId: file.id,
        fileName: file.name,
        originalName: file.original_name,
        fileType: file.file_type,
        fileCategory: file.file_category,
        fileSize: file.file_size,
        fileUrl: fileUrl,
        thumbnailUrl: thumbnailUrl,
        filePath: file.file_path,
        workspaceId: file.workspace_id,
        projectId: file.project_id,
        folderId: file.folder_id,
        currentTags: file.tags || [],
        timestamp: new Date().toISOString(),
        triggerType: 'manual', // Distinguish from automatic upload triggers
        context: {
          uploadSource: 'filevault-manual-retag'
        }
      };


      // Send to n8n webhook
      const response = await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(webhookPayload)
      });

      if (!response.ok) {
        throw new Error(`Webhook request failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();

      // Check if n8n returned tags immediately
      if (result.tags && Array.isArray(result.tags) && result.tags.length > 0) {
        
        // Update file tags in database
        const { error: updateError } = await supabase
          .from('files')
          .update({ tags: result.tags })
          .eq('id', fileId);

        if (updateError) {
          console.error('Failed to update file tags:', updateError);
          throw new Error('Failed to update file tags');
        }

        return {
          success: true,
          suggestedTags: result.tags
        };
      }

      return {
        success: true,
        suggestedTags: result.suggestedTags || []
      };

    } catch (error) {
      console.error('Auto-tagging failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Auto-tagging failed'
      };
    }
  }, []);

  const updateFileTags = useCallback(async (fileId: string, newTags: string[]): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('files')
        .update({ tags: newTags })
        .eq('id', fileId);

      if (error) throw error;

      return true;

    } catch (error) {
      console.error('Failed to update file tags:', error);
      return false;
    }
  }, []);

  return {
    triggerAutoTagging,
    updateFileTags
  };
};