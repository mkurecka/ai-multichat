import { Controller } from '@hotwired/stimulus';

/*
 * Device detection controller
 * Handles:
 * - Detecting mobile vs desktop devices
 * - Redirecting to the appropriate layout
 */
export default class extends Controller {
    static values = {
        mobileUrl: String,
        desktopUrl: String,
        currentLayout: String // 'mobile' or 'desktop'
    };

    connect() {
        console.log('Device controller connected');

        // Add a small delay to ensure the page is fully loaded
        setTimeout(() => {
            this.checkDeviceAndRedirect();
        }, 100);

        // Listen for window resize events to handle orientation changes
        window.addEventListener('resize', this.debouncedCheckDevice.bind(this));
    }

    disconnect() {
        // Remove event listener when controller disconnects
        window.removeEventListener('resize', this.debouncedCheckDevice.bind(this));
    }

    // Debounce function to prevent too many checks during resize
    debouncedCheckDevice() {
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }

        this.debounceTimer = setTimeout(() => {
            // Only redirect if the layout needs to change
            const isMobile = this.isMobileDevice();
            const currentLayout = this.currentLayoutValue;

            if ((isMobile && currentLayout !== 'mobile') || (!isMobile && currentLayout !== 'desktop')) {
                this.checkDeviceAndRedirect();
            }
        }, 250); // Wait 250ms after resize stops
    }

    checkDeviceAndRedirect() {
        const isMobile = this.isMobileDevice();
        const currentLayout = this.currentLayoutValue;

        // Only redirect if we need to switch layouts
        if (isMobile && currentLayout !== 'mobile') {
            window.location.href = this.mobileUrlValue;
        } else if (!isMobile && currentLayout !== 'desktop') {
            window.location.href = this.desktopUrlValue;
        }
    }

    isMobileDevice() {
        // Primary check: screen width less than 768px (standard tablet breakpoint)
        if (window.innerWidth < 768) {
            return true;
        }

        // Secondary check: check for touch capability on smaller screens
        if (window.innerWidth < 1024 && ('ontouchstart' in window || navigator.maxTouchPoints > 0)) {
            return true;
        }

        return false;
    }

    // Method that can be called from links to force desktop view
    forceDesktopView(event) {
        event.preventDefault();
        window.location.href = this.desktopUrlValue;
    }

    // Method that can be called from links to force mobile view
    forceMobileView(event) {
        event.preventDefault();
        window.location.href = this.mobileUrlValue;
    }
}
