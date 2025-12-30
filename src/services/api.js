import { generateHistory, getStockByTicker, getAllStocks } from '../data/mockStocks';

const API_KEY = import.meta.env.VITE_FMP_API_KEY;
const BASE_URL = 'https://financialmodelingprep.com/stable';

// --- Persistent Caching System ---
// OPTIMIZED: Extended TTLs to reduce API calls (250/day limit on free tier)
const CACHE_PREFIX = 'fmp_api_';
const CACHE_TTL = {
    quote: 15 * 60 * 1000,          // 15 minutes for quotes (was 5 min)
    profile: 30 * 24 * 60 * 60 * 1000, // 30 days for company profiles (was 7 days)
    history: 12 * 60 * 60 * 1000,   // 12 hours for historical data (was 6h)
    financials: 30 * 24 * 60 * 60 * 1000, // 30 days for financials (was 7 days)
    news: 6 * 60 * 60 * 1000,       // 6 hours for news (was 1h)
    search: 30 * 24 * 60 * 60 * 1000, // 30 days for search (was 7 days)
    macro: 24 * 60 * 60 * 1000,     // 24 hours for macro data
    priceChange: 15 * 60 * 1000     // 15 minutes for price changes
};

// Get cached data (returns null if expired)
const getCachedData = (key) => {
    const itemStr = localStorage.getItem(CACHE_PREFIX + key);
    if (!itemStr) return null;
    try {
        const item = JSON.parse(itemStr);
        const now = new Date().getTime();
        if (now > item.expiry) {
            // Don't remove - keep for stale fallback
            return null;
        }
        return item.value;
    } catch (e) {
        return null;
    }
};

// Get stale cached data (even if expired) - for API failure fallback
const getStaleCachedData = (key) => {
    const itemStr = localStorage.getItem(CACHE_PREFIX + key);
    if (!itemStr) return null;
    try {
        const item = JSON.parse(itemStr);
        return item.value; // Return regardless of expiry
    } catch (e) {
        return null;
    }
};

const setCachedData = (key, value, type) => {
    const now = new Date().getTime();
    const ttl = CACHE_TTL[type] || 60 * 1000;
    const item = {
        value: value,
        expiry: now + ttl,
    };
    try {
        localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(item));
    } catch (e) {
        console.warn('LocalStorage full, clearing old cache');
        // Only clear items with this prefix
        Object.keys(localStorage).forEach(k => {
            if (k.startsWith(CACHE_PREFIX)) localStorage.removeItem(k);
        });
    }
};


// --- API Helpers ---

const checkApiError = (data) => {
    if (data['Error Message']) {
        throw new Error(data['Error Message']);
    }
    if (Array.isArray(data) && data.length === 0) {
        throw new Error('NO_DATA');
    }
};

// --- Mock Generators (Fallback) ---

const getMockQuote = (ticker) => {
    const stock = getStockByTicker(ticker);
    return stock ? {
        price: stock.price,
        change: stock.change || 0,
        changePercent: stock.changePercent || 0,
        volume: 1500000,
        prevClose: stock.price - (stock.change || 0),
        dayHigh: stock.price * 1.02,
        dayLow: stock.price * 0.98,
        yearHigh: stock.price * 1.3,
        yearLow: stock.price * 0.7,
        marketCap: null,
        pe: stock.peRatio || null,
        eps: null
    } : {
        price: 150.00, change: 1.5, changePercent: 1.0, volume: 1000000, prevClose: 148.5
    };
};

const getMockProfile = (ticker) => {
    const stock = getStockByTicker(ticker);
    return stock ? {
        name: stock.name,
        symbol: ticker,
        sector: stock.sector || 'Technology',
        industry: 'Unknown',
        description: `(Mock Data) ${stock.name} is a company in the ${stock.sector || 'Technology'} sector.`,
        ceo: 'Unknown',
        website: '',
        employees: null,
        marketCap: stock.marketCap,
        peRatio: stock.peRatio,
        forwardPE: null,
        pegRatio: null,
        dividend: stock.dividend,
        beta: null
    } : {
        name: ticker, sector: 'Unknown', description: 'Mock Description'
    };
};

