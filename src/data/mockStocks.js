
// Existing stock data...
export const portfolioStocks = [
    {
        ticker: 'NVDA',
        name: 'Nvidia Corp',
        price: 135.58,
        change: 2.15,
        changePercent: 1.61,
        shares: 50,
        avgCost: 95.00,
        marketCap: '3.34T',
        sector: 'Technology'
    },
    {
        ticker: 'AAPL',
        name: 'Apple Inc',
        price: 215.00,
        change: -1.25,
        changePercent: -0.58,
        shares: 25,
        avgCost: 180.50,
        marketCap: '3.29T',
        sector: 'Technology'
    },
    {
        ticker: 'JPM',
        name: 'JPMorgan Chase',
        price: 198.50,
        change: 1.10,
        changePercent: 0.56,
        shares: 15,
        avgCost: 150.00,
        marketCap: '570B',
        sector: 'Financial'
    }
];

export const watchlistStocks = [
    {
        ticker: 'TSLA',
        name: 'Tesla Inc',
        price: 250.00,
        change: 5.50,
        changePercent: 2.25,
        peRatio: 65.4,
        dividend: 'N/A',
        marketCap: '780B'
    },
    {
        ticker: 'MSFT',
        name: 'Microsoft Corp',
        price: 430.00,
        change: 0.50,
        changePercent: 0.12,
        peRatio: 36.5,
        dividend: '0.7%',
        marketCap: '3.15T'
    },
    {
        ticker: 'GOOGL',
        name: 'Alphabet Inc',
        price: 175.25,
        change: -0.80,
        changePercent: -0.45,
        peRatio: 26.8,
        dividend: '0.5%',
        marketCap: '2.18T'
    },
    {
        ticker: 'AMZN',
        name: 'Amazon.com Inc',
        price: 185.00,
        change: 1.25,
        changePercent: 0.68,
        peRatio: 45.2,
        dividend: 'N/A',
        marketCap: '1.95T'
    }
];

export const getAllStocks = () => [...portfolioStocks, ...watchlistStocks];

// Ensure ETFs are recognized (Updated for Market Overview)
export const getStockByTicker = (ticker) => {
    const stock = getAllStocks().find(s => s.ticker === ticker);
    if (stock) return stock;

    // ETF Fallbacks for Market Overview
    if (ticker === 'SPY') return { name: 'SPDR S&P 500', price: 545.00, sector: 'ETF' };
    if (ticker === 'QQQ') return { name: 'Invesco QQQ', price: 480.00, sector: 'ETF' };
    if (ticker === 'DIA') return { name: 'SPDR Dow Jones', price: 405.00, sector: 'ETF' };

    return null;
};

// Static mock debt maturity data
export const getDebtMaturity = (ticker) => [
    { year: '2025', amount: 2.5 },
    { year: '2026', amount: 3.1 },
    { year: '2027', amount: 1.8 },
    { year: '2028', amount: 4.2 },
    { year: '2029+', amount: 12.5 },
];

// Helper to generate random historical data
export const generateHistory = (basePrice, days = 100) => {
    const data = [];
    let currentPrice = basePrice * 0.9; // Start slightly lower to simulate trend
    const baseRevenue = basePrice * 1000000;

    for (let i = 0; i < days; i++) {
        const date = new Date();
        date.setDate(date.getDate() - (days - i));

        // Random walk
        const change = (Math.random() - 0.48) * 5;
        currentPrice += change;

        // Technicals
        const ma50 = currentPrice * (1 + (Math.sin(i / 5) * 0.05));
        const isVolumeSpike = Math.random() > 0.9;
        const volume = Math.floor(Math.random() * 1000000) + (isVolumeSpike ? 2000000 : 500000);
        const rsi = 50 + (Math.sin(i / 3) * 20) + (Math.random() * 10);
        const pe = currentPrice / (basePrice / 25);

        // Financials (Mocking growth over time)
        const growthFactor = 1 + (i * 0.001); // Slow growth
        const revenue = baseRevenue * growthFactor * (1 + (Math.random() * 0.05));
        const grossMargin = 0.45 + (Math.random() * 0.02);
        const ebitdaMargin = 0.30 + (Math.random() * 0.02);
        const netMargin = 0.20 + (Math.random() * 0.02);

        // Calculated Metrics
        const earnings = revenue * netMargin;
        const ebitda = revenue * ebitdaMargin;
        const ocf = ebitda * 0.9; // Operating Cash Flow
        const capex = revenue * 0.05; // CapEx
        const fcf = ocf - capex; // Free Cash Flow

        // Balance Sheet Proxies
        const totalDebt = revenue * 0.8; // Assume debt is ~80% of revenue
        const cash = revenue * 0.3; // Assume cash is ~30% of revenue
        const netDebt = totalDebt - cash;

        data.push({
            date: date.toISOString().split('T')[0],
            price: Number(currentPrice.toFixed(2)),
            ma50: Number(ma50.toFixed(2)),
            volume: volume,
            rsi: Number(rsi.toFixed(2)),
            pe: Number(pe.toFixed(2)),
            // Financials
            revenue: revenue,
            earnings: earnings,
            ebitda: ebitda,
            grossMargin: grossMargin * 100, // as percentage
            netMargin: netMargin * 100, // as percentage
            ocf: ocf,
            fcf: fcf,
            capex: capex,
            totalDebt: totalDebt,
            cash: cash,
            netDebt: netDebt
        });
    }
    // Ensure last point matches current price mostly if it differs wildly, but random walk is fine for mock
    data[data.length - 1].price = basePrice;

    // API usually returns newest separate or we reverse it in API layer. 
    // Wait, API layer reverses it if it gets API data. 
    // Mock data generator returns Oldest -> Newest (ascending date).
    // API layer `fetchDailyHistory` mock fallback logic: `return stock ? generateHistory(stock.price) : ...`
    // And standard API logic: `...map(...).reverse()`.
    // The standard API returns newest first? "Time Series (Daily)" usually has dates as keys.
    // If we look at my `fetchDailyHistory` in `api.js`:
    // It maps `Object.keys(series)` which might be unordered or sorted depending on browser, but assuming API gives YYYY-MM-DD keys.
    // The `generateHistory` function returns an ARRAY of objects.
    // Let's ensure consistency. `Dashboard` or `StockChart` expects array.
    // Recharts expects array.

    return data; // Return Oldest->Newest as Recharts expects X-axis left-to-right
};
