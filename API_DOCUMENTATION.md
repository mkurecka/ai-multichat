# AI Multichat API Documentation

This document outlines the API endpoints available for the AI Multichat frontend application.

**Base Path:** `/api`

**Authentication:** All endpoints under `/api` (unless explicitly marked public) require an authenticated user (`ROLE_USER`). Authentication is handled via **JSON Web Tokens (JWT)**.

**Obtaining a JWT:**
Currently, the **only implemented method** to obtain a JWT for API usage is via the **Google OAuth 2.0 flow**. There is no standard username/password login endpoint (like `/api/login_check`) configured for the API.

**Google OAuth 2.0 API Flow (Primary Method):**
Users must authenticate via Google specifically for the API to obtain a JWT.

1.  **Frontend Initiates Google Login:** The frontend redirects the user's browser to Google's OAuth 2.0 endpoint. This requires the Google Client ID configured on the backend and a `redirect_uri` that points back to the frontend application (this URI must be registered in the Google Cloud Console for your Client ID).
    *   *Example Redirect (Conceptual):* `https://accounts.google.com/o/oauth2/v2/auth?client_id=YOUR_GOOGLE_CLIENT_ID&redirect_uri=YOUR_FRONTEND_REDIRECT_URI&response_type=code&scope=email%20profile`
2.  **User Authenticates & Grants Consent:** The user logs into Google and approves the requested permissions (email, profile).
3.  **Google Redirects to Frontend:** Google redirects the browser back to the frontend's `redirect_uri`, appending an `authorization code` (e.g., `YOUR_FRONTEND_REDIRECT_URI?code=GOOGLE_AUTHORIZATION_CODE`).
4.  **Frontend Sends Code to Backend:** The frontend extracts the `code` from the URL query parameters and sends it in a POST request to the backend API callback endpoint.
    *   **Endpoint:** `POST /api/auth/google/callback`
    *   **Request Body:** `application/json`
        ```json
        {
          "code": "GOOGLE_AUTHORIZATION_CODE",
          "redirectUri": "YOUR_FRONTEND_REDIRECT_URI" // Required: Must match the redirect_uri used in step 1
        }
        ```
5.  **Backend Exchanges Code & Returns JWT:** The backend endpoint (`/api/auth/google/callback`) receives the code and redirectUri, verifies them with Google, fetches the user's profile, finds or creates the corresponding user in the application database, and generates a JWT for that user.
    *   **Response Body:** `application/json`
        ```json
        {
          "token": "GENERATED_JWT_TOKEN"
        }
        ```
    *   **Error Responses:**
        *   `400 Bad Request`: Missing `code` or `redirectUri` in the request body.
        *   `401 Unauthorized`: Invalid `code`, `redirectUri` mismatch, user not found in the database (and auto-creation is disabled), or other Google authentication error ("Invalid state" might occur if redirectUri is incorrect).
        *   `500 Internal Server Error`: Backend issue during code exchange or JWT generation.
6.  **Frontend Stores and Uses JWT:** The frontend receives the JWT from the response and must store it securely (e.g., in `localStorage`).
7.  **Using the JWT:** For all subsequent requests to protected `/api` endpoints, the frontend must include the token in the `Authorization` header:
    ```
    Authorization: Bearer <your_jwt_token>
    ```
8.  **Backend Validation:** The `JWTAuthenticator` on the backend validates the token and identifies the user for the request.

**Session Authentication (Fallback/Same-Domain):** Due to the configuration (`stateless: false`, `context: main`), API requests might also be authenticated via the standard web session cookie *if* the request originates from a browser already logged into the main application on the same domain. However, the **JWT method obtained via Google OAuth is the standard approach** for separate frontend applications.

---

## Chat Endpoints (`src/Controller/ChatController.php`)

These endpoints handle chat interactions, model management, and history retrieval.

### 1. Get Available Models

