import { createOpenAI } from '@ai-sdk/openai';
import { streamText, tool, generateText } from 'ai';
import { z } from 'zod';
import { performCompetitorAnalysis } from '@/app/actions/analysis';
import { runResearchAction } from '@/app/actions/research';
import { createClient } from '@supabase/supabase-js';

const openrouter = createOpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: process.env.OPENROUTER_API_KEY,
});

// Admin client for tool execution logic
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export const maxDuration = 120; // 2 minutes

// Tool execution functions (called manually)
async function executeAnalyzeCompetitorUrl(params: { url: string; name?: string }) {
    console.log(`Tool: analyze_competitor_url executing for ${params.url}`);
    try {
        let targetUrlObj: URL;
        try {
            targetUrlObj = new URL(params.url);
        } catch (e) {
            return { success: false, error: "Invalid URL format" };
        }

        const domain = targetUrlObj.hostname.replace('www.', '');

        let { data: comp } = await supabaseAdmin
            .from('competitors')
            .select('id, name, website_url')
            .ilike('website_url', `%${domain}%`)
            .maybeSingle();

        if (!comp) {
            const { data: newComp, error } = await supabaseAdmin
                .from('competitors')
                .insert({
                    name: params.name || domain,
                    website_url: targetUrlObj.origin,
                    status: 'new',
                    description: 'Auto-created via Chat Assistant'
                })
                .select('id, name, website_url')
                .single();

            if (error || !newComp) {
                console.error("Create competitor failed:", error);
                return { success: false, error: "Failed to create competitor: " + (error?.message || "Unknown error") };
            }
            comp = newComp;
        }

        const analysisResult = await performCompetitorAnalysis(comp.id, 100, params.url);
        console.log("Tool: analyze_competitor_url RESULT:", JSON.stringify(analysisResult, null, 2));
        return analysisResult;

    } catch (error) {
        console.error("Tool execution failed:", error);
        return { success: false, error: String(error) };
    }
}

async function executeSearchCompetitors(params: { query: string; country?: string }) {
    console.log(`Tool: search_competitors executing for ${params.query} in ${params.country || 'Russia'}`);
    return await runResearchAction(params.query, 'competitor', params.country || 'Russia');
}

const systemPrompt = `You are the "LabTech Virtual Technologist" assistant.
Your goal is to help analyze competitors and match products to manufacturing capabilities.

CRITICAL: When the user provides a URL or asks to analyze something:
1. Extract the URL from their message
2. Respond ONLY with this JSON (nothing else before or after):
{"action": "analyze_url", "url": "THE_URL_HERE", "name": "Optional Competitor Name"}

When the user asks to search for competitors or manufacturers:
Respond ONLY with:
{"action": "search", "query": "search terms", "country": "Russia"}

For general questions (greetings, explanations, etc.), respond normally in Russian.
Do NOT add any text before or after the JSON when processing URLs.`;