// --- Main API Functions ---

/**
 * Fetch Stock Quote (Real-time)
 */
export const fetchStockQuote = async (ticker) => {
    if (!API_KEY) return getMockQuote(ticker);

    const cacheKey = `quote_${ticker}`;
    const cached = getCachedData(cacheKey);
    if (cached) return cached;

    try {
        const response = await fetch(`${BASE_URL}/quote?symbol=${ticker}&apikey=${API_KEY}`);
        const data = await response.json();
        checkApiError(data);

        if (data && data.length > 0) {
            const quote = data[0];
            const result = {
                price: quote.price,
                change: quote.change,
                changePercent: quote.changesPercentage,
                volume: quote.volume,
                prevClose: quote.previousClose,
                dayHigh: quote.dayHigh,
                dayLow: quote.dayLow,
                yearHigh: quote.yearHigh,
                yearLow: quote.yearLow,
                marketCap: quote.marketCap,
                pe: quote.pe,
                eps: quote.eps,
                name: quote.name,
                avgVolume: quote.avgVolume
            };
            setCachedData(cacheKey, result, 'quote');
            return result;
        }
        throw new Error('NO_DATA');
    } catch (e) {
        console.warn(`FMP Error for Quote ${ticker}:`, e.message);
        // Try stale cache before mock data
        const staleData = getStaleCachedData(cacheKey);
        if (staleData) {
            console.log(`Using stale cache for ${ticker}`);
            return staleData;
        }
        return getMockQuote(ticker);
    }
};

/**
 * Fetch Stock Price Change (Pre-calculated 1D, 1W, 1M, etc.)
 */
export const fetchPriceChange = async (ticker) => {
    if (!API_KEY) return null;

    const cacheKey = `pricechange_${ticker}`;
    const cached = getCachedData(cacheKey);
    if (cached) return cached;

    try {
        const response = await fetch(`${BASE_URL}/stock-price-change?symbol=${ticker}&apikey=${API_KEY}`);
        const data = await response.json();
        checkApiError(data);

        if (data && data.length > 0) {
            const changes = data[0];
            const result = {
                '1D': changes['1D'] ? parseFloat(changes['1D'].toFixed(2)) : null,
                '1W': changes['5D'] ? parseFloat(changes['5D'].toFixed(2)) : null, // FMP uses 5D for 1 week
                '1M': changes['1M'] ? parseFloat(changes['1M'].toFixed(2)) : null,
                '3M': changes['3M'] ? parseFloat(changes['3M'].toFixed(2)) : null,
                '6M': changes['6M'] ? parseFloat(changes['6M'].toFixed(2)) : null,
                '1Y': changes['1Y'] ? parseFloat(changes['1Y'].toFixed(2)) : null,
                'YTD': changes['ytd'] ? parseFloat(changes['ytd'].toFixed(2)) : null
            };
            setCachedData(cacheKey, result, 'priceChange');
            return result;
        }
        return null;
    } catch (e) {
        console.warn(`FMP Error for Price Change ${ticker}:`, e.message);
        const staleData = getStaleCachedData(cacheKey);
        if (staleData) return staleData;
        return null;
    }
};

/**
 * Batch Fetch Multiple Stock Quotes (OPTIMIZED - 1 API call for multiple symbols)
 */
