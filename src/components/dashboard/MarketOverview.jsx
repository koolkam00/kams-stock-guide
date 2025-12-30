import React, { useEffect, useState } from 'react';
import { fetchBatchQuotes, fetchBatchPriceChanges, fetchTreasuryRates } from '../../services/api';
import { Activity, TrendingUp, DollarSign, Percent } from 'lucide-react';

// Index configuration: actual index symbols for price, ETFs for PE ratios
const INDICES = [
    {
        name: 'S&P 500',
        indexSymbol: '^GSPC',
        etfSymbol: 'SPY'
    },
    {
        name: 'Nasdaq 100',
        indexSymbol: '^NDX',
        etfSymbol: 'QQQ'
    },
    {
        name: 'Dow Jones',
        indexSymbol: '^DJI',
        etfSymbol: 'DIA'
    }
];

const PERIODS = [
    { label: '1D', key: '1D' },
    { label: '1W', key: '1W' },
    { label: '1M', key: '1M' },
    { label: 'YTD', key: 'YTD' }
];

const MarketTableRow = ({ indexData }) => {
    const { name, indexPrice, etfPrice, metrics, peData, loading, error } = indexData;

    if (loading) return (
        <div className="grid grid-cols-8 gap-2 py-4 border-b border-gray-800 animate-pulse">
            <div className="col-span-2 h-4 bg-gray-800 rounded"></div>
            <div className="h-4 bg-gray-800 rounded"></div>
            <div className="h-4 bg-gray-800 rounded"></div>
            <div className="h-4 bg-gray-800 rounded"></div>
            <div className="h-4 bg-gray-800 rounded"></div>
            <div className="h-4 bg-gray-800 rounded"></div>
            <div className="h-4 bg-gray-800 rounded"></div>
        </div>
    );

    if (error) return (
        <div className="py-4 border-b border-gray-800 text-red-500 text-sm">
            {name} - Data Unavailable
        </div>
    );

    const displayPrice = indexPrice || etfPrice;

    return (
        <div className="grid grid-cols-8 gap-2 py-3 border-b border-gray-800 items-center text-sm hover:bg-gray-800/20 transition-colors">
            <div className="col-span-2 font-medium text-white">{name}</div>
            <div className="text-right text-white font-mono">
                {displayPrice ? displayPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}
            </div>

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

const MacroStat = ({ title, value, icon: Icon, isCurrency }) => (
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
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // OPTIMIZED: Collect all symbols and fetch in batch
                const allIndexSymbols = INDICES.map(idx => idx.indexSymbol);
                const allETFSymbols = INDICES.map(idx => idx.etfSymbol);
                const macroSymbols = ['GLD', 'USO'];

                // Combine all symbols for batch fetch (6 + 2 = 8 symbols in 1 call)
                const allSymbols = [...allIndexSymbols, ...allETFSymbols, ...macroSymbols];

                console.log(`[API OPTIMIZATION] Fetching ${allSymbols.length} symbols in 1 batch call`);

                // OPTIMIZED: 1 batch call for all quotes + 1 call for treasury + N calls for price changes
                const [batchQuotes, priceChanges, treasuryRates] = await Promise.all([
                    fetchBatchQuotes(allSymbols),
                    fetchBatchPriceChanges(allETFSymbols), // Only ETFs have price change data
                    fetchTreasuryRates()
                ]);

                console.log('Batch Quotes:', batchQuotes);
                console.log('Price Changes:', priceChanges);
                console.log('Treasury Rates:', treasuryRates);

                // Build index data from batch results
                const indexResults = {};
                INDICES.forEach(idx => {
                    const indexQuote = batchQuotes[idx.indexSymbol];
                    const etfQuote = batchQuotes[idx.etfSymbol];
                    const changes = priceChanges[idx.etfSymbol];

                    indexResults[idx.etfSymbol] = {
                        name: idx.name,
                        indexPrice: indexQuote?.price,
                        etfPrice: etfQuote?.price,
                        metrics: changes || {},
                        peData: {
                            trailing: etfQuote?.pe,
                            forward: null // Would need profile call for forward PE
                        },
                        loading: false
                    };
                });

                setIndexData(indexResults);

                // Macro data from batch results
                const goldQuote = batchQuotes['GLD'];
                const oilQuote = batchQuotes['USO'];

                setMacroData({
                    fed: { value: treasuryRates?.month3 || treasuryRates?.month1 || treasuryRates?.year2 },
                    bond: { value: treasuryRates?.year10 },
                    gold: { value: goldQuote?.price },
                    oil: { value: oilQuote?.price }
                });

            } catch (e) {
                console.error("Market Overview fetch failed", e);
                // Set error state for all indices
                const errorResults = {};
                INDICES.forEach(idx => {
                    errorResults[idx.etfSymbol] = { name: idx.name, error: true, loading: false };
                });
                setIndexData(errorResults);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const orderedData = INDICES.map(idx => indexData[idx.etfSymbol] || { loading: true, name: idx.name });

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
                            <div className="text-right">Level</div>
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