export async function POST(req: Request) {
    try {
        console.log("API/CHAT: Hit");
        const apiKey = process.env.OPENROUTER_API_KEY;
        if (!apiKey) {
            console.error("API/CHAT: OPENROUTER_API_KEY missing");
            return new Response(JSON.stringify({ error: "Configuration Error: API Key missing" }), { status: 500 });
        }

        const body = await req.json();
        console.log("API/CHAT: Body received:", JSON.stringify(body, null, 2));
        const { messages } = body;

        // Sanitize messages
        const coreMessages = messages
            .filter((m: any) => m.role && m.content && typeof m.content === 'string')
            .filter((m: any) => !m.content.startsWith('Hello! I am your AI Technologist Assistant'))
            .map((m: any) => ({
                role: m.role as 'user' | 'assistant',
                content: m.content as string
            }));

        console.log("API/CHAT: Processing", coreMessages.length, "messages");

        // First pass: Get LLM response (may contain action JSON)
        const firstResult = await streamText({
            model: openrouter('anthropic/claude-3-haiku'),
            messages: coreMessages,
            system: systemPrompt,
        });

        // Collect the full response to check for action JSON
        let fullText = '';
        const responseStream = new TransformStream();
        const writer = responseStream.writable.getWriter();
        const encoder = new TextEncoder();

        // Process the stream - collect full response first, then decide what to show
        (async () => {
            try {
                // First, collect the entire response
                for await (const chunk of firstResult.textStream) {
                    fullText += chunk;
                }

                // Check if response contains an action JSON (with or without markdown wrapper)
                // Pattern 1: ```json { ... } ```
                // Pattern 2: raw { "action": "..." }
                let action: any = null;

                const markdownJsonMatch = fullText.match(/```json\s*\n?([\s\S]*?)\n?```/);
                if (markdownJsonMatch) {
                    try {
                        action = JSON.parse(markdownJsonMatch[1]);
                    } catch (e) {
                        console.log("API/CHAT: Failed to parse markdown JSON");
                    }
                }

                // Try raw JSON if markdown didn't work
                if (!action) {
                    const rawJsonMatch = fullText.match(/\{[\s\S]*"action"\s*:\s*"[^"]+"/);
                    if (rawJsonMatch) {
                        // Find the complete JSON object
                        const startIdx = fullText.indexOf(rawJsonMatch[0]);
                        let braceCount = 0;
                        let endIdx = startIdx;
                        for (let i = startIdx; i < fullText.length; i++) {
                            if (fullText[i] === '{') braceCount++;
                            if (fullText[i] === '}') {
                                braceCount--;
                                if (braceCount === 0) {
                                    endIdx = i + 1;
                                    break;
                                }
                            }
                        }
                        try {
                            action = JSON.parse(fullText.slice(startIdx, endIdx));
                        } catch (e) {
                            console.log("API/CHAT: Failed to parse raw JSON");
                        }
                    }
                }

                if (action) {
                    console.log("API/CHAT: Detected action:", action);

                    // Execute the action
                    let toolResult: any;
                    if (action.action === 'analyze_url' && action.url) {
                        await writer.write(encoder.encode(`data: {"type":"text-delta","delta":"\\n\\n🔄 **Analyzing URL...**\\n"}\n\n`));
                        toolResult = await executeAnalyzeCompetitorUrl({ url: action.url, name: action.name });
                    } else if (action.action === 'search' && action.query) {
                        await writer.write(encoder.encode(`data: {"type":"text-delta","delta":"\\n\\n🔍 **Searching...**\\n"}\n\n`));
                        toolResult = await executeSearchCompetitors({ query: action.query, country: action.country });
                    }

                    if (toolResult) {
                        // Format the result
                        let resultText = '';
                        if (toolResult.success) {
                            resultText = `
✅ **Analysis Complete**

- **Products Found:** ${toolResult.productsFound || 0}
- **Products Saved:** ${toolResult.productsSaved || 0}
- **Products Analyzed:** ${toolResult.productsAnalyzed || 0}
- **Average Score:** ${toolResult.averageScore || 0}/100
- **High Potential (>70):** ${toolResult.highPotentialCount || 0}
`;
                            if (toolResult.topProducts && toolResult.topProducts.length > 0) {
                                resultText += `\n**Top Products:**\n`;
                                for (const p of toolResult.topProducts) {
                                    resultText += `- ${p.name} (Score: ${p.score}, Machines: ${p.machines?.join(', ') || 'N/A'})\n`;
                                }
                            }
                            resultText += `\n📊 [View full details in the Dashboard](/dashboard/competitors)`;
                        } else {
                            resultText = `\n❌ **Error:** ${toolResult.error || 'Unknown error'}`;
                        }

                        // Send the formatted result
                        for (const line of resultText.split('\n')) {
                            await writer.write(encoder.encode(`data: {"type":"text-delta","delta":"${line.replace(/"/g, '\\"')}\\n"}\n\n`));
                        }
                    }
                } else {
                    // No action detected, stream the regular response
                    const escapedText = fullText.replace(/"/g, '\\"').replace(/\n/g, '\\n');
                    await writer.write(encoder.encode(`data: {"type":"text-delta","delta":"${escapedText}"}\n\n`));
                }

                // Send done signal
                await writer.write(encoder.encode(`data: {"type":"finish","finishReason":"stop"}\n\n`));
                await writer.write(encoder.encode(`data: [DONE]\n\n`));
                await writer.close();
            } catch (err) {
                console.error("API/CHAT: Stream error:", err);
                await writer.abort(err);
            }
        })();

        return new Response(responseStream.readable, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            },
        });

    } catch (error: any) {
        console.error("API/CHAT: Critical Error", error);
        return new Response(JSON.stringify({
            error: "Internal Server Error",
            details: error.message,
            stack: error.stack
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
