import React from 'react';
import { Model } from '../types';
import { Check } from 'lucide-react';

interface ModelCheckboxProps {
  model: Model;
  onToggle: () => void;
}

const ModelCheckbox: React.FC<ModelCheckboxProps> = ({ model, onToggle }) => {
  return (
    <button
      onClick={onToggle}
      className={`
        flex items-center px-3 py-1 rounded-full text-sm transition-all
        ${model.selected 
          ? 'bg-blue-100 text-blue-700 border border-blue-300' 
          : 'bg-gray-100 text-gray-700 border border-gray-200'
        }
      `}
    >
      <span className="mr-1.5">{model.name}</span>
      <div className={`w-4 h-4 rounded-full flex items-center justify-center ${model.selected ? 'bg-blue-500' : 'border border-gray-300'}`}>
        {model.selected && <Check size={10} className="text-white" />}
      </div>
    </button>
  );
};

export default ModelCheckbox;