export const fetchBatchQuotes = async (tickers) => {
    if (!API_KEY || !tickers || tickers.length === 0) return {};

    // Check cache first for all tickers
    const results = {};
    const uncachedTickers = [];

    tickers.forEach(ticker => {
        const cached = getCachedData(`quote_${ticker}`);
        if (cached) {
            results[ticker] = cached;
        } else {
            uncachedTickers.push(ticker);
        }
    });

    // If all cached, return
    if (uncachedTickers.length === 0) return results;

    try {
        const symbolsParam = uncachedTickers.join(',');
        const response = await fetch(`${BASE_URL}/batch-quote?symbols=${symbolsParam}&apikey=${API_KEY}`);
        const data = await response.json();
        checkApiError(data);

        if (data && Array.isArray(data)) {
            data.forEach(quote => {
                const result = {
                    price: quote.price,
                    change: quote.change,
                    changePercent: quote.changesPercentage,
                    volume: quote.volume,
                    prevClose: quote.previousClose,
                    dayHigh: quote.dayHigh,
                    dayLow: quote.dayLow,
                    yearHigh: quote.yearHigh,
                    yearLow: quote.yearLow,
                    marketCap: quote.marketCap,
                    pe: quote.pe,
                    eps: quote.eps,
                    name: quote.name,
                    avgVolume: quote.avgVolume
                };
                setCachedData(`quote_${quote.symbol}`, result, 'quote');
                results[quote.symbol] = result;
            });
        }
        return results;
    } catch (e) {
        console.warn(`FMP Error for Batch Quote:`, e.message);
        // Try stale cache for each uncached ticker
        uncachedTickers.forEach(ticker => {
            const staleData = getStaleCachedData(`quote_${ticker}`);
            if (staleData) {
                results[ticker] = staleData;
            } else {
                results[ticker] = getMockQuote(ticker);
            }
        });
        return results;
    }
};

/**
 * Batch Fetch Price Changes for Multiple Symbols (OPTIMIZED)
 * Note: FMP doesn't have a true batch endpoint for price changes, 
 * but we can optimize by checking cache first and only fetching uncached
 */
export const fetchBatchPriceChanges = async (tickers) => {
    if (!API_KEY || !tickers || tickers.length === 0) return {};

    const results = {};
    const promises = [];

    tickers.forEach(ticker => {
        const cached = getCachedData(`pricechange_${ticker}`);
        if (cached) {
            results[ticker] = cached;
        } else {
            promises.push(
                fetchPriceChange(ticker).then(data => {
                    results[ticker] = data;
                })
            );
        }
    });

    await Promise.all(promises);
    return results;
};

/**
 * Batch Fetch Company Profiles (OPTIMIZED - uses FMP batch profile endpoint)
 */
export const fetchBatchProfiles = async (tickers) => {
    if (!API_KEY || !tickers || tickers.length === 0) return {};

    const results = {};
    const uncachedTickers = [];

    tickers.forEach(ticker => {
        const cached = getCachedData(`profile_${ticker}`);
        if (cached) {
            results[ticker] = cached;
        } else {
            uncachedTickers.push(ticker);
        }
    });

    if (uncachedTickers.length === 0) return results;

    try {
        const symbolsParam = uncachedTickers.join(',');
        const response = await fetch(`${BASE_URL}/profile?symbol=${symbolsParam}&apikey=${API_KEY}`);
        const data = await response.json();
        checkApiError(data);

        if (data && Array.isArray(data)) {
            data.forEach(profile => {
                const result = {
                    name: profile.companyName,
                    symbol: profile.symbol,
                    sector: profile.sector,
                    industry: profile.industry,
                    description: profile.description,
                    ceo: profile.ceo,
                    website: profile.website,
                    employees: profile.fullTimeEmployees,
                    marketCap: profile.mktCap,
                    peRatio: profile.peRatio,
                    forwardPE: profile.forwardPE,
                    beta: profile.beta
                };
                setCachedData(`profile_${profile.symbol}`, result, 'profile');
                results[profile.symbol] = result;
            });
        }
        return results;
    } catch (e) {
        console.warn(`FMP Error for Batch Profile:`, e.message);
        uncachedTickers.forEach(ticker => {
            const staleData = getStaleCachedData(`profile_${ticker}`);
            if (staleData) {
                results[ticker] = staleData;
            } else {
                results[ticker] = getMockProfile(ticker);
            }
        });
        return results;
    }
};


/**
 * Fetch Company Profile
 */
