import React from 'react';
import { Link } from 'react-router-dom';
import { watchlistStocks } from '../../data/mockStocks';
import StockCard from './StockCard';

const WatchlistSection = () => {
    return (
        <section className="mt-10">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-white">Watchlist</h2>
                <span className="text-finance-muted text-sm">{watchlistStocks.length} stocks</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {watchlistStocks.map((stock) => (
                    <Link key={stock.ticker} to={`/stock/${stock.ticker}`}>
                        <StockCard stock={stock} />
                    </Link>
                ))}
            </div>
        </section>
    );
};

export default WatchlistSection;
