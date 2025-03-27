import React, { useState } from 'react';
import { Model } from '../types';
import { Check, Info, RefreshCw, Search, X, HelpCircle } from 'lucide-react';
import { refreshModels } from '../services/api';

interface ModelSelectorProps {
    models: Model[];
    onModelToggle: (modelId: string) => void;
    maxModels: number;
}

const ModelSelector: React.FC<ModelSelectorProps> = ({ models, onModelToggle, maxModels }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const selectedCount = models.filter(model => model.selected).length;
    const hasActiveChat = models.some(model => model.selected);

    // Filter models based on search term
    const filteredModels = models.filter(model =>
        model.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (model.description && model.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const formatPrice = (price: number) => {
        return `$${(price / 1000).toFixed(3)}/1k tokens`;
    };

    return (
        <div className="bg-white rounded-lg shadow p-4">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Select Models</h2>
                <div className="flex items-center gap-2">
                    <button 
                        onClick={async () => {
                            setRefreshing(true);
                            try {
                                const refreshedModels = await refreshModels();
                                window.location.reload();
                            } catch (error) {
                                console.error('Failed to refresh models:', error);
                            } finally {
                                setRefreshing(false);
                            }
                        }}
                        disabled={refreshing}
                        className="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100"
                        title="Refresh models"
                    >
                        <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                    </button>
                    <div className="text-sm text-gray-600">
                        {selectedCount}/{maxModels} selected
                    </div>
                </div>
            </div>

            {selectedCount === 0 && (
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md text-sm text-yellow-700 flex items-start">
                    <Info size={18} className="mr-2 flex-shrink-0 mt-0.5" />
                    <p>Select up to {maxModels} models to compare their responses to your prompt.</p>
                </div>
            )}

            {hasActiveChat && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md text-sm text-blue-700 flex items-start">
                    <Info size={18} className="mr-2 flex-shrink-0 mt-0.5" />
                    <p>You can uncheck models to continue the conversation with fewer models.</p>
                </div>
            )}

            {/* Search input */}
            <div className="relative mb-4">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search size={16} className="text-gray-400" />
                </div>
                <input
                    type="text"
                    className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Search models..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                    <button
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        onClick={() => setSearchTerm('')}
                    >
                        <X size={16} className="text-gray-400 hover:text-gray-600" />
                    </button>
                )}
            </div>

            {/* Grid layout for models */}
            <div className="overflow-y-auto max-h-[400px] pr-2">
                {loading ? (
                    <div className="text-center text-gray-500">Loading models...</div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {filteredModels.map((model) => (
                            <button
                                key={model.id}
                                onClick={() => onModelToggle(model.id)}
                                disabled={!model.selected && selectedCount >= maxModels}
                                className={`
                                    flex flex-col items-start p-3 rounded-lg border transition-all relative
                                    ${model.selected
                                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                                        : selectedCount >= maxModels && !model.selected
                                            ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
                                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                    }
                                `}
                            >
                                <div className="flex w-full justify-between items-start mb-1">
                                    <div className="font-medium truncate mr-2">{model.name}</div>
                                    <div className="flex items-center gap-2">
                                        {model.pricing && (
                                            <div className="group relative">
                                                <HelpCircle size={16} className="text-gray-400" />
                                                <div className="absolute bottom-full right-0 mb-2 w-48 p-2 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                                                    <p className="mb-1">Pricing per request:</p>
                                                    <p>Input: {formatPrice(model.pricing.prompt)}</p>
                                                    <p>Output: {formatPrice(model.pricing.completion)}</p>
                                                </div>
                                            </div>
                                        )}
                                        <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${model.selected ? 'bg-blue-500' : 'border border-gray-300'}`}>
                                            {model.selected && <Check size={12} className="text-white" />}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-xs text-gray-500 line-clamp-2 w-full">{model.description || 'No description'}</div>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ModelSelector;
