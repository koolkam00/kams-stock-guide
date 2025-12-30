import React from 'react';
import { watchlistStocks } from '../../data/mockStocks';
import StockCard from '../dashboard/StockCard';

const WatchlistSection = () => {
    return (
        <section>
            <div className="flex items-center justify-between mb-4 px-2">
                <h2 className="text-xl font-bold text-white tracking-tight">Watchlist & Screener</h2>
                <button className="text-sm text-finance-blue hover:text-blue-400 font-medium transition-colors">
                    View All
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {watchlistStocks.map((stock) => (
                    <StockCard key={stock.ticker} stock={stock} isWatchlist={true} />
                ))}
            </div>
        </section>
    );
};

export default WatchlistSection;
