import React from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';

const StockCard = ({ stock, isWatchlist = false }) => {
    const isPositive = stock.change >= 0;
    const ChangeIcon = isPositive ? ArrowUpRight : ArrowDownRight;
    const colorClass = isPositive ? 'text-finance-green' : 'text-finance-red';

    return (
        <Link to={`/stock/${stock.ticker}`} className="block">
            <div className="bg-finance-card p-4 rounded-lg border border-gray-800 shadow-sm hover:border-gray-600 transition-colors cursor-pointer block h-full">
                <div className="flex justify-between items-start mb-2">
                    <div>
                        <h3 className="font-bold text-lg text-white">{stock.ticker}</h3>
                        <p className="text-xs text-finance-muted uppercase">{stock.name}</p>
                    </div>
                    <div className="text-right">
                        <p className="font-mono text-lg text-white">${stock.price.toFixed(2)}</p>
                        <div className={clsx("flex items-center justify-end text-sm font-medium", colorClass)}>
                            <ChangeIcon className="h-4 w-4 mr-1" />
                            {isPositive ? '+' : ''}{stock.changePercent}%
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-800">
                    {isWatchlist ? (
                        <>
                            <div>
                                <p className="text-[10px] text-finance-muted uppercase">P/E Ratio</p>
                                <p className="text-sm font-medium text-gray-300">{stock.peRatio}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] text-finance-muted uppercase">Market Cap</p>
                                <p className="text-sm font-medium text-gray-300">{stock.marketCap}</p>
                            </div>
                        </>
                    ) : (
                        <>
                            <div>
                                <p className="text-[10px] text-finance-muted uppercase">Total Value</p>
                                <p className="text-sm font-medium text-gray-300">
                                    ${(stock.price * stock.shares).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] text-finance-muted uppercase">Return</p>
                                <p className={clsx("text-sm font-medium",
                                    (stock.price - stock.avgCost) >= 0 ? "text-finance-green" : "text-finance-red"
                                )}>
                                    {((stock.price - stock.avgCost) / stock.avgCost * 100).toFixed(2)}%
                                </p>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </Link>
    );
};

export default StockCard;
