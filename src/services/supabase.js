import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ohuvhrqsjsllsdjlcmrn.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_WDCkfLpJZUFriDykVdkHNg_96_L77wl';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// --- Curated Stocks ---

export const getCuratedStocks = async () => {
    const { data, error } = await supabase
        .from('curated_stocks')
        .select('*')
        .order('position', { ascending: true });

    if (error) {
        console.error('Error fetching curated stocks:', error);
        return [];
    }
    return data || [];
};

export const addCuratedStock = async (ticker, notes = '') => {
    // Get max position
    const { data: existing } = await supabase
        .from('curated_stocks')
        .select('position')
        .order('position', { ascending: false })
        .limit(1);

    const nextPosition = existing && existing.length > 0 ? existing[0].position + 1 : 0;

    const { data, error } = await supabase
        .from('curated_stocks')
        .insert([{
            ticker: ticker.toUpperCase(),
            notes,
            position: nextPosition
        }])
        .select()
        .single();

    if (error) {
        console.error('Error adding stock:', error);
        throw error;
    }
    return data;
};

export const updateStockNotes = async (id, notes) => {
    const { data, error } = await supabase
        .from('curated_stocks')
        .update({ notes, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('Error updating notes:', error);
        throw error;
    }
    return data;
};

export const removeStock = async (id) => {
    const { error } = await supabase
        .from('curated_stocks')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error removing stock:', error);
        throw error;
    }
    return true;
};

export const reorderStocks = async (stocks) => {
    // Update positions for all stocks
    const updates = stocks.map((stock, index) => ({
        id: stock.id,
        ticker: stock.ticker,
        notes: stock.notes,
        position: index
    }));

    const { error } = await supabase
        .from('curated_stocks')
        .upsert(updates);

    if (error) {
        console.error('Error reordering stocks:', error);
        throw error;
    }
    return true;
};

// --- Real-time subscription ---

export const subscribeToStocks = (callback) => {
    const subscription = supabase
        .channel('curated_stocks_changes')
        .on('postgres_changes',
            { event: '*', schema: 'public', table: 'curated_stocks' },
            (payload) => {
                callback(payload);
            }
        )
        .subscribe();

    return () => {
        subscription.unsubscribe();
    };
};

// --- Thesis Entries (Multiple dated entries per stock) ---

export const getThesisEntries = async (stockId) => {
    const { data, error } = await supabase
        .from('thesis_entries')
        .select('*')
        .eq('stock_id', stockId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching thesis entries:', error);
        return [];
    }
    return data || [];
};

export const getAllThesisEntries = async () => {
    const { data, error } = await supabase
        .from('thesis_entries')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching all thesis entries:', error);
        return [];
    }
    return data || [];
};

export const addThesisEntry = async (stockId, content) => {
    const { data, error } = await supabase
        .from('thesis_entries')
        .insert([{
            stock_id: stockId,
            content
        }])
        .select()
        .single();

    if (error) {
        console.error('Error adding thesis entry:', error);
        throw error;
    }
    return data;
};

export const deleteThesisEntry = async (entryId) => {
    const { error } = await supabase
        .from('thesis_entries')
        .delete()
        .eq('id', entryId);

    if (error) {
        console.error('Error deleting thesis entry:', error);
        throw error;
    }
    return true;
};

export const subscribeToThesisEntries = (callback) => {
    const subscription = supabase
        .channel('thesis_entries_changes')
        .on('postgres_changes',
            { event: '*', schema: 'public', table: 'thesis_entries' },
            (payload) => {
                callback(payload);
            }
        )
        .subscribe();

    return () => {
        subscription.unsubscribe();
    };
};
