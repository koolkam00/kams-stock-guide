import React from 'react';
import { AlertCircle } from 'lucide-react';

const ErrorMessage = ({ message, retryAction }) => {
    return (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-start gap-4 text-red-400">
            <AlertCircle className="h-6 w-6 flex-shrink-0" />
            <div className="flex-1">
                <h3 className="font-bold text-sm uppercase mb-1">Data Unavailable</h3>
                <p className="text-sm text-red-200/80 mb-3">{message}</p>
                {retryAction && (
                    <button
                        onClick={retryAction}
                        className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-xs font-bold rounded transition-colors"
                    >
                        Try Again
                    </button>
                )}
            </div>
        </div>
    );
};

export default ErrorMessage;
