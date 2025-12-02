import { fetchMemory } from '../services/memoryService.js';
import { callOpenAI } from '../services/openaiService.js';

/**
 * Main chat handler with memory injection
 */
export async function chatHandler(req, res) {
    try {
        const {
            message,
            session_id,
            user_id = process.env.DEFAULT_USER_ID,
            project_id = process.env.DEFAULT_PROJECT_ID,
            model = 'gpt-4',
            history = []
        } = req.body;

        if (!message) {
            return res.status(400).json({ error: 'message is required' });
        }

        if (!user_id || !project_id) {
            return res.status(400).json({ error: 'user_id and project_id are required' });
        }

        console.log(`[ChatHandler] Processing message for user ${user_id}, session ${session_id}`);

        // 1. Fetch memory from backend
        const memory = await fetchMemory({
            query: message,
            userId: user_id,
            projectId: project_id,
            sessionId: session_id,
            limit: 5
        });

        // 2. Prepare user message with memory injection
        let userMessage = message;

        if (memory) {
            // Construct memory block and prepend to user message
            const memoryBlock =
                "[semantix-memory-block]\n" +
                memory + "\n" +
                "[semantix-end-memory-block]\n\n";

            userMessage = memoryBlock + message;
            console.log('[ChatHandler] Memory injected: YES');
        } else {
            console.log('[ChatHandler] Memory injected: NO');
        }

        // 3. Build messages array with modified user message
        const messages = [
            ...history,
            { role: 'user', content: userMessage }
        ];

        // 4. Call OpenAI with modified payload
        const response = await callOpenAI({
            messages,
            model
        });

        // 5. Return response
        res.json({
            success: true,
            message: response.choices[0].message.content,
            usage: response.usage,
            memory_injected: !!memory,
            session_id
        });

    } catch (error) {
        console.error('[ChatHandler] Error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}