export const fetchCompanyOverview = async (ticker) => {
    if (!API_KEY) return getMockProfile(ticker);

    const cacheKey = `profile_${ticker}`;
    const cached = getCachedData(cacheKey);
    if (cached) return cached;

    try {
        const response = await fetch(`${BASE_URL}/profile?symbol=${ticker}&apikey=${API_KEY}`);
        const data = await response.json();
        checkApiError(data);

        if (data && data.length > 0) {
            const profile = data[0];
            const result = {
                name: profile.companyName,
                symbol: profile.symbol,
                sector: profile.sector,
                industry: profile.industry,
                description: profile.description,
                ceo: profile.ceo,
                website: profile.website,
                employees: profile.fullTimeEmployees,
                marketCap: profile.mktCap,
                peRatio: profile.pe || null,
                forwardPE: profile.forwardPE || null,
                pegRatio: profile.peg || null,
                trailingPE: profile.pe || null,
                dividend: profile.lastDiv ? (profile.lastDiv / profile.price * 100).toFixed(2) : null,
                beta: profile.beta,
                price: profile.price,
                exchange: profile.exchangeShortName,
                country: profile.country,
                ipoDate: profile.ipoDate,
                image: profile.image
            };
            setCachedData(cacheKey, result, 'profile');
            return result;
        }
        throw new Error('NO_PROFILE_DATA');
    } catch (e) {
        console.warn(`FMP Error for Profile ${ticker}:`, e.message);
        const staleData = getStaleCachedData(cacheKey);
        if (staleData) return staleData;
        return getMockProfile(ticker);
    }
};

/**
 * Fetch Historical Daily Prices
 */
export const fetchDailyHistory = async (ticker) => {
    if (!API_KEY) {
        const stock = getStockByTicker(ticker);
        return stock ? generateHistory(stock.price) : generateHistory(100);
    }

    const cacheKey = `history_${ticker}`;
    const cached = getCachedData(cacheKey);
    if (cached) return cached;

    try {
        const response = await fetch(`${BASE_URL}/historical-price-eod/full?symbol=${ticker}&apikey=${API_KEY}`);
        const data = await response.json();
        checkApiError(data);

        if (data && data.length > 0) {
            // FMP returns newest first, take last 100 days
            const formattedData = data.slice(0, 100).map(day => ({
                date: day.date,
                price: day.close,
                open: day.open,
                high: day.high,
                low: day.low,
                volume: day.volume,
                change: day.change,
                changePercent: day.changePercent,
                vwap: day.vwap
            }));

            setCachedData(cacheKey, formattedData, 'history');
            return formattedData;
        }
        throw new Error('NO_HISTORY_DATA');
    } catch (e) {
        console.warn(`FMP Error for History ${ticker}:`, e.message);
        const stock = getStockByTicker(ticker);
        return stock ? generateHistory(stock.price) : generateHistory(150);
    }
};

/**
 * Fetch Income Statement
 */
export const fetchIncomeStatement = async (ticker) => {
    if (!API_KEY) return [];

    const cacheKey = `income_${ticker}`;
    const cached = getCachedData(cacheKey);
    if (cached) return cached;

    try {
        const response = await fetch(`${BASE_URL}/income-statement?symbol=${ticker}&limit=4&apikey=${API_KEY}`);
        const data = await response.json();
        checkApiError(data);

        if (data && data.length > 0) {
            const result = data.map(stmt => ({
                date: stmt.date,
                period: stmt.period,
                revenue: stmt.revenue,
                grossProfit: stmt.grossProfit,
                operatingIncome: stmt.operatingIncome,
                netIncome: stmt.netIncome,
                eps: stmt.eps,
                epsDiluted: stmt.epsdiluted,
                grossMargin: stmt.grossProfitRatio * 100,
                operatingMargin: stmt.operatingIncomeRatio * 100,
                netMargin: stmt.netIncomeRatio * 100,
                ebitda: stmt.ebitda,
                researchAndDevelopment: stmt.researchAndDevelopmentExpenses,
                sellingAndMarketing: stmt.sellingAndMarketingExpenses
            }));
            setCachedData(cacheKey, result, 'financials');
            return result;
        }
        return [];
    } catch (e) {
        console.warn(`FMP Error for Income Statement ${ticker}:`, e.message);
        return [];
    }
};

/**
 * Fetch Balance Sheet
 */
