import React, { useState, useRef, useEffect } from 'react';
import { Model } from '../types';
import { Check, Info, RefreshCw, Search, X, HelpCircle } from 'lucide-react';
import { refreshModels } from '../services/api';

interface ModelSelectorProps {
    models: Model[];
    onModelToggle: (modelId: string) => void;
    maxModels: number;
}

// Check if we're in development mode
const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

const ModelSelector: React.FC<ModelSelectorProps> = ({ models, onModelToggle, maxModels }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [selectedCount, setSelectedCount] = useState(0);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const hasActiveChat = models.some(model => model.selected);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Update selected count
    useEffect(() => {
        setSelectedCount(models.filter(m => m.selected).length);
    }, [models]);

    const filteredModels = models.filter(model =>
        model.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const formatPrice = (price: number) => {
        return `$${(price / 1000).toFixed(3)}/1k tokens`;
    };

    // Debug information - only log in development
    if (isDevelopment) {
        console.log('ModelSelector rendering with models:', models.length);
        console.log('Selected models:', selectedCount);
    }

    return (
        <div className="relative border border-gray-200 rounded-lg p-4 bg-white shadow-sm" ref={dropdownRef}>
            <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-medium text-gray-700">Available Models</h2>
                <span className="text-xs text-gray-500">
                    {selectedCount}/{maxModels} models selected
                </span>
            </div>
            
            {/* Search input */}
            <div className="relative">
                <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onFocus={() => setIsOpen(true)}
                    placeholder="Search models..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <Search className="absolute right-3 top-2.5 h-5 w-5 text-gray-400" />
            </div>

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    <div className="p-2">
                        {filteredModels.length === 0 ? (
                            <div className="text-sm text-gray-500 py-2 text-center">
                                No models found
                            </div>
                        ) : (
                            filteredModels.map(model => (
                                <button
                                    key={model.id}
                                    onClick={() => {
                                        onModelToggle(model.id);
                                        setSearchTerm('');
                                    }}
                                    disabled={!model.selected && selectedCount >= maxModels}
                                    className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors
                                        ${model.selected
                                            ? 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                                            : 'text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed'
                                        }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center">
                                            <span>{model.name}</span>
                                            {model.supportsStreaming && (
                                                <span className="ml-2 text-xs bg-green-100 text-green-800 px-1.5 py-0.5 rounded-full">
                                                    Streaming
                                                </span>
                                            )}
                                        </div>
                                        {model.selected && (
                                            <Check className="h-4 w-4 text-blue-600" />
                                        )}
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* Selected models chips */}
            <div className="mt-2 flex flex-wrap gap-2">
                {models
                    .filter(model => model.selected)
                    .map(model => (
                        <div
                            key={model.id}
                            className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
                        >
                            {model.name}
                            <button
                                onClick={() => onModelToggle(model.id)}
                                className="ml-2 text-blue-600 hover:text-blue-800"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    ))}
            </div>
            
            {/* Debug info - only visible in development */}
            {isDevelopment && models.length === 0 && (
                <div className="mt-2 text-sm text-red-500">
                    No models available. Please check the API connection.
                </div>
            )}
        </div>
    );
};

export default ModelSelector;
