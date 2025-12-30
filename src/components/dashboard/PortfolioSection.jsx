import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, ArrowDownRight, Target, Plus, X, Edit2, Trash2, MessageSquare, ChevronDown, ChevronUp } from 'lucide-react';
import clsx from 'clsx';
import { fetchBatchQuotes } from '../../services/api';
import { getCuratedStocks, addCuratedStock, removeStock, subscribeToStocks, getThesisEntries, addThesisEntry, deleteThesisEntry, getAllThesisEntries } from '../../services/supabase';

const formatLargeNumber = (num) => {
    if (!num) return '-';
    if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
    if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
    return `$${num.toLocaleString()}`;
};

const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
};

// Simplified StockCard that receives pre-fetched data
const EnhancedStockCard = ({ stock, quoteData, thesisEntries = [], onRemove, onAddEntry, onDeleteEntry, isEditMode }) => {
    const [showAllEntries, setShowAllEntries] = useState(false);
    const [showAddForm, setShowAddForm] = useState(false);
    const [newEntry, setNewEntry] = useState('');

    const handleAddEntry = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!newEntry.trim()) return;
        await onAddEntry(stock.id, newEntry);
        setNewEntry('');
        setShowAddForm(false);
    };

    // Use pre-fetched quote data or show loading
    const data = quoteData || { loading: true };

    if (data.loading) {
        return (
            <div className="bg-finance-card p-4 rounded-lg border border-gray-800 animate-pulse">
                <div className="h-4 bg-gray-800 rounded w-1/3 mb-2"></div>
                <div className="h-6 bg-gray-800 rounded w-1/2 mb-4"></div>
                <div className="h-20 bg-gray-800 rounded"></div>
            </div>
        );
    }

    if (data.error) {
        return (
            <div className="bg-finance-card p-4 rounded-lg border border-red-800 relative">
                {isEditMode && (
                    <button
                        onClick={() => onRemove(stock.id)}
                        className="absolute top-2 right-2 text-red-500 hover:text-red-400"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                )}
                <p className="text-red-500">{stock.ticker} - Error loading</p>
            </div>
        );
    }

    const isPositive = (data.changePercent || 0) >= 0;
    const ChangeIcon = isPositive ? ArrowUpRight : ArrowDownRight;
    const colorClass = isPositive ? 'text-finance-green' : 'text-finance-red';

    // Show only latest entry on card, or show all if expanded
    const displayedEntries = showAllEntries ? thesisEntries : thesisEntries.slice(0, 1);

    const CardContent = () => (
        <div className="bg-finance-card p-4 rounded-lg border border-gray-800 hover:border-finance-accent/50 transition-all h-full relative">
            {/* Edit Mode Controls */}
            {isEditMode && (
                <div className="absolute top-2 right-2 flex gap-2 z-10">
                    <button
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowAddForm(!showAddForm); }}
                        className="text-finance-accent hover:text-white p-1 bg-gray-800 rounded"
                        title="Add entry"
                    >
                        <MessageSquare className="w-4 h-4" />
                    </button>
                    <button
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onRemove(stock.id); }}
                        className="text-red-500 hover:text-red-400 p-1 bg-gray-800 rounded"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Header: Ticker, Name, Price, Change */}
            <div className="flex justify-between items-start mb-2">
                <div>
                    <h3 className="font-bold text-xl text-white">{stock.ticker}</h3>
                    <p className="text-xs text-finance-muted truncate max-w-[140px]">{data.name || stock.ticker}</p>
                </div>
                <div className="text-right">
                    <p className="font-mono text-lg text-white font-bold">
                        ${data.price?.toFixed(2) || '-'}
                    </p>
                    <div className={clsx("flex items-center justify-end text-sm font-medium", colorClass)}>
                        <ChangeIcon className="h-4 w-4 mr-1" />
                        {isPositive ? '+' : ''}{data.changePercent?.toFixed(2) || '0.00'}%
                    </div>
                </div>
            </div>

            {/* Add Entry Form (Edit Mode) */}
            {isEditMode && showAddForm && (
                <div className="mb-3 p-3 bg-gray-800/50 rounded-lg" onClick={(e) => e.stopPropagation()}>
                    <form onSubmit={handleAddEntry} onClick={(e) => e.stopPropagation()}>
                        <textarea
                            value={newEntry}
                            onChange={(e) => setNewEntry(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            onKeyDown={(e) => e.stopPropagation()}
                            onFocus={(e) => e.stopPropagation()}
                            placeholder="Add new thesis entry..."
                            rows={3}
                            autoFocus
                            className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-finance-accent resize-none mb-2"
                        />
                        <div className="flex gap-2">
                            <button
                                type="submit"
                                className="flex-1 bg-finance-accent text-black text-xs font-medium py-1 rounded hover:bg-finance-accent/90"
                            >
                                Add Entry
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowAddForm(false)}
                                className="px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded hover:bg-gray-600"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* INVESTMENT THESIS LOG */}
            {thesisEntries.length > 0 && (
                <div className="mb-3">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-semibold text-finance-accent uppercase tracking-wider">
                            Investment Thesis ({thesisEntries.length} {thesisEntries.length === 1 ? 'entry' : 'entries'})
                        </span>
                        {thesisEntries.length > 1 && (
                            <button
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowAllEntries(!showAllEntries); }}
                                className="text-[10px] text-gray-400 hover:text-white flex items-center gap-1"
                            >
                                {showAllEntries ? 'Show less' : 'Show all'}
                                {showAllEntries ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </button>
                        )}
                    </div>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                        {displayedEntries.map((entry, idx) => (
                            <div
                                key={entry.id}
                                className={clsx(
                                    "p-2 rounded-lg border-l-2",
                                    idx === 0 ? "bg-finance-accent/10 border-finance-accent" : "bg-gray-800/30 border-gray-600"
                                )}
                            >
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-[9px] text-gray-500">{formatDate(entry.created_at)}</span>
                                    {isEditMode && (
                                        <button
                                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDeleteEntry(entry.id); }}
                                            className="text-red-500/50 hover:text-red-400"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    )}
                                </div>
                                <p className="text-xs text-gray-200 leading-relaxed">{entry.content}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Empty state for thesis */}
            {thesisEntries.length === 0 && isEditMode && (
                <div
                    className="mb-3 p-3 border border-dashed border-gray-700 rounded-lg text-center cursor-pointer hover:border-finance-accent/50"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowAddForm(true); }}
                >
                    <p className="text-xs text-gray-500">Click to add investment thesis</p>
                </div>
            )}

            {/* 52-Week Range Bar - OPTIMIZED: Uses yearHigh/yearLow from quote */}
            {data.yearLow && data.yearHigh && data.price && (
                <div className="mb-3">
                    <div className="flex justify-between text-[9px] text-gray-500 mb-1">
                        <span>52W Low: ${data.yearLow?.toFixed(2)}</span>
                        <span>52W High: ${data.yearHigh?.toFixed(2)}</span>
                    </div>
                    <div className="relative h-1.5 bg-gray-800 rounded-full">
                        <div
                            className="absolute h-full bg-gradient-to-r from-finance-red via-yellow-500 to-finance-green rounded-full"
                            style={{ width: '100%' }}
                        />
                        <div
                            className="absolute w-2 h-2 bg-white rounded-full -top-0.5 shadow-lg"
                            style={{
                                left: `${Math.min(100, Math.max(0, ((data.price - data.yearLow) / (data.yearHigh - data.yearLow)) * 100))}%`,
                                transform: 'translateX(-50%)'
                            }}
                        />
                    </div>
                </div>
            )}

            {/* Key Metrics - OPTIMIZED: Uses PE and marketCap from quote, detailed metrics on detail page */}
            <div className="grid grid-cols-3 gap-2 pt-3 border-t border-gray-800">
                <div className="text-center">
                    <p className="text-[9px] text-gray-500 uppercase">Mkt Cap</p>
                    <p className="text-xs font-medium text-gray-300">{formatLargeNumber(data.marketCap)}</p>
                </div>
                <div className="text-center">
                    <p className="text-[9px] text-gray-500 uppercase">P/E</p>
                    <p className="text-xs font-medium text-gray-300">{data.pe ? data.pe.toFixed(1) : '-'}</p>
                </div>
                <div className="text-center">
                    <p className="text-[9px] text-gray-500 uppercase">Chg $</p>
                    <p className={clsx("text-xs font-medium", isPositive ? "text-finance-green" : "text-finance-red")}>
                        {data.change ? (data.change >= 0 ? '+' : '') + data.change.toFixed(2) : '-'}
                    </p>
                </div>
            </div>
        </div>
    );

    if (isEditMode) {
        return <div className="cursor-default"><CardContent /></div>;
    }

    return (
        <Link to={`/stock/${stock.ticker}`} className="block">
            <CardContent />
        </Link>
    );
};