export const fetchBalanceSheet = async (ticker) => {
    if (!API_KEY) return [];

    const cacheKey = `balance_${ticker}`;
    const cached = getCachedData(cacheKey);
    if (cached) return cached;

    try {
        const response = await fetch(`${BASE_URL}/balance-sheet-statement?symbol=${ticker}&limit=4&apikey=${API_KEY}`);
        const data = await response.json();
        checkApiError(data);

        if (data && data.length > 0) {
            const result = data.map(stmt => ({
                date: stmt.date,
                period: stmt.period,
                totalAssets: stmt.totalAssets,
                totalLiabilities: stmt.totalLiabilities,
                totalEquity: stmt.totalStockholdersEquity,
                cashAndEquivalents: stmt.cashAndCashEquivalents,
                shortTermInvestments: stmt.shortTermInvestments,
                totalDebt: stmt.totalDebt,
                longTermDebt: stmt.longTermDebt,
                shortTermDebt: stmt.shortTermDebt,
                netDebt: stmt.netDebt,
                inventory: stmt.inventory,
                accountsReceivable: stmt.netReceivables,
                accountsPayable: stmt.accountPayables,
                goodwill: stmt.goodwill,
                intangibleAssets: stmt.intangibleAssets
            }));
            setCachedData(cacheKey, result, 'financials');
            return result;
        }
        return [];
    } catch (e) {
        console.warn(`FMP Error for Balance Sheet ${ticker}:`, e.message);
        return [];
    }
};

/**
 * Fetch Cash Flow Statement
 */
export const fetchCashFlow = async (ticker) => {
    if (!API_KEY) return [];

    const cacheKey = `cashflow_${ticker}`;
    const cached = getCachedData(cacheKey);
    if (cached) return cached;

    try {
        const response = await fetch(`${BASE_URL}/cash-flow-statement?symbol=${ticker}&limit=4&apikey=${API_KEY}`);
        const data = await response.json();
        checkApiError(data);

        if (data && data.length > 0) {
            const result = data.map(stmt => ({
                date: stmt.date,
                period: stmt.period,
                operatingCashFlow: stmt.operatingCashFlow,
                capitalExpenditure: stmt.capitalExpenditure,
                freeCashFlow: stmt.freeCashFlow,
                dividendsPaid: stmt.dividendsPaid,
                stockRepurchased: stmt.commonStockRepurchased,
                debtRepayment: stmt.debtRepayment,
                netCashFromOperations: stmt.netCashProvidedByOperatingActivities,
                netCashFromInvesting: stmt.netCashUsedForInvestingActivites,
                netCashFromFinancing: stmt.netCashUsedProvidedByFinancingActivities,
                netChangeInCash: stmt.netChangeInCash
            }));
            setCachedData(cacheKey, result, 'financials');
            return result;
        }
        return [];
    } catch (e) {
        console.warn(`FMP Error for Cash Flow ${ticker}:`, e.message);
        return [];
    }
};

/**
 * Fetch Key Metrics (EV, ROE, etc.)
 */
export const fetchKeyMetrics = async (ticker) => {
    if (!API_KEY) return null;

    const cacheKey = `metrics_${ticker}`;
    const cached = getCachedData(cacheKey);
    if (cached) return cached;

    try {
        const response = await fetch(`${BASE_URL}/key-metrics?symbol=${ticker}&limit=1&apikey=${API_KEY}`);
        const data = await response.json();
        checkApiError(data);

        if (data && data.length > 0) {
            const metrics = data[0];
            const result = {
                date: metrics.date,
                revenuePerShare: metrics.revenuePerShare,
                netIncomePerShare: metrics.netIncomePerShare,
                operatingCashFlowPerShare: metrics.operatingCashFlowPerShare,
                freeCashFlowPerShare: metrics.freeCashFlowPerShare,
                bookValuePerShare: metrics.bookValuePerShare,
                tangibleBookValuePerShare: metrics.tangibleBookValuePerShare,
                enterpriseValue: metrics.enterpriseValue,
                evToSales: metrics.evToSales,
                evToEbitda: metrics.enterpriseValueOverEBITDA,
                evToFreeCashFlow: metrics.evToFreeCashFlow,
                debtToEquity: metrics.debtToEquity,
                debtToAssets: metrics.debtToAssets,
                currentRatio: metrics.currentRatio,
                interestCoverage: metrics.interestCoverage,
                roe: metrics.roe,
                roa: metrics.returnOnTangibleAssets,
                roic: metrics.roic,
                dividendYield: metrics.dividendYield,
                payoutRatio: metrics.payoutRatio,
                salesPerEmployee: metrics.revenuePerShare,
                priceToSales: metrics.priceToSalesRatio,
                priceToBook: metrics.pbRatio,
                priceToFreeCashFlow: metrics.pfcfRatio
            };
            setCachedData(cacheKey, result, 'financials');
            return result;
        }
        return null;
    } catch (e) {
        console.warn(`FMP Error for Key Metrics ${ticker}:`, e.message);
        return null;
    }
};