*   **Endpoint:** `GET /models`
*   **Description:** Retrieves the list of available and enabled AI models configured in the system.
*   **Request:** None.
*   **Response:** `200 OK`
    *   **Content-Type:** `application/json`
    *   **Body:** Array of model objects.
        ```json
        [
          {
            "id": "string (e.g., 'openai/gpt-4')", // Unique identifier for the model
            "name": "string", // User-friendly name
            "description": "string",
            "provider": "string", // Source provider (e.g., 'OpenAI', 'Anthropic')
            "selected": false, // Always false in this response, frontend manages selection state
            "pricing": { // Estimated pricing information
              "prompt": "number | null", // Cost per prompt token/unit
              "completion": "number | null", // Cost per completion token/unit
              "unit": "string (e.g., 'tokens')" // Unit of pricing
            },
            "supportsStreaming": "boolean" // Whether the model supports streaming responses
          },
          // ... more models
        ]
        ```

### 2. Refresh Model List (Admin/Internal Use)

*   **Endpoint:** `GET /models/refresh`
*   **Description:** Triggers a refresh of the AI model list from the underlying provider (e.g., OpenRouter) and updates the database. Primarily for administrative purposes.
*   **Request:** None.
*   **Response:** `200 OK`
    *   **Content-Type:** `application/json`
    *   **Body:** Status message or details about the refresh operation (exact format depends on backend implementation).

### 3. Send Chat Message

*   **Endpoint:** `POST /chat`
*   **Description:** Sends a user prompt using a specified template to the associated AI model. Can initiate a new chat thread or continue an existing one. Supports streaming responses.
*   **Request:**
    *   **Content-Type:** `application/json`
    *   **Body:**
        ```json
        {
          "userInput": "string", // Required: The user's message text.
          "templateId": "integer", // Required: The ID of the PromptTemplate to use.
          "promptId": "string", // Required: A unique ID generated by the frontend for this specific prompt instance (used for correlating stream messages).
          "threadId": "string | null", // Optional: ID of the thread to continue. If null/omitted, a new thread is created.
          "stream": "boolean" // Optional (default: false): Request a streaming response if the model supports it.
        }
        ```
*   **Response (Non-Streaming):** `200 OK`
    *   **Content-Type:** `application/json`
    *   **Body:**
        ```json
        {
          "responses": {
            "string (modelId)": { // Key is the model ID used (e.g., 'openai/gpt-4')
              "content": "string", // AI response text
              "usage": { // Token usage information
                "prompt_tokens": "integer",
                "completion_tokens": "integer",
                "total_tokens": "integer"
              },
              "error": "string | null" // Present if an error occurred for this model's response
            }
            // Currently only one response based on the template's model
          },
          "threadId": "string", // ID of the thread (new or existing)
          "promptId": "string" // The promptId passed in the request, for confirmation
        }
        ```
*   **Response (Streaming):** `200 OK`
    *   **Content-Type:** `text/event-stream`
    *   **Body:** Server-Sent Events (SSE). Each message is formatted as `data: <json_payload>\n\n`.
        *   *Payload for content delta:*
            ```json
            {
              "content": "string", // Chunk of the AI response text
              "modelId": "string", // Model ID generating the response
              "threadId": "string", // Thread ID
              "promptId": "string" // The promptId passed in the request, for matching
            }
            ```
        *   *Payload for errors (example):*
            ```json
            {
              "error": "string", // Error message
              "modelId": "string"
            }
            ```
        *   *Stream termination:* The stream ends with the message `data: [DONE]\n\n`.
*   **Error Responses:**
    *   `400 Bad Request`: Missing required fields (`userInput`, `templateId`, `promptId`), invalid `templateId`, associated model is disabled, etc.
    *   `403 Forbidden`: User doesn't have permission to use the specified `templateId`.
    *   `404 Not Found`: `templateId` or `threadId` (if provided) not found.
    *   `500 Internal Server Error`: Template has no associated AI model, error communicating with the AI provider.

### 4. Get Chat History (All Threads)

