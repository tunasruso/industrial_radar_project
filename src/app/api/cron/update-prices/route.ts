import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { scrapeCompetitorProducts } from '@/lib/competitor-scraper';

export const maxDuration = 300; // 5 minutes timeout

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const forceId = searchParams.get('id');

        // 1. Select competitor to update
        let competitor;

        if (forceId) {
            const { data } = await supabase
                .from('competitors')
                .select('*')
                .eq('id', forceId)
                .single();
            competitor = data;
        } else {
            // Pick the one updated longest ago
            const { data } = await supabase
                .from('competitors')
                .select('*')
                .order('last_analyzed_at', { ascending: true })
                .limit(1)
                .single();
            competitor = data;
        }

        if (!competitor || !competitor.website_url) {
            return NextResponse.json({ message: 'No eligible competitor found' });
        }

        console.log(`Starting price update for: ${competitor.name}`);

        // 2. Fetch current DB products for this competitor
        const { data: currentProducts } = await supabase
            .from('competitor_products')
            .select('id, name, price')
            .eq('competitor_id', competitor.id);

        const dbProductMap = new Map(currentProducts?.map(p => [p.name, p]) || []);

        // 3. Scrape fresh data (limit 300 to be safe)
        const scrapedProducts = await scrapeCompetitorProducts(competitor.website_url, 300);

        if (scrapedProducts.length === 0) {
            return NextResponse.json({
                success: false,
                message: 'Scraping returned 0 products',
                competitor: competitor.name
            });
        }

        // 4. Compare and Update
        let stats = {
            processed: 0,
            updated: 0,
            new: 0,
            history_records: 0
        };

        for (const scraped of scrapedProducts) {
            const existing = dbProductMap.get(scraped.name);
            const newPrice = scraped.price || 0;

            if (existing) {
                // Check if price changed
                const oldPrice = existing.price || 0;

                // If price changed significantly (> 1%) or it was 0/null before
                if (Math.abs(newPrice - oldPrice) > (oldPrice * 0.01) || (oldPrice === 0 && newPrice > 0)) {
                    // Record history
                    await supabase.from('price_history').insert({
                        competitor_product_id: existing.id,
                        price: newPrice,
                        change_type: newPrice > oldPrice ? 'increase' : 'decrease',
                        recorded_at: new Date().toISOString()
                    });

                    // Update product
                    await supabase.from('competitor_products').update({
                        price: newPrice,
                        last_updated_at: new Date().toISOString()
                    }).eq('id', existing.id);

                    stats.updated++;
                    stats.history_records++;
                } else {
                    // Just update timestamp
                    await supabase.from('competitor_products').update({
                        last_updated_at: new Date().toISOString()
                    }).eq('id', existing.id);
                }
            } else {
                // New product found
                const { data: newProd } = await supabase.from('competitor_products').insert({
                    competitor_id: competitor.id,
                    name: scraped.name,
                    price: newPrice,
                    found_at: new Date().toISOString(),
                    last_updated_at: new Date().toISOString()
                }).select('id').single();

                if (newProd) {
                    // Initial history record
                    await supabase.from('price_history').insert({
                        competitor_product_id: newProd.id,
                        price: newPrice,
                        change_type: 'new',
                        recorded_at: new Date().toISOString()
                    });
                    stats.new++;
                }
            }
            stats.processed++;
        }

        // Update competitor timestamp
        await supabase.from('competitors').update({
            last_analyzed_at: new Date().toISOString()
        }).eq('id', competitor.id);

        return NextResponse.json({
            success: true,
            competitor: competitor.name,
            stats
        });

    } catch (error) {
        console.error('Price update cron error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