/**
 * Fetch Financial Ratios
 */
export const fetchFinancialRatios = async (ticker) => {
    if (!API_KEY) return null;

    const cacheKey = `ratios_${ticker}`;
    const cached = getCachedData(cacheKey);
    if (cached) return cached;

    try {
        const response = await fetch(`${BASE_URL}/ratios?symbol=${ticker}&limit=1&apikey=${API_KEY}`);
        const data = await response.json();
        checkApiError(data);

        if (data && data.length > 0) {
            const ratios = data[0];
            const result = {
                date: ratios.date,
                currentRatio: ratios.currentRatio,
                quickRatio: ratios.quickRatio,
                cashRatio: ratios.cashRatio,
                grossProfitMargin: ratios.grossProfitMargin,
                operatingProfitMargin: ratios.operatingProfitMargin,
                netProfitMargin: ratios.netProfitMargin,
                roe: ratios.returnOnEquity,
                roa: ratios.returnOnAssets,
                roic: ratios.returnOnCapitalEmployed,
                debtEquityRatio: ratios.debtEquityRatio,
                debtRatio: ratios.debtRatio,
                interestCoverage: ratios.interestCoverage,
                assetTurnover: ratios.assetTurnover,
                inventoryTurnover: ratios.inventoryTurnover,
                receivablesTurnover: ratios.receivablesTurnover,
                payablesTurnover: ratios.payablesTurnover,
                peRatio: ratios.priceEarningsRatio,
                pegRatio: ratios.priceEarningsToGrowthRatio,
                priceToSales: ratios.priceToSalesRatio,
                priceToBook: ratios.priceToBookRatio,
                priceToCashFlow: ratios.priceCashFlowRatio,
                priceToFreeCashFlow: ratios.priceToFreeCashFlowsRatio,
                evToSales: ratios.enterpriseValueMultiple,
                evToEbitda: ratios.evToOperatingCashFlow,
                dividendYield: ratios.dividendYield,
                payoutRatio: ratios.payoutRatio
            };
            setCachedData(cacheKey, result, 'financials');
            return result;
        }
        return null;
    } catch (e) {
        console.warn(`FMP Error for Ratios ${ticker}:`, e.message);
        return null;
    }
};

/**
 * Fetch Treasury Rates (Macro)
 */
export const fetchTreasuryRates = async () => {
    if (!API_KEY) {
        return {
            date: new Date().toISOString().split('T')[0],
            year10: 4.45,
            year5: 4.20,
            year2: 4.35,
            month3: 5.25,
            month1: 5.30
        };
    }

    const cacheKey = 'treasury_rates';
    const cached = getCachedData(cacheKey);
    if (cached) return cached;

    try {
        const response = await fetch(`${BASE_URL}/treasury-rates?apikey=${API_KEY}`);
        const data = await response.json();
        checkApiError(data);

        if (data && data.length > 0) {
            const latest = data[0];
            const result = {
                date: latest.date,
                year10: latest.year10,
                year5: latest.year5,
                year2: latest.year2,
                month3: latest.month3,
                month1: latest.month1,
                year30: latest.year30
            };
            setCachedData(cacheKey, result, 'macro');
            return result;
        }
        throw new Error('NO_TREASURY_DATA');
    } catch (e) {
        console.warn(`FMP Error for Treasury Rates:`, e.message);
        return { date: 'N/A', year10: 4.45, year5: 4.20, year2: 4.35 };
    }
};

