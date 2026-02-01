'use server';

import { createClient } from '@supabase/supabase-js';
import { scrapeCompetitorProducts } from '@/lib/competitor-scraper';
import fs from 'fs';
import path from 'path';

function logTrace(msg: string) {
    try {
        const logPath = path.join(process.cwd(), 'debug_trace.log');
        fs.appendFileSync(logPath, `${new Date().toISOString()} - ${msg}\n`);
    } catch (e) {
        console.error('Logging failed:', e);
    }
}

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

// Create admin client for backend operations
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Machine {
    code: string;
    name: string;
    capabilities: string;
    purpose: string;
    materials: string;
}

export type AnalysisResult = {
    success: boolean;
    productsFound: number;
    productsSaved: number;
    productsAnalyzed: number;
    averageScore: number;
    highPotentialCount: number;
    topProducts: Array<{ name: string; score: number; machines: string[] }>;
    error?: string;
    details?: string;
};

export async function performCompetitorAnalysis(
    competitorId: number,
    limit: number = 300,
    targetUrl?: string
): Promise<AnalysisResult> {
    try {
        logTrace(`Analysis Started for ID: ${competitorId} URL: ${targetUrl}`);
        // Get competitor info
        const { data: competitor, error: compError } = await supabaseAdmin
            .from('competitors')
            .select('*')
            .eq('id', competitorId)
            .single();

        if (compError || !competitor) {
            return { success: false, productsFound: 0, productsSaved: 0, productsAnalyzed: 0, averageScore: 0, highPotentialCount: 0, topProducts: [], error: 'Competitor not found' };
        }

        if (!competitor.website_url) {
            return { success: false, productsFound: 0, productsSaved: 0, productsAnalyzed: 0, averageScore: 0, highPotentialCount: 0, topProducts: [], error: 'Competitor has no website URL' };
        }

        // Get LabTech machines for feasibility analysis
        const { data: machines } = await supabaseAdmin
            .from('machines')
            .select('code, name, capabilities, purpose, materials');

        // Get Our Products for matching
        const { data: ourProducts } = await supabaseAdmin
            .from('our_products')
            .select('id, name, price_vat');

        // Step 1: Scrape competitor website for products
        logTrace('Step 1: Scrape Start');
        const products = await scrapeCompetitorProducts(competitor.website_url, limit, targetUrl);
        logTrace(`Step 1: Scrape End. Found: ${products.length}`);

        if (products.length === 0) {
            return {
                success: false,
                error: 'No products found on website',
                productsFound: 0,
                productsSaved: 0,
                productsAnalyzed: 0,
                averageScore: 0,
                highPotentialCount: 0,
                topProducts: []
            };
        }

        // Step 2: Save products to competitor_products (upsert)
        logTrace('Step 2: Save Start');
        const savedProducts = await saveCompetitorProducts(competitorId, products);
        logTrace(`Step 2: Save End. Saved: ${savedProducts.length}`);

        // Step 3: Match against our catalog
        if (ourProducts && ourProducts.length > 0) {
            await matchProducts(savedProducts, ourProducts);
        }

        // Step 4: Analyze feasibility for each product (limit to 100)
        const analysisLimit = 5; // Reduced from 100 for debugging performance
        const productsToAnalyze = savedProducts.slice(0, analysisLimit); // Analyze top N freshly scraped/saved items

        const feasibilityResults = await analyzeFeasibility(
            productsToAnalyze,
            machines || []
        );

        // Step 5: Save feasibility scores
        await saveFeasibilityScores(feasibilityResults);
        logTrace('Step 5: Feasibility End');

        // Step 6: Update competitor last_analyzed_at
        await supabaseAdmin
            .from('competitors')
            .update({
                last_analyzed_at: new Date().toISOString(),
                products_analyzed: savedProducts.length
            })
            .eq('id', competitorId);

        // Calculate stats
        const avgScore = feasibilityResults.length > 0
            ? Math.round(feasibilityResults.reduce((sum, r) => sum + r.score, 0) / feasibilityResults.length)
            : 0;

        const highPotential = feasibilityResults.filter(r => r.score >= 70).length;

        return {
            success: true,
            productsFound: products.length,
            productsSaved: savedProducts.length,
            productsAnalyzed: feasibilityResults.length,
            averageScore: avgScore,
            highPotentialCount: highPotential,
            topProducts: feasibilityResults
                .filter(r => r.score >= 70)
                .slice(0, 10)
                .map(r => ({ name: r.productName, score: r.score, machines: r.matchingMachines }))
        };

    } catch (error) {
        console.error('Analysis error:', error);
        return {
            success: false,
            productsFound: 0, productsSaved: 0, productsAnalyzed: 0, averageScore: 0, highPotentialCount: 0, topProducts: [],
            error: 'Analysis failed',
            details: String(error)
        };
    }
}

