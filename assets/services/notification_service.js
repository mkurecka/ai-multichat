/**
 * Service for handling notifications
 */
export default class NotificationService {
    /**
     * Show a notification
     * @param {string} message - Notification message
     * @param {string} type - Notification type (warning, error, info, success)
     * @param {number} duration - Duration in milliseconds
     */
    showNotification(message, type = 'warning', duration = 3000) {
        // Create a notification element
        const notification = document.createElement('div');

        // Determine background color based on notification type
        let bgColorClass = 'bg-yellow-500';
        if (type === 'error') bgColorClass = 'bg-red-500';
        if (type === 'info') bgColorClass = 'bg-blue-500';
        if (type === 'success') bgColorClass = 'bg-green-500';

        notification.classList.add(
            'fixed', 'bottom-4', 'left-1/2', 'transform', '-translate-x-1/2',
            'px-4', 'py-2', 'rounded', 'shadow-lg', 'z-50', 'text-white',
            bgColorClass, 'flex', 'items-center', 'space-x-2'
        );

        // For longer messages, add max-width and allow text wrapping
        if (message.length > 100 || message.includes('\n')) {
            notification.classList.add('max-w-lg');
            notification.style.whiteSpace = 'pre-wrap';
            notification.style.textAlign = 'left';
        }

        // Add an icon based on the notification type
        let iconSvg = '';
        if (type === 'warning') {
            iconSvg = '<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>';
        } else if (type === 'error') {
            iconSvg = '<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>';
        } else if (type === 'info') {
            iconSvg = '<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>';
        } else if (type === 'success') {
            iconSvg = '<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>';
        }

        // Add a close button for longer notifications
        const closeButton = duration > 5000 ? '<button class="ml-2 text-white hover:text-gray-200" onclick="this.parentElement.remove();">×</button>' : '';

        notification.innerHTML = `
            <div class="flex-shrink-0">${iconSvg}</div>
            <div>${message}</div>
            ${closeButton}
        `;

        // Add to the DOM
        document.body.appendChild(notification);

        // Add entrance animation
        notification.classList.add('animate-notification-in');

        // Remove after specified duration
        setTimeout(() => {
            notification.classList.add('opacity-0', 'transition-opacity', 'duration-500');
            setTimeout(() => notification.remove(), 500);
        }, duration);
    }
}
