import React from 'react';
import { AreaChart, Area, Line, Bar, ComposedChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

/**
 * Smart Stock Chart Component
 * Handles both daily price data and quarterly financial data with appropriate X-axis formatting
 */

const formatNumber = (num) => {
    if (num === null || num === undefined) return '-';
    if (Math.abs(num) >= 1.0e+12) return `${(num / 1.0e+12).toFixed(1)}T`;
    if (Math.abs(num) >= 1.0e+9) return `${(num / 1.0e+9).toFixed(1)}B`;
    if (Math.abs(num) >= 1.0e+6) return `${(num / 1.0e+6).toFixed(1)}M`;
    if (Math.abs(num) >= 1.0e+3) return `${(num / 1.0e+3).toFixed(1)}K`;
    return num.toFixed(2);
};

const formatYAxis = (tick, type) => {
    if (tick === null || tick === undefined) return '-';
    if (type === 'price') return `$${tick.toFixed(0)}`;
    if (type === 'percent') return `${(tick * 100).toFixed(0)}%`;
    if (type === 'ratio') return tick.toFixed(1);
    if (type === 'financial') return formatNumber(tick);
    return tick;
};

// Detect if data is quarterly (few data points, dates are period-end dates)
const isQuarterlyData = (data) => {
    if (!data || data.length === 0) return false;
    // Quarterly data typically has 4-20 data points (1-5 years of quarters)
    // Daily data has 200+ data points
    return data.length <= 20;
};

// Format date based on data type
const formatXAxisTick = (dateStr, isQuarterly) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);

    if (isQuarterly) {
        // For quarterly data, show Q1'24 format
        const quarter = Math.ceil((date.getMonth() + 1) / 3);
        const year = String(date.getFullYear()).slice(-2);
        return `Q${quarter}'${year}`;
    } else {
        // For daily data, show Jan 15 format
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
};

// Format tooltip label based on data type
const formatTooltipLabel = (dateStr, isQuarterly) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);

    if (isQuarterly) {
        const quarter = Math.ceil((date.getMonth() + 1) / 3);
        return `Q${quarter} ${date.getFullYear()}`;
    } else {
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }
};

const StockChart = ({ data, series = [], yAxisType = 'price', dataType = 'auto' }) => {
    // Auto-detect if data is quarterly or daily
    const isQuarterly = dataType === 'quarterly' || (dataType === 'auto' && isQuarterlyData(data));

    // Tooltip formatter based on Y-axis type
    const tooltipFormatter = (value, name) => {
        if (value === null || value === undefined) return ['-', name];

        if (yAxisType === 'price') return [`$${value.toFixed(2)}`, name];
        if (yAxisType === 'percent') return [`${(value * 100).toFixed(1)}%`, name];
        if (yAxisType === 'ratio') return [value.toFixed(2), name];
        if (yAxisType === 'financial') return [formatNumber(value), name];
        return [value, name];
    };

    return (
        <div className="h-[350px] w-full bg-finance-card p-4 rounded-xl border border-gray-800">
            <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                        {series.filter(s => s.type === 'area').map((s) => (
                            <linearGradient key={s.key} id={`color-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={s.color} stopOpacity={0.3} />
                                <stop offset="95%" stopColor={s.color} stopOpacity={0} />
                            </linearGradient>
                        ))}
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#333" />
                    <XAxis
                        dataKey="date"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 11, fill: '#888' }}
                        tickFormatter={(str) => formatXAxisTick(str, isQuarterly)}
                        interval={isQuarterly ? 0 : 'preserveStartEnd'}
                        angle={isQuarterly ? -45 : 0}
                        textAnchor={isQuarterly ? 'end' : 'middle'}
                        height={isQuarterly ? 50 : 30}
                    />
                    <YAxis
                        yAxisId="left"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 11, fill: '#888' }}
                        domain={['auto', 'auto']}
                        tickFormatter={(tick) => formatYAxis(tick, yAxisType)}
                        width={60}
                    />

                    <Tooltip
                        contentStyle={{
                            backgroundColor: '#1a1a2e',
                            borderColor: '#333',
                            borderRadius: '8px',
                            color: '#fff'
                        }}
                        labelFormatter={(label) => formatTooltipLabel(label, isQuarterly)}
                        formatter={tooltipFormatter}
                    />

                    {series.map((s) => {
                        if (s.type === 'area') return (
                            <Area
                                key={s.key}
                                yAxisId={s.yAxisId || 'left'}
                                type="monotone"
                                dataKey={s.key}
                                name={s.name}
                                stroke={s.color}
                                strokeWidth={2}
                                fillOpacity={1}
                                fill={`url(#color-${s.key})`}
                                connectNulls
                            />
                        );
                        if (s.type === 'bar') return (
                            <Bar
                                key={s.key}
                                yAxisId={s.yAxisId || 'left'}
                                dataKey={s.key}
                                name={s.name}
                                fill={s.color}
                                opacity={0.8}
                                radius={[4, 4, 0, 0]}
                            />
                        );
                        return (
                            <Line
                                key={s.key}
                                yAxisId={s.yAxisId || 'left'}
                                type="monotone"
                                dataKey={s.key}
                                name={s.name}
                                stroke={s.color}
                                strokeWidth={2}
                                dot={false}
                                connectNulls
                            />
                        );
                    })}
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    );
};

export default StockChart;