*   **Endpoint:** `GET /chat/history`
*   **Description:** Retrieves all chat threads and their messages for the current user.
*   **Request:** None.
*   **Response:** `200 OK`
    *   **Content-Type:** `application/json`
    *   **Body:** Array of thread objects, sorted by creation date (newest first).
        ```json
        [
          {
            "id": "integer", // Database ID of the thread
            "title": "string", // Thread title (often derived from the first message)
            "messages": [ // Array of prompt/response groups within the thread, sorted oldest first
              {
                "prompt": "string", // User's prompt text for this turn
                "responses": { // AI responses for this prompt, keyed by model ID
                  "string (modelId)": {
                    "content": "string", // AI response content
                    "usage": { /* ... usage object ... */ } // Token usage
                  }
                  // ... potentially responses from other models if applicable
                },
                "createdAt": "string (Y-m-d H:i:s)", // Timestamp of the first response in this group
                "promptId": "string" // Unique ID for this prompt instance
              },
              // ... more message groups
            ],
            "threadId": "string", // Unique string identifier for the thread
            "createdAt": "string (Y-m-d H:i:s)" // Thread creation timestamp
          },
          // ... more threads
        ]
        ```

### 5. Get Specific Thread History

*   **Endpoint:** `GET /chat/thread/{threadId}`
*   **Description:** Retrieves the messages for a specific chat thread identified by its `threadId`.
*   **Request:** URL parameter `threadId` (string).
*   **Response:** `200 OK`
    *   **Content-Type:** `application/json`
    *   **Body:**
        ```json
        {
          "messages": [ /* ... same structure as messages array in /chat/history ... */ ],
          "threadId": "string" // The requested threadId
        }
        ```
*   **Error Responses:**
    *   `404 Not Found`: Thread with the given `threadId` not found or not accessible by the user.

### 6. Create New Chat Thread

*   **Endpoint:** `POST /chat/thread`
*   **Description:** Creates a new, empty chat thread for the user. The frontend should call this before the first message in a new conversation if it needs a `threadId` beforehand. Alternatively, sending the first message via `POST /chat` without a `threadId` will also create a new thread.
*   **Request:** None.
*   **Response:** `200 OK`
    *   **Content-Type:** `application/json`
    *   **Body:**
        ```json
        {
          "threadId": "string" // The unique string ID of the newly created thread
        }
        ```

### 7. Get Thread Costs

*   **Endpoint:** `GET /chat/costs`
*   **Description:** Retrieves aggregated cost and usage statistics for each of the user's chat threads. Useful for displaying usage summaries.
*   **Request:** None.
*   **Response:** `200 OK`
    *   **Content-Type:** `application/json`
    *   **Body:** Array of thread cost objects, sorted by thread creation date (newest first).
        ```json
        [
          {
            "threadId": "string",
            "title": "string",
            "messageCount": "integer", // Number of prompt/response turns in the thread
            "lastMessageDate": "string (Y-m-d H:i:s)", // Note: Currently reflects thread creation date, may change
            "totalCost": "float", // Estimated total cost for the thread
            "totalTokens": "integer" // Total tokens (prompt + completion) used in the thread
          },
          // ... more thread cost objects
        ]
        ```

---

## Prompt Template API Endpoints (`src/Controller/ApiPromptTemplateController.php`)

These endpoints allow for programmatic management (CRUD) of Prompt Templates.

**Base Path:** `/api/prompt-templates`

**Authentication:** Requires authenticated user (`ROLE_USER`). Specific actions might require `ROLE_ORGANIZATION_ADMIN` as detailed below and enforced by the `PromptTemplateVoter`.

### 1. List Prompt Templates

*   **Endpoint:** `GET /`
*   **Description:** Retrieves a list of prompt templates accessible to the current user (their private templates and templates belonging to their organization).
*   **Request:** None.
*   **Response:** `200 OK`
    *   **Content-Type:** `application/json`
    *   **Body:** Array of PromptTemplate objects. The exact fields depend on serialization configuration (groups TBD). Example structure:
        ```json
        [
          {
            "id": 1,
            "name": "My Private Template",
            "description": "A template just for me.",
            "scope": "private",
            "associatedModel": { /* ... model details ... */ },
            "messages": [ /* ... message objects ... */ ],
            "owner": { /* ... owner details ... */ },
            "organization": { /* ... org details ... */ },
            "createdAt": "...",
            "updatedAt": "..."
          },
          {
            "id": 5,
            "name": "Standard Org Template",
            "description": "Template for everyone in the org.",
            "scope": "organization",
            // ... other fields
          }
        ]
        ```

### 2. Create Prompt Template

