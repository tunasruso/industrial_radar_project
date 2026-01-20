import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);

export interface MatchResult {
    id: number;
    article: string;
    product_name: string;
    confidence_score: number;
    estimated_cost: number;
    category: string;
    material: string;
    created_at: string;
}