/**
 * Fetch Stock News
 */
export const fetchNewsSentiment = async (ticker) => {
    if (!API_KEY) return [];

    const cacheKey = `news_${ticker}`;
    const cached = getCachedData(cacheKey);
    if (cached) return cached;

    try {
        const response = await fetch(`${BASE_URL}/news/stock?symbols=${ticker}&limit=10&apikey=${API_KEY}`);
        const data = await response.json();
        checkApiError(data);

        if (data && data.length > 0) {
            const result = data.map(article => ({
                title: article.title,
                url: article.url,
                publishedDate: article.publishedDate,
                site: article.site,
                text: article.text,
                image: article.image
            }));
            setCachedData(cacheKey, result, 'news');
            return result;
        }
        return [];
    } catch (e) {
        console.warn(`FMP Error for News ${ticker}:`, e.message);
        return [];
    }
};

/**
 * Symbol Search
 */
export const fetchSymbolSearch = async (keywords) => {
    if (!API_KEY) {
        const matches = getAllStocks().filter(s =>
            s.ticker.includes(keywords.toUpperCase()) ||
            s.name.toLowerCase().includes(keywords.toLowerCase())
        );
        return matches.map(s => ({
            symbol: s.ticker, name: s.name, type: 'Equity', exchange: 'US'
        }));
    }

    const cacheKey = `search_${keywords}`;
    const cached = getCachedData(cacheKey);
    if (cached) return cached;

    try {
        const response = await fetch(`${BASE_URL}/search?query=${keywords}&limit=10&apikey=${API_KEY}`);
        const data = await response.json();
        checkApiError(data);

        if (data && data.length > 0) {
            const results = data.map(match => ({
                symbol: match.symbol,
                name: match.name,
                type: match.type || 'Equity',
                exchange: match.exchangeShortName
            }));
            setCachedData(cacheKey, results, 'search');
            return results;
        }
        return [];
    } catch (e) {
        console.warn(`FMP Error for Search:`, e.message);
        const matches = getAllStocks().filter(s =>
            s.ticker.includes(keywords.toUpperCase()) ||
            s.name.toLowerCase().includes(keywords.toLowerCase())
        );
        return matches.map(s => ({
            symbol: s.ticker, name: s.name, type: 'Equity', exchange: 'US'
        }));
    }
};

/**
 * Fetch Sector Performance
 */
export const fetchSectorPerformance = async () => {
    if (!API_KEY) return [];

    const cacheKey = 'sector_performance';
    const cached = getCachedData(cacheKey);
    if (cached) return cached;

    try {
        const response = await fetch(`${BASE_URL}/sector-performance-snapshot?apikey=${API_KEY}`);
        const data = await response.json();
        checkApiError(data);

        if (data && data.length > 0) {
            setCachedData(cacheKey, data, 'macro');
            return data;
        }
        return [];
    } catch (e) {
        console.warn(`FMP Error for Sector Performance:`, e.message);
        return [];
    }
};

/**
 * Fetch Analyst Price Target
 */
export const fetchPriceTarget = async (ticker) => {
    if (!API_KEY) return null;

    const cacheKey = `target_${ticker}`;
    const cached = getCachedData(cacheKey);
    if (cached) return cached;

    try {
        const response = await fetch(`${BASE_URL}/price-target-consensus?symbol=${ticker}&apikey=${API_KEY}`);
        const data = await response.json();
        checkApiError(data);

        if (data && data.length > 0) {
            const target = data[0];
            const result = {
                symbol: target.symbol,
                targetHigh: target.targetHigh,
                targetLow: target.targetLow,
                targetConsensus: target.targetConsensus,
                targetMedian: target.targetMedian
            };
            setCachedData(cacheKey, result, 'profile');
            return result;
        }
        return null;
    } catch (e) {
        console.warn(`FMP Error for Price Target ${ticker}:`, e.message);
        return null;
    }
};

