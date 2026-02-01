import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Get all matches with joined data for price comparison
export async function GET() {
    try {
        const { data, error } = await supabase
            .from('product_matches')
            .select(`
        *,
        our_products:our_product_id(id, name, price_vat, category),
        competitor_products:competitor_product_id(id, name, price, url, competitor_id, competitors:competitor_id(name, website_url))
      `)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return NextResponse.json(data);
    } catch (error) {
        console.error('Fetch error:', error);
        return NextResponse.json({ error: 'Failed to fetch matches' }, { status: 500 });
    }
}

// Create a new match
export async function POST(request: Request) {
    try {
        const body = await request.json();

        // Calculate price difference if both prices exist
        let priceDifference = null;
        if (body.our_price && body.competitor_price) {
            priceDifference = body.competitor_price - body.our_price;
        }

        const { data, error } = await supabase
            .from('product_matches')
            .insert({
                our_product_id: body.our_product_id,
                competitor_product_id: body.competitor_product_id,
                match_type: body.match_type,
                price_difference: priceDifference
            })
            .select()
            .single();

        if (error) throw error;
        return NextResponse.json(data);
    } catch (error) {
        console.error('Create error:', error);
        return NextResponse.json({ error: 'Failed to create match' }, { status: 500 });
    }
}
