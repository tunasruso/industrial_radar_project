import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const competitorId = searchParams.get('competitor_id');

        let query = supabase
            .from('competitor_products')
            .select('*')
            .order('id', { ascending: false });

        if (competitorId) {
            query = query.eq('competitor_id', competitorId);
        }

        const { data, error } = await query;

        if (error) throw error;
        return NextResponse.json(data || []);
    } catch (error) {
        console.error('Fetch error:', error);
        return NextResponse.json({ error: 'Failed to fetch competitor products' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { data, error } = await supabase
            .from('competitor_products')
            .insert({
                competitor_id: body.competitor_id,
                name: body.name,
                price: body.price,
                url: body.url,
                our_product_id: body.our_product_id
            })
            .select()
            .single();

        if (error) throw error;
        return NextResponse.json(data);
    } catch (error) {
        console.error('Create error:', error);
        return NextResponse.json({ error: 'Failed to create competitor product' }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const body = await request.json();
        const { id, ...updateData } = body;

        const { data, error } = await supabase
            .from('competitor_products')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return NextResponse.json(data);
    } catch (error) {
        console.error('Update error:', error);
        return NextResponse.json({ error: 'Failed to update competitor product' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'ID required' }, { status: 400 });
        }

        const { error } = await supabase
            .from('competitor_products')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete error:', error);
        return NextResponse.json({ error: 'Failed to delete competitor product' }, { status: 500 });
    }
}
