import './bootstrap.js';

import { startStimulusApp } from '@symfony/stimulus-bundle';
import ChatController from './controllers/chat_controller.js';
import ModelSelectorController from './controllers/model_selector_controller.js';
import MessageInputController from './controllers/message_input_controller.js';
import ChatHistoryController from './controllers/chat_history_controller.js';

console.log('This log comes from assets/app.js - welcome to AssetMapper! 🎉');

import './styles/app.css';

export const app = startStimulusApp();

app.register('chat', ChatController);
app.register('model-selector', ModelSelectorController);
app.register('message-input', MessageInputController);
app.register('chat-history', ChatHistoryController);