*   **Endpoint:** `POST /`
*   **Description:** Creates a new prompt template. Defaults to `private` scope unless the user is `ROLE_ORGANIZATION_ADMIN` and specifies `organization` scope.
*   **Request:**
    *   **Content-Type:** `application/json`
    *   **Body:** PromptTemplate object structure. `owner` and `organization` are set automatically. `id`, `createdAt`, `updatedAt` should be omitted.
        ```json
        {
          "name": "string (required)",
          "description": "string (optional)",
          "scope": "private | organization (optional, defaults to private, requires ROLE_ORGANIZATION_ADMIN for organization)",
          "associatedModel": { "id": "integer" }, // Required: Provide the DB ID of the associated Model entity
          "messages": [ // Required: At least one message
            {
              "role": "system | user | assistant (required)",
              "content": "string (required)"
              // 'id' should be omitted for new messages
            }
            // ... more messages
          ]
        }
        ```
*   **Response:** `201 Created`
    *   **Content-Type:** `application/json`
    *   **Body:** The newly created PromptTemplate object, including its assigned `id`.
*   **Error Responses:**
    *   `400 Bad Request`: Invalid JSON, validation errors (e.g., missing required fields), user not in an organization.
    *   `403 Forbidden`: User attempts to set `organization` scope without `ROLE_ORGANIZATION_ADMIN`.
    *   `500 Internal Server Error`: Database error.

### 3. Get Specific Prompt Template

*   **Endpoint:** `GET /{id}`
*   **Description:** Retrieves details of a specific prompt template by its ID.
*   **Request:** URL parameter `id` (integer).
*   **Response:** `200 OK`
    *   **Content-Type:** `application/json`
    *   **Body:** The requested PromptTemplate object.
*   **Error Responses:**
    *   `403 Forbidden`: User does not have permission to view this template (checked by `PromptTemplateVoter`).
    *   `404 Not Found`: Template with the given `id` not found.

### 4. Update Prompt Template (Partial)

*   **Endpoint:** `PATCH /{id}`
*   **Description:** Updates specific fields of an existing prompt template. Use this for partial updates. Note: Updating nested collections like `messages` via PATCH can be complex and might require specific handling (e.g., sending the full intended `messages` array or using a different approach if only adding/removing individual messages). The current implementation might overwrite the messages collection based on the input.
*   **Request:**
    *   **Content-Type:** `application/json`
    *   **Body:** Object containing the fields to update.
        ```json
        {
          "name": "Updated Template Name", // Example: update name
          "description": "New description", // Example: update description
          "messages": [ // Example: replacing messages (careful!)
             { "id": 10, "role": "system", "content": "Updated system prompt" }, // Update existing message
             { "role": "user", "content": "New user message" } // Add new message (omit id)
          ]
          // Include other fields to update ('scope', 'associatedModel.id')
        }
        ```
*   **Response:** `200 OK`
    *   **Content-Type:** `application/json`
    *   **Body:** The updated PromptTemplate object.
*   **Error Responses:**
    *   `400 Bad Request`: Invalid JSON, validation errors.
    *   `403 Forbidden`: User does not have permission to edit this template (checked by `PromptTemplateVoter`), or attempts invalid scope change.
    *   `404 Not Found`: Template with the given `id` not found.
    *   `500 Internal Server Error`: Database error.

### 5. Delete Prompt Template

*   **Endpoint:** `DELETE /{id}`
*   **Description:** Deletes a specific prompt template by its ID.
*   **Request:** URL parameter `id` (integer).
*   **Response:** `204 No Content` (Successful deletion)
*   **Error Responses:**
    *   `403 Forbidden`: User does not have permission to delete this template (checked by `PromptTemplateVoter`).
    *   `404 Not Found`: Template with the given `id` not found.
    *   `500 Internal Server Error`: Database error.

---

**Important Considerations:**

*   **Serialization Groups:** The exact fields returned in JSON responses depend on how Symfony Serializer groups are configured on the `PromptTemplate` and related entities. These might need refinement (`template:read`, `template:write`, `template:read:messages`, etc.).
*   **PATCHing Collections:** Updating the `messages` collection via PATCH requires careful implementation on the backend and clear documentation on how the frontend should structure the request (e.g., does it replace the whole collection, or merge?). The current controller implementation might replace the collection.
*   **Error Handling:** Specific error messages might vary.

---
