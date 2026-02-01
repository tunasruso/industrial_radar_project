import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
    try {
        const { data: machines, error } = await supabase
            .from('machines')
            .select('*')
            .order('code', { ascending: true });

        if (error) throw error;

        return NextResponse.json(machines || []);
    } catch (error) {
        console.error('Fetch error:', error);
        return NextResponse.json({ error: 'Failed to fetch machines' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { data: machine, error } = await supabase
            .from('machines')
            .insert({
                code: body.code,
                name: body.name,
                type: body.type,
                brand_model: body.brand_model,
                purpose: body.purpose,
                specifications: body.specifications,
                capabilities: body.capabilities,
                notes: body.notes,
                status: body.status || 'IDLE_PRIORITY'
            })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json(machine);
    } catch (error) {
        console.error('Create error:', error);
        return NextResponse.json({ error: 'Failed to create machine' }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const body = await request.json();
        const { id, ...data } = body;

        // Build update data object
        const updateData: Record<string, unknown> = {};

        // Map all fields that might be updated
        if (data.code !== undefined) updateData.code = data.code;
        if (data.name !== undefined) updateData.name = data.name;
        if (data.type !== undefined) updateData.type = data.type;
        if (data.brand_model !== undefined) updateData.brand_model = data.brand_model;
        if (data.purpose !== undefined) updateData.purpose = data.purpose;
        if (data.specifications !== undefined) updateData.specifications = data.specifications;
        if (data.capabilities !== undefined) updateData.capabilities = data.capabilities;
        if (data.notes !== undefined) updateData.notes = data.notes;
        if (data.status !== undefined) updateData.status = data.status;

        const { data: machine, error } = await supabase
            .from('machines')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json(machine);
    } catch (error) {
        console.error('Update error:', error);
        return NextResponse.json({ error: 'Failed to update machine' }, { status: 500 });
    }
}
