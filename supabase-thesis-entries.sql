-- New table for thesis entries (multiple dated entries per stock)
-- Run this SQL in your Supabase Dashboard: SQL Editor → New Query

CREATE TABLE IF NOT EXISTS thesis_entries (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    stock_id UUID REFERENCES curated_stocks(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_thesis_entries_stock_id ON thesis_entries(stock_id);
CREATE INDEX IF NOT EXISTS idx_thesis_entries_created_at ON thesis_entries(created_at DESC);

-- Enable Row Level Security
ALTER TABLE thesis_entries ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read thesis entries
CREATE POLICY "Allow public read thesis" ON thesis_entries
    FOR SELECT USING (true);

-- Allow anyone to insert/update/delete thesis entries
CREATE POLICY "Allow public write thesis" ON thesis_entries
    FOR ALL USING (true);

-- Enable real-time for thesis entries
ALTER PUBLICATION supabase_realtime ADD TABLE thesis_entries;

-- Migrate existing notes to thesis_entries
INSERT INTO thesis_entries (stock_id, content, created_at)
SELECT id, notes, created_at
FROM curated_stocks
WHERE notes IS NOT NULL AND notes != '';
