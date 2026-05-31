import { getAuthToken } from '../lib/supabase';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/**
 * Upload a document for analysis.
 * Returns { document_id, status, message }.
 */
export async function uploadDocument(
  file: File,
  onProgress?: (pct: number) => void
): Promise<{ document_id: string; status: string; message: string }> {
  const token = await getAuthToken();

  const formData = new FormData();
  formData.append('file', file);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_BASE_URL}/api/v1/documents/upload`);
    
    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status === 202) {
        resolve(JSON.parse(xhr.responseText));
      } else {
        try {
          const err = JSON.parse(xhr.responseText);
          reject(new Error(err.detail || 'Upload failed'));
        } catch {
          reject(new Error(`Upload failed (${xhr.status})`));
        }
      }
    });

    xhr.addEventListener('error', () => reject(new Error('Network error during upload')));
    xhr.addEventListener('abort', () => reject(new Error('Upload cancelled')));

    xhr.send(formData);
  });
}

/**
 * Connect to the SSE stream for document processing status.
 */
export function connectDocumentStatus(
  documentId: string,
  token: string,
  onEvent: (data: {
    progress: number;
    label: string;
    status: string;
    result_url?: string;
    error?: string;
  }) => void,
  onError?: (err: Event) => void
): EventSource {
  // EventSource doesn't support custom headers, so pass token as query param
  // The backend should handle this via Authorization header from our SSE approach
  // For now we use fetch-based SSE
  const url = `${API_BASE_URL}/api/v1/documents/${documentId}/status`;
  
  // Use fetch-based SSE to include auth header
  const controller = new AbortController();
  
  (async () => {
    try {
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        onEvent({ progress: 0, label: 'Error', status: 'failed', error: 'Connection failed' });
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              onEvent(data);
              if (data.status === 'done' || data.status === 'failed' || data.status === 'timeout') {
                reader.cancel();
                return;
              }
            } catch (e) {
              // Skip malformed events
            }
          }
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        onError?.(err);
      }
    }
  })();

  // Return a fake EventSource-like object for cleanup
  return { close: () => controller.abort() } as any;
}

/**
 * Get the full analysis result for a processed document.
 */
export async function getDocumentResult(documentId: string): Promise<any> {
  const token = await getAuthToken();
  const res = await fetch(`${API_BASE_URL}/api/v1/documents/${documentId}/result`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to fetch result');
  }
  return res.json();
}

/**
 * Generate a shareable link for a document analysis.
 */
export async function shareDocument(documentId: string): Promise<{ share_url: string; share_token: string; expires_in_hours: number }> {
  const token = await getAuthToken();
  const res = await fetch(`${API_BASE_URL}/api/v1/documents/${documentId}/share`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to create share link');
  return res.json();
}

/**
 * Get a shared document analysis (no auth required).
 */
export async function getSharedDocument(shareToken: string): Promise<any> {
  const res = await fetch(`${API_BASE_URL}/api/v1/documents/shared/${shareToken}`);
  if (!res.ok) throw new Error('Share link expired or invalid');
  return res.json();
}

/**
 * Delete a document.
 */
export async function deleteDocument(documentId: string): Promise<void> {
  const token = await getAuthToken();
  const res = await fetch(`${API_BASE_URL}/api/v1/documents/${documentId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to delete document');
}

/**
 * List authenticated user's documents.
 */
export async function getMyDocuments(): Promise<{ documents: any[] }> {
  const token = await getAuthToken();
  const res = await fetch(`${API_BASE_URL}/api/v1/documents/my`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch documents');
  return res.json();
}
