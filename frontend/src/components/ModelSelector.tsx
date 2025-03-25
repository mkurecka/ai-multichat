import React, { useState, useEffect } from 'react';
import { Model } from '../types';
import { Check, Info, Search, X } from 'lucide-react';
import { getModels } from '../api';

interface ModelSelectorProps {
    models: Model[];
    onModelToggle: (modelId: string) => void;
    maxModels: number;
}

const ModelSelector: React.FC<ModelSelectorProps> = ({ models, onModelToggle, maxModels }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);
    const selectedCount = models.filter(model => model.selected).length;
    const hasActiveChat = models.some(model => model.selected);

    // Filter models based on search term
    const filteredModels = models.filter(model =>
        model.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (model.description && model.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="bg-white rounded-lg shadow p-4">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Select Models</h2>
                <div className="text-sm text-gray-600">
                    {selectedCount}/{maxModels} selected
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

            {/* Single row scrollable model list */}
            <div className="overflow-x-auto">
                {loading ? (
                    <div className="text-center text-gray-500">Loading models...</div>
                ) : (
                    <div className="flex space-x-2 pb-2" style={{ minWidth: 'max-content' }}>
                        {filteredModels.map((model) => (
                            <button
                                key={model.id}
                                onClick={() => onModelToggle(model.id)}
                                disabled={!model.selected && selectedCount >= maxModels}
                                className={`
                  flex flex-col items-start p-2 rounded-md border transition-all min-w-[150px]
                  ${model.selected
                                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                                    : selectedCount >= maxModels && !model.selected
                                        ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
                                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                }
                `}
                            >
                                <div className="flex w-full justify-between items-center mb-1">
                                    <div className="font-medium truncate mr-2">{model.name}</div>
                                    <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${model.selected ? 'bg-blue-500' : 'border border-gray-300'}`}>
                                        {model.selected && <Check size={12} className="text-white" />}
                                    </div>
                                </div>
                                <div className="text-xs text-gray-500 truncate w-full">{model.description || 'No description'}</div>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ModelSelector;