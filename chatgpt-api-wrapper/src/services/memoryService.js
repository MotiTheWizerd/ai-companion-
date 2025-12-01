import fetch from 'node-fetch';

/**
 * Fetch memory from backend API
 */
export async function fetchMemory({ query, userId, projectId, sessionId, limit = 5 }) {
    const backendUrl = process.env.BACKEND_API_URL || 'http://localhost:8000';

    try {
        const response = await fetch(`${backendUrl}/conversations/fetch-memory`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                query,
                user_id: userId,
                project_id: projectId,
                session_id: sessionId,
                limit,
                min_similarity: 0.5
            })
        });

        if (!response.ok) {
            console.warn(`[MemoryService] Backend returned ${response.status}`);
            return null;
        }

        const data = await response.json();
        return data.synthesized_memory || null;
    } catch (error) {
        console.error('[MemoryService] Failed to fetch memory:', error.message);
        return null;
    }
}
