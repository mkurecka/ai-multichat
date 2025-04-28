/**
 * Service for handling streaming responses
 */
export default class StreamingService {
    /**
     * Send a streaming request and process the response
     *
     * @param {Object} params - Request parameters
     * @param {Function} onChunk - Callback for each chunk of content
     * @param {Function} onThreadId - Callback when thread ID is received
     * @param {Function} onComplete - Callback when streaming is complete
     * @param {Function} onError - Callback when an error occurs
     */
    sendStreamingRequest(params, onChunk, onThreadId, onComplete, onError) {
        const controller = new AbortController();
        const signal = controller.signal;
        let streamContent = '';

        // Make the POST request with Symfony session authentication
        fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'text/event-stream',
                'X-Requested-With': 'XMLHttpRequest'
            },
            credentials: 'include',
            body: JSON.stringify({
                ...params,
                stream: true
            }),
            signal: signal
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            // Get a reader from the response body stream
            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            // Function to process the stream
            const processStream = ({ done, value }) => {
                if (done) {
                    console.log('Stream complete');
                    onComplete(streamContent);
                    return;
                }

                // Decode the chunk and process it
                const chunk = decoder.decode(value, { stream: true });
                console.log('Received chunk:', chunk);

                // Process each line in the chunk
                const lines = chunk.split('\n');
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.substring(6);
                        if (data === '[DONE]') {
                            console.log('Received [DONE] message');
                            onComplete(streamContent);
                            return;
                        }

                        try {
                            const event = JSON.parse(data);
                            console.log('Parsed event:', event);

                            // Process the event
                            if (event.content) {
                                streamContent += event.content;
                                onChunk(streamContent);
                            }

                            // If we have a thread ID, update it
                            if (event.threadId) {
                                onThreadId(event.threadId);
                            }
                        } catch (error) {
                            console.error('Error parsing streaming data:', error, data);
                        }
                    }
                }

                // Continue reading the stream
                return reader.read().then(processStream);
            };

            // Start reading the stream
            return reader.read().then(processStream);
        })
        .catch(error => {
            console.error('Error with streaming request:', error);
            onError(error, streamContent);
        });

        // Set a timeout to abort the request if it takes too long
        const timeout = setTimeout(() => {
            console.log('Aborting streaming request after timeout');
            controller.abort();
        }, 60000); // 1 minute timeout as a safety measure

        // Return the controller so it can be aborted externally if needed
        return {
            abort: () => {
                clearTimeout(timeout);
                controller.abort();
            }
        };
    }
}
