'use server';

import { tavily } from '@tavily/core';
import { createClient } from '@supabase/supabase-js';
import FirecrawlApp from '@mendable/firecrawl-js';
import { evaluateProduct, verifyCompetitor, filterSnippets } from '@/lib/llm';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const tavilyClient = tavily({ apiKey: process.env.TAVILY_API_KEY });
const firecrawlApp = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY });

export type ResearchResult = {
    success: boolean;
    resultsCount?: number;
    message: string;
    newCompetitors?: string[];
    logs?: string[];
};

export async function runResearchAction(
    query: string,
    mode: 'tender' | 'catalog' | 'competitor' = 'tender',
    country: string = 'Russia'
): Promise<ResearchResult> {
    const logs: string[] = [];
    const log = (msg: string) => {
        console.log(msg);
        logs.push(`${new Date().toISOString().split('T')[1].split('.')[0]} ${msg}`);
    };

    try {
        log(`Starting research for: ${query} [Mode: ${mode}, Country: ${country}]`);

        if (mode === 'competitor') {
            const res = await handleCompetitorSearch(query, country, log);
            res.logs = logs;
            return res;
        }

        // Default logic for Tender / Catalog 
        const [tavilyResponse, firecrawlResponse] = await Promise.all([
            tavilyClient.search(`${query} ${country}`, {
                searchDepth: "advanced",
                maxResults: 3
            }),
            firecrawlApp.search(`${query} ${country}`, {
                limit: 3,
                scrapeOptions: {
                    formats: ['markdown']
                }
            }).catch(e => ({ data: [] }))
        ]);

        const tavilyResults = tavilyResponse.results || [];
        const firecrawlResults = (firecrawlResponse as any).data?.map((item: any) => ({
            title: item.metadata?.title || item.title || "No Title",
            url: item.url,
            content: item.markdown || item.content || ""
        })) || [];

        const results = [...tavilyResults, ...firecrawlResults];

        if (!results || results.length === 0) {
            return { success: false, message: "No results found", logs };
        }

        const final = await processResults(query, results, mode, log);
        final.logs = logs;
        return final;

    } catch (error) {
        log(`CRITICAL ERROR: ${error}`);
        return { success: false, message: "Internal Error", logs };
    }
}

async function handleCompetitorSearch(query: string, country: string, log: (m: string) => void): Promise<ResearchResult> {

    // 1. Context Assembly
    log("Phase 0: Fetching Context...");
    const { data: profileData } = await supabase
        .from('our_products')
        .select('name')
        .order('price', { ascending: false }) // Prioritize expensive core equipment
        .limit(20);

    const context = profileData && profileData.length > 0
        ? `We manufacture: ${profileData.map(p => p.name).join(', ')}. Focus on industrial equipment.`
        : undefined;
    log(`Context built. Items: ${profileData?.length || 0}`);

    let searchResults: Array<{ title: string; url: string; content: string }> = [];
    const searchQuery = `${query} ${country} manufacturer`;

    // 2. STAGE 1: Broad Search
    try {
        log(`Phase 1: Tavily Search for "${searchQuery}"...`);
        const tv = await tavilyClient.search(searchQuery, {
            searchDepth: "advanced",
            maxResults: 10,
            includeDomains: []
        });

        searchResults = tv.results.map(r => ({
            title: r.title,
            url: r.url,
            content: r.content
        }));
        log(`Phase 1 found ${searchResults.length} raw results. Titles: ${searchResults.map(r => r.title.slice(0, 30)).join(', ')}`);

    } catch (e) {
        log(`Phase 1 Failed: ${e}`);
        return { success: false, message: "Search API Failed" };
    }

    if (searchResults.length === 0) {
        return { success: false, message: "No potential competitors found." };
    }

    // 3. STAGE 2: Filter Candidates
    log("Phase 2: AI Filtering candidates...");
    const candidateUrls = await filterSnippets(searchResults, context);
    log(`Phase 2 selected ${candidateUrls.length} candidates: ${candidateUrls.join(', ')}`);

    if (candidateUrls.length === 0) {
        return { success: false, message: "No candidates passed AI filter." };
    }

    const newCompetitors: string[] = [];
    let savedCompetitors = 0;

    // 4. STAGE 3: Deep Scrape & Verify (Parallel)
    const urlsToScrape = candidateUrls.slice(0, 3);
    log(`Phase 3: Deep Scrape & Verify for ${urlsToScrape.length} URLs (Parallel)...`);

    await Promise.all(urlsToScrape.map(async (url) => {
        const { data: existing } = await supabase.from('competitors').select('id, name').eq('website_url', url).single();
        if (existing) {
            log(`Skipping: Already exists as ${existing.name}`);
            return;
        }

        let content = "";
        try {
            if (process.env.FIRECRAWL_API_KEY) {
                const scrapeRes = await firecrawlApp.scrape(url, {
                    formats: ['markdown']
                });
                if (scrapeRes.success || (scrapeRes as any).markdown) {
                    content = (scrapeRes as any).markdown || "";
                    log(`Scrape Success: ${url.slice(0, 30)}... (${content.length} chars)`);
                } else {
                    log(`Scrape Failed (No success/markdown) for ${url}`);
                }
            }
        } catch (e) {
            log(`Scrape Exception for ${url}: ${e}`);
        }

        if (!content) {
            const fallback = searchResults.find(r => r.url === url);
            if (fallback) {
                content = fallback.content;
                log(`Using fallback snippet for ${url}`);
            }
        }

        if (!content) return;

        // 5. STAGE 4: Verification
        log(`Phase 4: Verifying ${url}...`);
        const verification = await verifyCompetitor(content, context, country);
        log(`AI Verdict ${url}: ${verification.isCompetitor ? 'COMPETITOR' : 'REJECT'}. Score: ${verification.score}. Reason: ${verification.match_reason}`);

        if (verification.isCompetitor) {
            const { data: comp, error } = await supabase
                .from('competitors')
                .upsert({
                    name: verification.name || "Unknown",
                    website_url: url,
                    description: verification.description,
                    last_analyzed_at: new Date().toISOString(),
                    status: 'active'
                }, { onConflict: 'website_url' })
                .select('id, name')
                .single();

            if (comp) {
                if (!newCompetitors.includes(comp.name)) {
                    newCompetitors.push(comp.name);
                }
                savedCompetitors++;

                if (verification.products.length > 0) {
                    const productsToInsert = verification.products.map(p => ({
                        competitor_id: comp.id,
                        name: p.name,
                        price: p.price || 0,
                        found_at: new Date().toISOString()
                    }));
                    await supabase.from('competitor_products').upsert(productsToInsert, { onConflict: 'competitor_id,name' });
                    log(`Saved ${productsToInsert.length} products for ${comp.name}`);
                }
            }
        }
    }));

    return {
        success: savedCompetitors > 0,
        resultsCount: savedCompetitors,
        message: savedCompetitors > 0 ? `Found: ${newCompetitors.join(', ')}` : "No new competitors found",
        newCompetitors,
        logs: []
    };
}

async function processResults(query: string, results: any[], mode: string, log: (m: string) => void): Promise<ResearchResult> {
    const aiEvaluation = await evaluateProduct(results[0].title, results[0].content.slice(0, 2000));
    for (const res of results) {
        await supabase.from('research_reports').insert({
            query, title: res.title.slice(0, 100), content: res.content.slice(0, 2000), url: res.url
        });
    }
    return { success: true, resultsCount: results.length, message: "OK", logs: [] };
}
