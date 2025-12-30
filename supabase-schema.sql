-- Supabase Database Schema for Kams Stock Guide
-- Run this SQL in your Supabase Dashboard: SQL Editor → New Query

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Curated Stocks Table
CREATE TABLE IF NOT EXISTS curated_stocks (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    ticker VARCHAR(10) NOT NULL UNIQUE,
    notes TEXT DEFAULT '',
    position INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster ordering
CREATE INDEX IF NOT EXISTS idx_curated_stocks_position ON curated_stocks(position);
CREATE INDEX IF NOT EXISTS idx_curated_stocks_ticker ON curated_stocks(ticker);

-- Enable Row Level Security (RLS)
ALTER TABLE curated_stocks ENABLE ROW LEVEL SECURITY;

-- Policy: Allow anyone to read curated stocks
CREATE POLICY "Allow public read access" ON curated_stocks
    FOR SELECT USING (true);

-- Policy: Allow anyone to insert/update/delete (for now - can restrict later with auth)
CREATE POLICY "Allow public write access" ON curated_stocks
    FOR ALL USING (true);

-- Enable real-time updates
ALTER PUBLICATION supabase_realtime ADD TABLE curated_stocks;

-- Insert default stocks
INSERT INTO curated_stocks (ticker, notes, position) VALUES
    ('NVDA', 'AI leader. Data center growth. High valuation but strong moat.', 0),
    ('AAPL', 'Cash machine. Services growth. Strong ecosystem lock-in.', 1),
    ('MSFT', 'Cloud and AI play. Enterprise dominance. Copilot monetization.', 2),
    ('GOOGL', 'Search monopoly. YouTube. AI catch-up mode.', 3),
    ('META', 'Social media dominance. Reels growth. AI investments.', 4),
    ('AMZN', 'E-commerce + AWS. Logistics moat. Retail margins improving.', 5)
ON CONFLICT (ticker) DO NOTHING;