/**
 * Fetch RSI Technical Indicator
 */
export const fetchTechnicalRSI = async (ticker) => {
    if (!API_KEY) return [];

    try {
        const response = await fetch(`${BASE_URL}/technical-indicators/rsi?symbol=${ticker}&periodLength=14&timeframe=1day&apikey=${API_KEY}`);
        const data = await response.json();
        if (data && data.length > 0) {
            return data.slice(0, 30).map(d => ({ date: d.date, rsi: d.rsi }));
        }
        return [];
    } catch (e) {
        console.warn(`FMP Error for RSI ${ticker}:`, e.message);
        return [];
    }
};

/**
 * Fetch SMA Technical Indicator
 */
export const fetchTechnicalSMA = async (ticker, period = 50) => {
    if (!API_KEY) return [];

    try {
        const response = await fetch(`${BASE_URL}/technical-indicators/sma?symbol=${ticker}&periodLength=${period}&timeframe=1day&apikey=${API_KEY}`);
        const data = await response.json();
        if (data && data.length > 0) {
            return data.slice(0, 30).map(d => ({ date: d.date, sma: d.sma }));
        }
        return [];
    } catch (e) {
        console.warn(`FMP Error for SMA ${ticker}:`, e.message);
        return [];
    }
};

// Legacy alias for compatibility
export const fetchEconomicIndicator = async (indicator) => {
    const rates = await fetchTreasuryRates();
    if (indicator === 'FEDERAL_FUNDS_RATE') {
        return { value: rates.month1 || '5.33', date: rates.date };
    }
    if (indicator === 'TREASURY_YIELD') {
        return { value: rates.year10 || '4.45', date: rates.date };
    }
    return { value: 'N/A', date: '' };
};

/**
 * Fetch Shares Float Data
 * Returns float shares, outstanding shares, and free float percentage
 */
export const fetchSharesFloat = async (ticker) => {
    if (!API_KEY) return null;

    const cacheKey = `float_${ticker}`;
    const cached = getCachedData(cacheKey);
    if (cached) return cached;

    try {
        const response = await fetch(`${BASE_URL}/shares-float?symbol=${ticker}&apikey=${API_KEY}`);
        const data = await response.json();
        checkApiError(data);

        if (data && data.length > 0) {
            const floatData = data[0];
            const result = {
                symbol: floatData.symbol,
                freeFloat: floatData.freeFloat,
                floatShares: floatData.floatShares,
                outstandingShares: floatData.outstandingShares,
                date: floatData.date
            };
            setCachedData(cacheKey, result, 'macro'); // 24 hour cache
            return result;
        }
        return null;
    } catch (e) {
        console.warn(`FMP Error for Shares Float ${ticker}:`, e.message);
        const staleData = getStaleCachedData(cacheKey);
        if (staleData) return staleData;
        return null;
    }
};

/**
 * Fetch Institutional Holders (Top Shareholders)
 * Returns list of institutional holders with shares and percentage
 */
export const fetchInstitutionalHolders = async (ticker) => {
    if (!API_KEY) return [];

    const cacheKey = `holders_${ticker}`;
    const cached = getCachedData(cacheKey);
    if (cached) return cached;

    try {
        const response = await fetch(`${BASE_URL}/institutional-holder?symbol=${ticker}&apikey=${API_KEY}`);
        const data = await response.json();
        checkApiError(data);

        if (data && data.length > 0) {
            // Sort by shares held and take top 10
            const holders = data
                .sort((a, b) => (b.shares || 0) - (a.shares || 0))
                .slice(0, 10)
                .map(holder => ({
                    holder: holder.holder,
                    shares: holder.shares,
                    dateReported: holder.dateReported,
                    change: holder.change,
                    changePercent: holder.changePercent
                }));
            setCachedData(cacheKey, holders, 'financials'); // 7 day cache
            return holders;
        }
        return [];
    } catch (e) {
        console.warn(`FMP Error for Institutional Holders ${ticker}:`, e.message);
        const staleData = getStaleCachedData(cacheKey);
        if (staleData) return staleData;
        return [];
    }
};
