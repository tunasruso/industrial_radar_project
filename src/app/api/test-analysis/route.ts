import { performCompetitorAnalysis } from '@/app/actions/analysis';

export async function GET(req: Request) {
    const url = new URL(req.url);
    const targetUrl = url.searchParams.get('url') || 'https://energy1.ru/ru/catalog/category/probootbornyie-ustroystva/';

    console.log("TEST ENDPOINT: Starting analysis for", targetUrl);

    try {
        // Use a dummy competitor ID (1) or create one
        const result = await performCompetitorAnalysis(1, 10, targetUrl);
        console.log("TEST ENDPOINT: Result:", JSON.stringify(result, null, 2));
        return new Response(JSON.stringify(result, null, 2), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error: any) {
        console.error("TEST ENDPOINT: Error:", error);
        return new Response(JSON.stringify({ error: error.message, stack: error.stack }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
