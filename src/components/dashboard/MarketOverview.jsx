import React, { useEffect, useState } from 'react';
import { fetchPriceChange, fetchCompanyOverview, fetchTreasuryRates, fetchStockQuote } from '../../services/api';
import { Activity, TrendingUp, DollarSign, Percent } from 'lucide-react';

// Use ETF proxies for indices (they have better data coverage in FMP)
const INDICES = [
    { name: 'S&P 500', ticker: 'SPY' },
    { name: 'Nasdaq 100', ticker: 'QQQ' },
    { name: 'Dow Jones', ticker: 'DIA' }
];

const PERIODS = [
    { label: '1D', key: '1D' },
    { label: '1W', key: '1W' },
    { label: '1M', key: '1M' },
    { label: 'YTD', key: 'YTD' }
];

const MarketTableRow = ({ indexData }) => {
    const { name, currentPrice, metrics, peData, loading, error } = indexData;

    if (loading) return (
        <div className="grid grid-cols-7 gap-4 py-4 border-b border-gray-800 animate-pulse">
            <div className="col-span-1 h-4 bg-gray-800 rounded"></div>
            <div className="col-span-6 h-4 bg-gray-800 rounded"></div>
        </div>
    );

    if (error) return (
        <div className="py-4 border-b border-gray-800 text-red-500 text-sm">
            {name} - Data Unavailable
        </div>
    );

    return (
        <div className="grid grid-cols-8 gap-2 py-3 border-b border-gray-800 items-center text-sm hover:bg-gray-800/20 transition-colors">
            <div className="col-span-2 font-medium text-white">{name}</div>
            <div className="text-right text-white font-mono">{currentPrice?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>

            {PERIODS.map((period) => {
                const val = metrics?.[period.key];
                const isPositive = val >= 0;
                return (
                    <div key={period.label} className={`text-right font-mono ${val === null || val === undefined ? 'text-gray-500' : isPositive ? 'text-finance-green' : 'text-red-500'}`}>
                        {val !== null && val !== undefined ? `${val > 0 ? '+' : ''}${val.toFixed(2)}%` : '-'}
                    </div>
                );
            })}

            <div className="text-right text-gray-400 font-mono">
                {peData?.trailing && peData?.trailing !== 'None' && peData?.trailing !== null ? parseFloat(peData.trailing).toFixed(1) : '-'}
                <span className="text-gray-600 mx-1">/</span>
                <span className="text-finance-accent">{peData?.forward && peData?.forward !== 'None' && peData?.forward !== null ? parseFloat(peData.forward).toFixed(1) : '-'}</span>
            </div>
        </div>
    );
};

const MacroStat = ({ title, value, date, icon: Icon, isCurrency }) => (
    <div className="flex items-center gap-3 p-3 bg-gray-800/30 rounded-lg border border-gray-800/50">
        <div className="bg-gray-800 p-2 rounded-md text-finance-accent">
            <Icon className="w-4 h-4" />
        </div>
        <div>
            <div className="text-xs text-gray-500">{title}</div>
            <div className="text-sm font-bold text-white tracking-wide">
                {value}{!isCurrency && value !== '-' ? '%' : ''}
            </div>
        </div>
    </div>
);

const MarketOverview = () => {
    const [indexData, setIndexData] = useState({});
    const [macroData, setMacroData] = useState({ fed: null, bond: null, gold: null, oil: null });

    useEffect(() => {
        const fetchData = async () => {
            // Indices - Use ETF proxies for better data
            const indexResults = {};
            await Promise.all(INDICES.map(async (idx) => {
                try {
                    setIndexData(prev => ({ ...prev, [idx.ticker]: { loading: true, name: idx.name } }));

                    // Fetch quote, price changes, and overview in parallel
                    const [quote, priceChange, overview] = await Promise.all([
                        fetchStockQuote(idx.ticker),
                        fetchPriceChange(idx.ticker),
                        fetchCompanyOverview(idx.ticker)
                    ]);

                    const currentPrice = quote?.price;

                    // Use pre-calculated price changes from FMP
                    const metrics = priceChange || {};

                    indexResults[idx.ticker] = {
                        name: idx.name,
                        currentPrice,
                        metrics,
                        peData: {
                            current: quote?.pe || overview?.peRatio,
                            trailing: quote?.pe || overview?.trailingPE,
                            forward: overview?.forwardPE
                        },
                        loading: false
                    };
                } catch (err) {
                    console.error(`Error fetching ${idx.ticker}:`, err);
                    indexResults[idx.ticker] = { name: idx.name, error: true, loading: false };
                }
            }));
            setIndexData(prev => ({ ...prev, ...indexResults }));

            // Macro Data & Commodities
            try {
                const [treasuryRates, goldQuote, oilQuote] = await Promise.all([
                    fetchTreasuryRates(),
                    fetchStockQuote('GLD'), // SPDR Gold Shares ETF
                    fetchStockQuote('USO')  // United States Oil Fund ETF
                ]);

                console.log('Treasury Rates:', treasuryRates);
                console.log('Gold Quote:', goldQuote);
                console.log('Oil Quote:', oilQuote);

                setMacroData({
                    fed: { value: treasuryRates?.month3 || treasuryRates?.month1 || treasuryRates?.year2 },
                    bond: { value: treasuryRates?.year10 },
                    gold: { value: goldQuote?.price },
                    oil: { value: oilQuote?.price }
                });
            } catch (e) {
                console.error("Macro fetch failed", e);
            }

        };

        fetchData();
    }, []);

    const orderedData = INDICES.map(idx => indexData[idx.ticker] || { loading: true, name: idx.name });

    return (
        <div className="mb-10 p-6 bg-finance-card border border-gray-800 rounded-xl relative overflow-hidden">
            {/* Background Decor */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-finance-accent/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

            <div className="relative z-10">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-white tracking-tight mb-1">Welcome to the Show.</h1>
                        <p className="text-finance-muted text-sm italic">We define risk as not knowing what the fuck you're doing.</p>
                    </div>

                    {/* Macro & Commodities Stats */}
                    <div className="flex flex-wrap gap-3">
                        <MacroStat
                            title="Fed Funds"
                            value={macroData.fed?.value ? parseFloat(macroData.fed.value).toFixed(2) : '-'}
                            icon={DollarSign}
                        />
                        <MacroStat
                            title="10Y Yield"
                            value={macroData.bond?.value ? parseFloat(macroData.bond.value).toFixed(2) : '-'}
                            icon={Percent}
                        />
                        <MacroStat
                            title="Gold (GLD)"
                            value={macroData.gold?.value ? `$${macroData.gold.value.toFixed(2)}` : '-'}
                            icon={Activity}
                            isCurrency
                        />
                        <MacroStat
                            title="Oil (USO)"
                            value={macroData.oil?.value ? `$${macroData.oil.value.toFixed(2)}` : '-'}
                            icon={TrendingUp}
                            isCurrency
                        />
                    </div>
                </div>

                {/* Consolidated Table */}
                <div className="overflow-x-auto">
                    <div className="min-w-[700px]">
                        {/* Header */}
                        <div className="grid grid-cols-8 gap-2 pb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-800">
                            <div className="col-span-2">Index</div>
                            <div className="text-right">Price</div>
                            <div className="text-right">1D</div>
                            <div className="text-right">1W</div>
                            <div className="text-right">1M</div>
                            <div className="text-right">YTD</div>
                            <div className="text-right" title="Trailing / Forward P/E">P/E (Tr/Fwd)</div>
                        </div>

                        {/* Rows */}
                        <div className="mt-1">
                            {orderedData.map((data, i) => (
                                <MarketTableRow key={i} indexData={data} />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MarketOverview;
