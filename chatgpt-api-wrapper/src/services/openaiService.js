import fetch from 'node-fetch';

/**
 * Call OpenAI Chat Completions API with modified payload
 */
export async function callOpenAI({ messages, model = 'gpt-4', system_hints }) {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
        throw new Error('OPENAI_API_KEY not configured');
    }

    const payload = {
        model,
        messages,
        temperature: 1
    };

    // Inject system_hints if provided (INVISIBLE to user)
    if (system_hints) {
        payload.system_hints = system_hints;
    }

    console.log('[OpenAIService] Calling OpenAI with payload:', JSON.stringify(payload, null, 2));

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenAI API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return data;
}
