# Multi-Model Chat Comparison App

A web application that allows users to compare outputs from multiple AI models side-by-side using a single prompt.

## Features

- **Multi-Model Selection**: Select up to 16 different AI models to compare simultaneously
- **Side-by-Side Comparison**: View model responses in a horizontal scrollable container
- **Chat History**: Access previous conversations through a collapsible sidebar
- **Model Filtering**: Search for specific models by name or description
- **Dynamic UI**: Responsive interface that adapts based on the conversation state
- **Model Management**: Add or remove models during an active conversation

## Implementation Details

### UI Components

1. **ModelSelector**
   - Displays available models in a single-row, horizontally scrollable list
   - Includes search functionality to filter models
   - Shows selection count (e.g., "5/16 selected")
   - Disables selection when maximum limit is reached
   - Provides informational messages based on selection state

2. **ChatWindow**
   - Displays conversation history with user messages and model responses
   - Groups responses by user message
   - Shows model responses in a horizontally scrollable container
   - Includes a model selection bar for quick toggling during conversation

3. **ChatInput**
   - Provides a text input for user messages
   - Disables sending when no models are selected
   - Supports sending messages with Enter key

4. **ChatHistory**
   - Shows a list of previous conversations
   - Includes a "Start new chat" button
   - Provides tabs for "Chats" and "Projects"
   - Can be collapsed to provide more space for the main chat area

5. **ModelCheckbox**
   - Compact representation of selected models
   - Allows quick toggling of models during conversation

### Key Features Implemented

- **Collapsible Sidebars**: Both the model selector and chat history can be hidden to maximize chat space
- **Dynamic Layout**: Chat window expands after the first message is sent
- **Responsive Design**: UI adapts to different screen sizes and states
- **Visual Feedback**: Clear indicators for selected models and disabled states
- **Informational Messages**: Contextual help messages based on the current state

### Technical Implementation

- **React + TypeScript**: Type-safe component architecture
- **Tailwind CSS**: Utility-first styling approach
- **Lucide React**: Modern icon library
- **Component-Based Architecture**: Modular design with reusable components
- **State Management**: React useState hooks for managing application state
- **Mock Data**: Simulated responses for development and testing

## Future Enhancements

- **OpenRouter API Integration**: Connect to real AI models via OpenRouter
- **Persistent Storage**: Save chat history and preferences
- **Authentication**: User accounts and personalized experiences
- **Export Functionality**: Save or share comparison results
- **Advanced Filtering**: Filter models by capabilities, size, or performance
- **Customizable Layout**: User-defined UI preferences
- **Markdown Support**: Rich text formatting in messages and responses

## Development Journey

The application was developed iteratively with the following key milestones:

1. **Initial Setup**: Created basic component structure and UI layout
2. **Model Selection**: Implemented model selection with a limit of 4 models
3. **Chat Interface**: Added chat input and message display
4. **Response Comparison**: Implemented side-by-side model response display
5. **UI Enhancements**: Improved visual design and user experience
6. **Chat History**: Added collapsible sidebar for chat history
7. **Increased Capacity**: Expanded model selection limit from 4 to 10, then to 16
8. **Responsive Design**: Ensured proper behavior across different states and screen sizes

## Technical Decisions

- **Single Row Model Selection**: Optimized for horizontal scrolling to save vertical space
- **Collapsible UI Elements**: Maximized available space for the chat interface
- **Delayed Response Simulation**: Added realistic timing for model responses
- **Component Modularity**: Designed components for reusability and maintainability
- **Visual Feedback**: Implemented clear state indicators throughout the UI
