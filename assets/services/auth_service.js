import axios from 'axios';

/**
 * Service for handling authentication-related functionality
 */
export default class AuthService {
    constructor(apiService) {
        this.apiService = apiService;
        this.api = apiService.getApiInstance();
        this.isAuthenticated = false;
        this.userEmail = '';
    }

    /**
     * Initialize authentication state
     * @param {boolean} initialAuthState - Initial authentication state from template
     * @param {string} userEmail - User email from template
     */
    initialize(initialAuthState, userEmail) {
        console.log('Initializing auth service with state:', initialAuthState);
        console.log('User email from template:', userEmail);
        this.isAuthenticated = initialAuthState;
        this.userEmail = userEmail;
    }

    /**
     * Check if the user is authenticated
     * @param {boolean} dataAttrValue - Authentication value from data attribute
     * @returns {boolean} Authentication status
     */
    isUserAuthenticated(dataAttrValue) {
        console.log('Checking authentication status:', this.isAuthenticated);
        console.log('Data attribute authentication value:', dataAttrValue);

        // If either is true, consider the user authenticated
        const isAuth = this.isAuthenticated || dataAttrValue;
        console.log('Final authentication decision:', isAuth);

        // Update the service value to match
        if (isAuth) {
            this.isAuthenticated = true;
        }

        return isAuth;
    }

    /**
     * Verify authentication with the server
     * @param {boolean} dataAttrValue - Authentication value from data attribute
     * @returns {Promise<boolean>} Authentication status
     */
    async verifyAuthentication(dataAttrValue) {
        console.log('Verifying authentication...');
        console.log('Current authentication value:', this.isAuthenticated);
        console.log('Template data attribute:', dataAttrValue);

        // Force authentication to true if it's set in the template
        if (dataAttrValue === true) {
            console.log('Forcing authentication to true based on template data attribute');
            this.isAuthenticated = true;
        }

        try {
            // Make a test API call to verify the session is working
            try {
                console.log('Making test API call to verify session...');
                const response = await this.api.get('/models');
                console.log('Test API call successful:', response.data);

                // If we get here, the session is working
                this.isAuthenticated = true;
                console.log('Session verified via API call');
            } catch (apiError) {
                console.error('Test API call failed:', apiError);

                // If the template says we're authenticated but the API call fails,
                // we might have a session issue
                if (dataAttrValue === true) {
                    console.warn('Template says authenticated but API call failed - possible session issue');
                    // We'll still try to proceed with the template's authentication value
                } else {
                    // If the template doesn't say we're authenticated and the API call fails,
                    // we're definitely not authenticated
                    this.isAuthenticated = false;
                }
            }

            console.log('Authentication value after verification:', this.isAuthenticated);
            return this.isAuthenticated;
        } catch (error) {
            console.error('Error during authentication verification:', error);
            this.isAuthenticated = false;
            return false;
        }
    }

    /**
     * Test the session with an API call
     * @param {boolean} dataAttrValue - Authentication value from data attribute
     * @returns {Promise<Object>} Test result
     */
    async testSessionWithApi(dataAttrValue) {
        console.log('Testing Symfony session with API call...');

        // Force authentication to true if it's set in the template
        if (dataAttrValue === true) {
            console.log('Forcing authentication to true based on template data attribute');
            this.isAuthenticated = true;
        }

        // Show current authentication state
        const authState = {
            controllerValue: this.isAuthenticated,
            templateDataAttribute: dataAttrValue,
            userEmail: this.userEmail || 'Not available'
        };

        console.log('Current authentication state:', authState);

        try {
            // Make a simple API call to test the session
            const response = await this.api.get('/models');
            console.log('API test response:', response);
            
            // If the API call was successful, try to verify authentication again
            await this.verifyAuthentication(dataAttrValue);
            
            return {
                success: true,
                message: 'API call successful! Symfony session is working.',
                data: response.data
            };
        } catch (error) {
            console.error('API test failed:', error);
            let errorMessage = 'API call failed. Symfony session may be invalid.';

            if (axios.isAxiosError(error)) {
                errorMessage += `\nStatus: ${error.response?.status || 'unknown'}`;
                errorMessage += `\nMessage: ${error.response?.data?.message || error.message || 'No details'}`;

                // If we got a 401, the session is likely invalid
                if (error.response?.status === 401) {
                    errorMessage += '\n\nYour session appears to be invalid. Please try logging in again.';
                }
            }

            return {
                success: false,
                message: errorMessage,
                error
            };
        }
    }

    /**
     * Logout the user
     */
    logout() {
        console.log('Logging out...');
        // For Symfony session auth, we need to redirect to the logout route
        window.location.href = '/logout';
    }
}
