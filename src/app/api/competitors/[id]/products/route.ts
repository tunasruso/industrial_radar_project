import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Get products for a specific competitor
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        // 0. Get competitor info
        const { data: competitor } = await supabase
            .from('competitors')
            .select('id, name, website_url')
            .eq('id', id)
            .single();

        // 1. Get products
        const { data: products, error: prodError } = await supabase
            .from('competitor_products')
            .select('*')
            .eq('competitor_id', id)
            .order('found_at', { ascending: false });

        if (prodError) throw prodError;

        if (!products || products.length === 0) {
            return NextResponse.json({
                competitor,
                products: []
            });
        }

        const productIds = products.map(p => p.id);

        // 2. Get feasibility scores
        const { data: feasibility, error: feasError } = await supabase
            .from('product_feasibility')
            .select('competitor_product_id, feasibility_score, matching_machines, analysis_notes')
            .in('competitor_product_id', productIds);

        // 3. Get price matches (and our product details)
        const { data: matches, error: matchError } = await supabase
            .from('product_matches')
            .select(`
                competitor_product_id,
                our_product:our_products (
                    id, name, price_vat
                )
            `)
            .in('competitor_product_id', productIds);

        // Merge data
        const mergedProducts = products.map(p => {
            const feas = feasibility?.find(f => f.competitor_product_id === p.id);
            const match = matches?.find(m => m.competitor_product_id === p.id);
            // @ts-ignore
            const ourProductRaw = match?.our_product;
            const ourProduct = Array.isArray(ourProductRaw) ? ourProductRaw[0] : ourProductRaw;

            return {
                ...p,
                feasibility_score: feas?.feasibility_score || 0,
                matching_machines: feas?.matching_machines || [],
                analysis_notes: feas?.analysis_notes || null,
                our_product: ourProduct ? {
                    name: ourProduct.name,
                    price: ourProduct.price_vat
                } : null
            };
        });

        // Sort: High score first, then new ones
        mergedProducts.sort((a, b) => {
            if (b.feasibility_score !== a.feasibility_score) {
                return b.feasibility_score - a.feasibility_score;
            }
            return new Date(b.found_at).getTime() - new Date(a.found_at).getTime();
        });

        return NextResponse.json({
            competitor,
            products: mergedProducts
        });
    } catch (error) {
        console.error('Fetch error:', error);
        return NextResponse.json({ error: 'Failed to fetch competitor products' }, { status: 500 });
    }
}

// Add a product to a competitor
export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();

        const { data, error } = await supabase
            .from('competitor_products')
            .insert({
                competitor_id: parseInt(id),
                name: body.name,
                price: body.price,
                url: body.url,
                notes: body.notes
            })
            .select()
            .single();

        if (error) throw error;
        return NextResponse.json(data);
    } catch (error) {
        console.error('Create error:', error);
        return NextResponse.json({ error: 'Failed to add competitor product' }, { status: 500 });
    }
}
