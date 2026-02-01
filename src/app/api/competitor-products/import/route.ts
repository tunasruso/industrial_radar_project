import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { competitor_id, products } = body;

        if (!competitor_id || !Array.isArray(products)) {
            return NextResponse.json({
                error: 'competitor_id and products array required'
            }, { status: 400 });
        }

        // Validate and filter products
        const filteredProducts = products
            .filter((p: { name?: string; price?: number }) => {
                if (!p.name || !p.price) return false;
                const name = String(p.name).trim();
                const price = parseFloat(String(p.price));
                // Filter out short names, invalid prices, and placeholder text
                if (name.length < 5) return false;
                if (price <= 0 || isNaN(price)) return false;
                // Skip common placeholder text
                const lowerName = name.toLowerCase();
                if (lowerName === 'компл' || lowerName === 'по запросу' ||
                    lowerName === 'цена' || lowerName === 'наименование') return false;
                return true;
            })
            .map((p: { name: string; price: number }) => ({
                competitor_id: parseInt(competitor_id),
                name: String(p.name).substring(0, 300).trim(),
                price: parseFloat(String(p.price))
            }));

        // Deduplicate by name (keep first occurrence with that name)
        const seenNames = new Set<string>();
        const validProducts = filteredProducts.filter(p => {
            const key = p.name.toLowerCase();
            if (seenNames.has(key)) return false;
            seenNames.add(key);
            return true;
        });

        if (validProducts.length === 0) {
            return NextResponse.json({
                error: 'No valid products to import after filtering'
            }, { status: 400 });
        }

        // Insert in batches of 100 to avoid Supabase limits
        const batchSize = 100;
        let totalImported = 0;
        let errors: string[] = [];

        for (let i = 0; i < validProducts.length; i += batchSize) {
            const batch = validProducts.slice(i, i + batchSize);

            const { data, error } = await supabase
                .from('competitor_products')
                .upsert(batch, {
                    onConflict: 'competitor_id,name',
                    ignoreDuplicates: false
                })
                .select('id');

            if (error) {
                console.error(`Batch ${i / batchSize + 1} error:`, error);
                errors.push(`Batch ${i / batchSize + 1}: ${error.message}`);
            } else {
                totalImported += data?.length || 0;
            }
        }

        if (totalImported === 0 && errors.length > 0) {
            return NextResponse.json({
                error: `Import failed: ${errors[0]}`
            }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            imported: totalImported,
            total_submitted: products.length,
            filtered_valid: validProducts.length,
            batches: Math.ceil(validProducts.length / batchSize),
            errors: errors.length > 0 ? errors : undefined,
            message: `Импортировано ${totalImported} товаров.`
        });
    } catch (error) {
        console.error('Import error:', error);
        return NextResponse.json({
            error: `Failed to import: ${error instanceof Error ? error.message : 'Unknown error'}`
        }, { status: 500 });
    }
}
