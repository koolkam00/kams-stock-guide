import React, { useMemo, useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, ArrowUpRight, ArrowDownRight, Layers, BarChart3, TrendingUp, Activity, DollarSign, PieChart, Coins, Newspaper } from 'lucide-react';
import { getDebtMaturity } from '../data/mockStocks';
import { fetchStockQuote, fetchCompanyOverview, fetchDailyHistory, fetchNewsSentiment } from '../services/api';
import StockChart from '../components/charts/StockChart';
import DebtMaturityChart from '../components/charts/DebtMaturityChart';
import ErrorMessage from '../components/common/ErrorMessage';
import Navbar from '../components/layout/Navbar';
import clsx from 'clsx';

const StockDetail = () => {
    const { ticker } = useParams();

    // Data State
    const [stock, setStock] = useState(null);
    const [history, setHistory] = useState({ daily: [], quarterly: [] });
    const [news, setNews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Chart Configuration State
    const [metric, setMetric] = useState('price');
    const [category, setCategory] = useState('Price');

    // Generate mock data for demonstration when API is rate-limited
    const generateMockHistory = (ticker) => {
        const data = [];
        const basePrice = { 'NVDA': 135, 'AAPL': 215, 'MSFT': 430, 'GOOGL': 175, 'META': 590, 'AMZN': 185 }[ticker] || 150;
        const today = new Date();

        // Generate 90 days of daily price data
        for (let i = 90; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const variance = (Math.random() - 0.5) * 10;
            const trend = (90 - i) * 0.1; // Slight upward trend
            data.push({
                date: date.toISOString().split('T')[0],
                price: basePrice + variance + trend,
                volume: Math.floor(Math.random() * 50000000) + 10000000
            });
        }
        return data;
    };

    const generateMockFinancials = (ticker) => {
        // Generate 8 quarters of financial data
        const baseRevenue = { 'NVDA': 30e9, 'AAPL': 95e9, 'MSFT': 65e9, 'GOOGL': 85e9, 'META': 35e9, 'AMZN': 150e9 }[ticker] || 20e9;
        const data = [];
        const now = new Date();

        for (let i = 7; i >= 0; i--) {
            const quarterDate = new Date(now);
            quarterDate.setMonth(quarterDate.getMonth() - (i * 3));
            const quarterEnd = new Date(quarterDate.getFullYear(), Math.floor(quarterDate.getMonth() / 3) * 3 + 2, 1);
            quarterEnd.setMonth(quarterEnd.getMonth() + 1);
            quarterEnd.setDate(0); // Last day of quarter

            const growth = 1 + (7 - i) * 0.03; // 3% quarterly growth
            const revenue = baseRevenue * growth * (0.95 + Math.random() * 0.1);
            const grossMargin = 0.55 + Math.random() * 0.15;
            const ebitdaMargin = 0.25 + Math.random() * 0.15;

            data.push({
                date: quarterEnd.toISOString().split('T')[0],
                revenue: revenue,
                grossProfit: revenue * grossMargin,
                grossMargin: grossMargin,
                ebitda: revenue * ebitdaMargin,
                ebitdaMargin: ebitdaMargin,
                earnings: revenue * (ebitdaMargin - 0.08),
                fcf: revenue * (0.1 + Math.random() * 0.1),
                pe: 20 + Math.random() * 30
            });
        }
        return data;
    };

    // Fetch Data on Load
    useEffect(() => {
        let isMounted = true;
        const loadData = async () => {
            setLoading(true);
            setError(null);
            try {
                // Fetch all data in parallel
                const [quote, overview, daily, newsData] = await Promise.all([
                    fetchStockQuote(ticker),
                    fetchCompanyOverview(ticker),
                    fetchDailyHistory(ticker),
                    fetchNewsSentiment(ticker)
                ]);

                if (isMounted) {
                    // Use mock data if API returns empty (rate limited)
                    const mockHistory = generateMockHistory(ticker);
                    const mockFinancials = generateMockFinancials(ticker);

                    // Merge mock financials into history for chart compatibility
                    const combinedHistory = (daily && daily.length > 0) ? daily : mockHistory;

                    // Add financial metrics to history if not present
                    if (combinedHistory.length > 0 && !combinedHistory[0].revenue) {
                        // We have price data but no financials - keep separate
                    }

                    setStock({
                        ticker,
                        name: overview?.name || quote?.name || ticker,
                        price: quote?.price || mockHistory[mockHistory.length - 1]?.price || 150,
                        change: quote?.change || 2.5,
                        changePercent: quote?.changePercent || 1.5,
                        marketCap: overview?.marketCap || quote?.marketCap || '$500B',
                        ...(quote || {}),
                        ...(overview || {})
                    });

                    // Store both daily and quarterly data
                    setHistory({
                        daily: (daily && daily.length > 0) ? daily : mockHistory,
                        quarterly: mockFinancials
                    });
                    setNews(newsData || []);
                }
            } catch (err) {
                console.error("API Error", err);
                if (isMounted) {
                    // Use mock data on error
                    const mockHistory = generateMockHistory(ticker);
                    const mockFinancials = generateMockFinancials(ticker);

                    setStock({
                        ticker,
                        name: ticker,
                        price: mockHistory[mockHistory.length - 1]?.price || 150,
                        change: 2.5,
                        changePercent: 1.5,
                        marketCap: '$500B'
                    });
                    setHistory({
                        daily: mockHistory,
                        quarterly: mockFinancials
                    });
                    setNews([]);
                }
            } finally {
                if (isMounted) setLoading(false);
            }
        };
        loadData();
        return () => { isMounted = false; };
    }, [ticker]);

    const debtSchedule = useMemo(() => getDebtMaturity(ticker), [ticker]); // This is still mock for UI demo as unrelated to Alpha Vantage

    if (loading) {
        return (
            <div className="min-h-screen bg-finance-bg pb-12">
                <Navbar />
                <div className="max-w-6xl mx-auto px-4 pt-12 text-center">
                    <div className="animate-pulse flex flex-col items-center">
                        <div className="h-8 w-48 bg-gray-800 rounded mb-4"></div>
                        <div className="h-64 w-full bg-gray-800 rounded mb-8"></div>
                    </div>
                    <p className="text-finance-muted">Loading live market data...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-finance-bg pb-12">
                <Navbar />
                <div className="max-w-6xl mx-auto px-4 pt-12">
                    <ErrorMessage message={error} retryAction={() => window.location.reload()} />
                </div>
            </div>
        );
    }

    if (!stock) return <div className="text-white p-8">Stock not found</div>;

    // Defensive Data Access
    const price = stock.price || 0;
    const change = stock.change || 0;
    const changePercent = stock.changePercent || 0;
    const isPositive = change >= 0;
    const primaryColor = isPositive ? '#00C805' : '#FF333A';

    // EV Calculation Helpers
    const latestData = history && history.length > 0 ? history[history.length - 1] : {};
    // Note: totalDebt/cash might be missing if we used Strict API without mock fillers.
    // In strict mode, we might not get these specific fields from Daily Series unless we fetch balance sheet.
    // For now, handle missing gracefully.
    const totalDebt = latestData.totalDebt || 0;
    const cash = latestData.cash || 0;

    const parseMarketCap = (str) => {
        if (!str) return 0;
        const s = String(str).toUpperCase();
        const numPart = parseFloat(s.replace(/[^0-9.]/g, ''));
        if (isNaN(numPart)) return 0;
        let multiplier = 1;
        if (s.includes('T')) multiplier = 1e12;
        else if (s.includes('B')) multiplier = 1e9;
        else if (s.includes('M')) multiplier = 1e6;
        return numPart * multiplier;
    };

    const marketCapFull = parseMarketCap(stock.marketCap);
    const enterpriseValue = marketCapFull + totalDebt - cash;
    const evInBillions = enterpriseValue / 1e9;

    // Chart Series Logic - handles both daily price and quarterly financial data
    const getChartSeries = () => {
        const colorMap = {
            price: primaryColor,
            pe: '#2F80ED',
            revenue: '#4caf50',
            grossProfit: '#8bc34a',
            grossMargin: '#9c27b0',
            ebitda: '#cddc39',
            ebitdaMargin: '#ff9800',
            earnings: '#00bcd4',
            fcf: '#03a9f4'
        };

        // Determine chart type based on metric
        const getChartType = (m) => {
            // Bars for absolute values, areas for price/margins
            if (['revenue', 'grossProfit', 'ebitda', 'earnings', 'fcf'].includes(m)) return 'bar';
            return 'area';
        };

        // Display names
        const nameMap = {
            price: 'Stock Price',
            pe: 'P/E Ratio',
            revenue: 'Revenue',
            grossProfit: 'Gross Profit',
            grossMargin: 'Gross Margin',
            ebitda: 'EBITDA',
            ebitdaMargin: 'EBITDA Margin',
            earnings: 'Net Earnings',
            fcf: 'Free Cash Flow'
        };

        return [{
            key: metric,
            color: colorMap[metric] || primaryColor,
            type: getChartType(metric),
            name: nameMap[metric] || metric.toUpperCase()
        }];
    };

    // Determine Y-Axis Type for proper formatting
    const getYAxisType = () => {
        if (['grossMargin', 'ebitdaMargin'].includes(metric)) return 'percent';
        if (['pe'].includes(metric)) return 'ratio';
        if (['revenue', 'grossProfit', 'ebitda', 'earnings', 'fcf'].includes(metric)) return 'financial';
        return 'price';
    };

    // Determine if we should use quarterly data
    const getDataType = () => {
        if (metric === 'price') return 'daily';
        return 'quarterly';
    };

    // Metric Categories - organized by type
    const metricCategories = {
        'Price': [
            { id: 'price', label: 'Price', icon: DollarSign }
        ],
        'Valuation': [
            { id: 'pe', label: 'P/E Ratio', icon: TrendingUp }
        ],
        'Revenue': [
            { id: 'revenue', label: 'Revenue', icon: BarChart3 },
            { id: 'grossProfit', label: 'Gross Profit', icon: Coins },
            { id: 'grossMargin', label: 'Gross Margin', icon: PieChart }
        ],
        'Profitability': [
            { id: 'ebitda', label: 'EBITDA', icon: Activity },
            { id: 'ebitdaMargin', label: 'EBITDA Margin', icon: TrendingUp },
            { id: 'earnings', label: 'Earnings', icon: DollarSign }
        ],
        'Cash Flow': [
            { id: 'fcf', label: 'Free Cash Flow', icon: Layers }
        ]
    };

    return (
        <div className="min-h-screen bg-finance-bg pb-12">
            <Navbar />
            <main className="max-w-6xl mx-auto px-4 pt-6">
                {/* Navigation */}
                <Link to="/" className="inline-flex items-center text-finance-muted hover:text-white mb-6 transition-colors">
                    <ArrowLeft className="h-4 w-4 mr-1" /> Back to Dashboard
                </Link>

                {/* Header Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                    {/* Main Ticker Info */}
                    <div className="lg:col-span-2">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h1 className="text-4xl font-bold text-white mb-1">{stock.ticker}</h1>
                                <p className="text-xl text-finance-muted">{stock.name || 'Unknown Company'}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-3xl font-mono font-bold text-white">${price.toFixed(2)}</p>
                                <p className={clsx("text-lg font-medium flex items-center justify-end", isPositive ? "text-finance-green" : "text-finance-red")}>
                                    {isPositive ? <ArrowUpRight className="h-5 w-5 mr-1" /> : <ArrowDownRight className="h-5 w-5 mr-1" />}
                                    {changePercent.toFixed(2)}%
                                </p>
                            </div>
                        </div>

                        {/* Metric Category Tabs */}
                        <div className="flex gap-4 mb-4 border-b border-gray-800 pb-2 overflow-x-auto">
                            {Object.keys(metricCategories).map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => { setCategory(cat); setMetric(metricCategories[cat][0].id); }}
                                    className={clsx(
                                        "text-sm font-bold pb-2 transition-colors whitespace-nowrap",
                                        category === cat ? "text-finance-blue border-b-2 border-finance-blue" : "text-finance-muted hover:text-white"
                                    )}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>

                        {/* Sub-Metric Toggles */}
                        <div className="flex flex-wrap gap-2 mb-4">
                            {metricCategories[category].map((opt) => (
                                <button
                                    key={opt.id}
                                    onClick={() => setMetric(opt.id)}
                                    className={clsx(
                                        "px-3 py-1 rounded text-xs font-bold border transition-colors flex items-center gap-1",
                                        metric === opt.id
                                            ? "bg-finance-card text-white border-finance-blue ring-1 ring-finance-blue"
                                            : "bg-transparent text-finance-muted border-gray-700 hover:border-gray-500 hover:text-white"
                                    )}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>

                        {/* Chart */}
                        <div className="mb-8">
                            <StockChart
                                data={metric === 'price' ? (history?.daily || []) : (history?.quarterly || [])}
                                series={getChartSeries()}
                                yAxisType={getYAxisType()}
                                dataType={getDataType()}
                            />
                        </div>
                    </div>

                    {/* Side Panel: Market Info, News & Social */}
                    <div className="space-y-6">
                        {/* Market Cap */}
                        <div className="bg-finance-card p-6 rounded-xl border border-gray-800">
                            <h3 className="text-sm font-bold text-finance-muted mb-4 uppercase flex items-center gap-2">
                                <PieChart className="h-4 w-4" /> Market Cap
                            </h3>
                            <div className="space-y-3">
                                <div className="flex justify-between text-base font-bold">
                                    <span className="text-white">Market Cap</span>
                                    <span className="text-finance-blue font-mono">{stock.marketCap}</span>
                                </div>
                            </div>
                        </div>

                        {/* News Feed */}
                        <div className="bg-finance-card p-6 rounded-xl border border-gray-800">
                            <h3 className="text-sm font-bold text-finance-muted mb-4 uppercase flex items-center gap-2">
                                <Newspaper className="h-4 w-4" /> Latest News
                            </h3>
                            <div className="space-y-4 max-h-80 overflow-y-auto">
                                {news.length > 0 ? (
                                    news.slice(0, 6).map((item, idx) => (
                                        <a
                                            key={idx}
                                            href={item.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="block group border-b border-gray-800 pb-3 last:border-0"
                                        >
                                            <div className="flex gap-3">
                                                {item.image && (
                                                    <img
                                                        src={item.image}
                                                        alt=""
                                                        className="w-16 h-16 object-cover rounded flex-shrink-0"
                                                        onError={(e) => e.target.style.display = 'none'}
                                                    />
                                                )}
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="text-sm text-white font-medium group-hover:text-finance-accent transition-colors line-clamp-2 mb-1">
                                                        {item.title}
                                                    </h4>
                                                    <p className="text-[10px] text-gray-500">
                                                        {item.site} • {new Date(item.publishedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                    </p>
                                                </div>
                                            </div>
                                        </a>
                                    ))
                                ) : (
                                    <p className="text-sm text-finance-muted">No recent news found.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* About Section */}
                <div className="bg-finance-card p-6 rounded-xl border border-gray-800">
                    <h3 className="text-lg font-bold text-white mb-4">About {stock.name || stock.ticker}</h3>
                    <p className="text-gray-400 leading-relaxed">
                        {stock.description || `${stock.name || stock.ticker} is a leading company in the ${stock.sector || 'Market'} sector.`}
                    </p>
                </div>

            </main>
        </div>
    );
};

export default StockDetail;