// Add Stock Modal
const AddStockModal = ({ isOpen, onClose, onAdd }) => {
    const [ticker, setTicker] = useState('');
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!ticker.trim()) return;

        setLoading(true);
        try {
            await onAdd(ticker.toUpperCase());
            setTicker('');
            onClose();
        } catch (err) {
            alert('Error adding stock: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
            <div className="bg-finance-card border border-gray-800 rounded-xl p-6 w-full max-w-md">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-white">Add Stock</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-white">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="block text-sm text-gray-400 mb-1">Ticker Symbol</label>
                        <input
                            type="text"
                            value={ticker}
                            onChange={(e) => setTicker(e.target.value.toUpperCase())}
                            placeholder="e.g. TSLA"
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-finance-accent"
                            maxLength={10}
                        />
                    </div>
                    <p className="text-xs text-gray-500 mb-4">You can add thesis entries after the stock is created.</p>
                    <button
                        type="submit"
                        disabled={loading || !ticker.trim()}
                        className="w-full bg-finance-accent text-black font-medium py-2 rounded-lg hover:bg-finance-accent/90 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Adding...' : 'Add Stock'}
                    </button>
                </form>
            </div>
        </div>
    );
};

const PortfolioSection = () => {
    const [stocks, setStocks] = useState([]);
    const [quotesData, setQuotesData] = useState({}); // OPTIMIZED: Batch-fetched quotes
    const [thesisMap, setThesisMap] = useState({});
    const [loading, setLoading] = useState(true);
    const [isEditMode, setIsEditMode] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);

    // Fetch stocks from Supabase and batch-fetch all quotes in ONE API call
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [stocksData, entriesData] = await Promise.all([
                    getCuratedStocks(),
                    getAllThesisEntries()
                ]);

                // Group entries by stock_id
                const entriesByStock = {};
                entriesData.forEach(entry => {
                    if (!entriesByStock[entry.stock_id]) {
                        entriesByStock[entry.stock_id] = [];
                    }
                    entriesByStock[entry.stock_id].push(entry);
                });

                setStocks(stocksData);
                setThesisMap(entriesByStock);

                // OPTIMIZED: Batch fetch all quotes in ONE API call instead of 5 calls per stock
                if (stocksData.length > 0) {
                    const tickers = stocksData.map(s => s.ticker);
                    console.log(`[API OPTIMIZATION] Fetching ${tickers.length} stocks in 1 batch call`);
                    const batchQuotes = await fetchBatchQuotes(tickers);
                    setQuotesData(batchQuotes);
                }
            } catch (err) {
                console.error('Error fetching data:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();

        // Subscribe to real-time updates
        const unsubscribeStocks = subscribeToStocks(() => fetchData());

        return () => unsubscribeStocks();
    }, []);

    const handleAddStock = async (ticker) => {
        await addCuratedStock(ticker, '');
        const [stocksData, entriesData] = await Promise.all([
            getCuratedStocks(),
            getAllThesisEntries()
        ]);
        const entriesByStock = {};
        entriesData.forEach(entry => {
            if (!entriesByStock[entry.stock_id]) entriesByStock[entry.stock_id] = [];
            entriesByStock[entry.stock_id].push(entry);
        });
        setStocks(stocksData);
        setThesisMap(entriesByStock);

        // Fetch quote for new stock
        const tickers = stocksData.map(s => s.ticker);
        const batchQuotes = await fetchBatchQuotes(tickers);
        setQuotesData(batchQuotes);
    };

    const handleRemoveStock = async (id) => {
        if (confirm('Remove this stock and all its thesis entries?')) {
            await removeStock(id);
            const stocksData = await getCuratedStocks();
            setStocks(stocksData);
            const newMap = { ...thesisMap };
            delete newMap[id];
            setThesisMap(newMap);
        }
    };

    const handleAddEntry = async (stockId, content) => {
        await addThesisEntry(stockId, content);
        const entriesData = await getAllThesisEntries();
        const entriesByStock = {};
        entriesData.forEach(entry => {
            if (!entriesByStock[entry.stock_id]) entriesByStock[entry.stock_id] = [];
            entriesByStock[entry.stock_id].push(entry);
        });
        setThesisMap(entriesByStock);
    };

    const handleDeleteEntry = async (entryId) => {
        if (confirm('Delete this thesis entry?')) {
            await deleteThesisEntry(entryId);
            const entriesData = await getAllThesisEntries();
            const entriesByStock = {};
            entriesData.forEach(entry => {
                if (!entriesByStock[entry.stock_id]) entriesByStock[entry.stock_id] = [];
                entriesByStock[entry.stock_id].push(entry);
            });
            setThesisMap(entriesByStock);
        }
    };

    if (loading) {
        return (
            <section className="mb-8">
                <div className="animate-pulse">
                    <div className="h-8 bg-gray-800 rounded w-48 mb-4"></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-48 bg-gray-800 rounded-lg"></div>
                        ))}
                    </div>
                </div>
            </section>
        );
    }

    return (
        <section className="mb-8">
            <div className="flex items-center justify-between mb-4 px-2">
                <h2 className="text-xl font-bold text-white tracking-tight">Curated Stocks</h2>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">{stocks.length} stocks</span>
                    <button
                        onClick={() => setIsEditMode(!isEditMode)}
                        className={clsx(
                            "text-xs px-3 py-1 rounded-full transition-colors",
                            isEditMode
                                ? "bg-finance-accent text-black"
                                : "bg-gray-800 text-gray-400 hover:text-white"
                        )}
                    >
                        {isEditMode ? 'Done' : 'Edit'}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {stocks.map((stock) => (
                    <EnhancedStockCard
                        key={stock.id}
                        stock={stock}
                        quoteData={quotesData[stock.ticker] || { loading: Object.keys(quotesData).length === 0 }}
                        thesisEntries={thesisMap[stock.id] || []}
                        isEditMode={isEditMode}
                        onRemove={handleRemoveStock}
                        onAddEntry={handleAddEntry}
                        onDeleteEntry={handleDeleteEntry}
                    />
                ))}

                {/* Add Stock Card */}
                {isEditMode && (
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="bg-finance-card border-2 border-dashed border-gray-700 rounded-lg p-8 flex flex-col items-center justify-center hover:border-finance-accent transition-colors cursor-pointer min-h-[200px]"
                    >
                        <Plus className="w-8 h-8 text-gray-500 mb-2" />
                        <span className="text-gray-500">Add Stock</span>
                    </button>
                )}
            </div>

            {/* Modals */}
            <AddStockModal
                isOpen={showAddModal}
                onClose={() => setShowAddModal(false)}
                onAdd={handleAddStock}
            />
        </section>
    );
};

export default PortfolioSection;
