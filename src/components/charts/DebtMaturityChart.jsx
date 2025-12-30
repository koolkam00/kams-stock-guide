import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const DebtMaturityChart = ({ data }) => {
    return (
        <div className="h-[250px] w-full bg-finance-card p-4 rounded-xl border border-gray-800">
            <h3 className="text-sm font-bold text-finance-muted mb-4 uppercase">Debt Maturity Schedule (Billions)</h3>
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data}>
                    <XAxis
                        dataKey="year"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12, fill: '#888' }}
                    />
                    <YAxis
                        hide={true}
                    />
                    <Tooltip
                        cursor={{ fill: 'transparent' }}
                        contentStyle={{ backgroundColor: '#1E1E1E', borderColor: '#333', color: '#fff' }}
                        formatter={(value) => [`$${value}B`, 'Amount']}
                    />
                    <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={index === data.length - 1 ? '#FF333A' : '#2F80ED'} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};

export default DebtMaturityChart;
