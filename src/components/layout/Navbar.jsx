import React from 'react';
import { Menu, TrendingUp } from 'lucide-react';

const Navbar = () => {
    return (
        <nav className="sticky top-0 z-50 bg-finance-bg border-b border-gray-800 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
                <TrendingUp className="h-6 w-6 text-finance-green" />
                <span className="font-bold text-lg tracking-tight text-white">
                    KSG <span className="text-finance-muted text-sm font-normal hidden sm:inline">| Declassified Guide</span>
                </span>
            </div>
            <button className="p-2 hover:bg-gray-800 rounded-lg transition-colors">
                <Menu className="h-6 w-6 text-gray-300" />
            </button>
        </nav>
    );
};

export default Navbar;
