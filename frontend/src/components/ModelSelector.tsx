import React, { useState, useRef, useEffect } from 'react';
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

    return (
        <div className="relative" ref={dropdownRef}>
            <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-medium text-gray-700">Select Models</h2>
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
                <svg
                    className="absolute right-3 top-2.5 h-5 w-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                </svg>
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
                                        <span>{model.name}</span>
                                        {model.selected && (
                                            <svg
                                                className="h-4 w-4 text-blue-600"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M5 13l4 4L19 7"
                                                />
                                            </svg>
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
                                ×
                            </button>
                        </div>
                    ))}
            </div>
        </div>
    );
};

export default ModelSelector;