async function saveCompetitorProducts(
    competitorId: number,
    products: Array<{ name: string; price?: number }>
): Promise<Array<{ id: number; name: string }>> {
    // Only save valid products
    if (!products.length) return [];

    const toInsert = products.map(p => ({
        competitor_id: competitorId,
        name: p.name,
        price: p.price || 0,
        found_at: new Date().toISOString()
    }));

    const { data, error } = await supabaseAdmin
        .from('competitor_products')
        .upsert(toInsert, { onConflict: 'competitor_id,name' })
        .select('id, name');

    if (error) {
        console.error('Save products error:', error);
        return [];
    }

    return data || [];
}

async function matchProducts(
    competitorProducts: Array<{ id: number; name: string }>,
    ourProducts: Array<{ id: number; name: string }>
) {
    for (const cp of competitorProducts) {
        const cpName = cp.name.toLowerCase();

        // Simple heuristic matching
        const bestMatch = ourProducts.find(op => {
            const opName = op.name.toLowerCase();
            // Check for common keyword matches
            const cpKeywords = cpName.split(/[\s\-\/]+/).filter(w => w.length > 3);
            const opKeywords = opName.split(/[\s\-\/]+/).filter(w => w.length > 3);

            // Check if any significant keywords match
            const commonKeywords = cpKeywords.filter(kw =>
                opKeywords.some(ok => ok.includes(kw) || kw.includes(ok))
            );

            return commonKeywords.length >= 2; // At least 2 matching keywords
        });

        if (bestMatch) {
            // Update our_product_id directly in competitor_products table
            const { error } = await supabaseAdmin
                .from('competitor_products')
                .update({ our_product_id: bestMatch.id })
                .eq('id', cp.id);

            if (error) {
                console.error('Match update error:', error);
            } else {
                console.log(`Matched: "${cp.name}" -> "${bestMatch.name}"`);
            }
        }
    }
}

async function analyzeFeasibility(
    products: Array<{ id: number; name: string }>,
    machines: Machine[]
): Promise<Array<{ productId: number; productName: string; score: number; matchingMachines: string[]; notes: string }>> {
    if (!OPENROUTER_API_KEY || products.length === 0) return [];

    const machinesDescription = machines.map(m => `${m.code}: ${m.name} — ${m.capabilities || m.purpose}`).join('\n');
    const results: Array<{ productId: number; productName: string; score: number; matchingMachines: string[]; notes: string }> = [];

    // Batch processing
    const batchSize = 5;
    for (let i = 0; i < products.length; i += batchSize) {
        const batch = products.slice(i, i + batchSize);
        const prompt = `Ты Виртуальный Технолог ЛабТех (laboff.ru)...
СТАНКИ:
${machinesDescription}

ТОВАРЫ:
${batch.map((p, idx) => `${idx + 1}. ${p.name}`).join('\n')}

Верни JSON: { "results": [{ "index": 1, "score": 85, "machines": ["U04"], "notes": "..." }] }`;

        try {
            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'google/gemini-2.0-flash-001',
                    messages: [{ role: 'user', content: prompt }],
                    temperature: 0.3
                })
            });

            if (response.ok) {
                const data = await response.json();
                const content = data.choices?.[0]?.message?.content || '';
                const jsonMatch = content.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    const parsed = JSON.parse(jsonMatch[0]);
                    for (const result of parsed.results || []) {
                        const product = batch[result.index - 1];
                        if (product) {
                            results.push({
                                productId: product.id,
                                productName: product.name,
                                score: result.score || 0,
                                matchingMachines: result.machines || [],
                                notes: result.notes || ''
                            });
                        }
                    }
                }
            }
        } catch (error) {
            console.error('LLM analysis error:', error);
        }

        if (i + batchSize < products.length) {
            await new Promise(r => setTimeout(r, 500));
        }
    }
    return results;
}

async function saveFeasibilityScores(
    results: Array<{ productId: number; score: number; matchingMachines: string[]; notes: string }>
): Promise<void> {
    if (results.length === 0) return;

    const toUpsert = results.map(r => ({
        competitor_product_id: r.productId,
        feasibility_score: r.score,
        matching_machines: r.matchingMachines,
        analysis_notes: r.notes,
        analyzed_at: new Date().toISOString()
    }));

    const { error } = await supabaseAdmin
        .from('product_feasibility')
        .upsert(toUpsert, { onConflict: 'competitor_product_id' });

    if (error) console.error('Save feasibility error:', error);
}
