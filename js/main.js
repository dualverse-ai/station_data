/**
 * Main application initialization
 */

// Initialize the application when DOM is ready
const THEME_STORAGE_KEY = 'station-viewer-theme';

document.addEventListener('DOMContentLoaded', function() {
    console.log('Station Viewer initializing...');

    initializeThemeControls();
    initializeGlobalEventHandlers();

    // The router will automatically handle the initial route
    // based on the current hash
});

/**
 * Initialize global event handlers
 */
function initializeGlobalEventHandlers() {
    // Handle errors globally
    window.addEventListener('error', function(event) {
        console.error('Global error:', event.error);
    });

    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', function(event) {
        console.error('Unhandled promise rejection:', event.reason);
    });
}

function initializeThemeControls() {
    const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    const resolvedTheme = storedTheme || 'light';
    applyTheme(resolvedTheme);

    const toggleButton = document.getElementById('theme-toggle');
    if (!toggleButton) {
        return;
    }

    toggleButton.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
        const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
        applyTheme(nextTheme);
        localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    });
}

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const toggleButton = document.getElementById('theme-toggle');
    if (toggleButton) {
        const label = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
        toggleButton.textContent = label;
        toggleButton.setAttribute('aria-pressed', theme === 'dark');
    }
}

/**
 * Update data loader to handle shortened station IDs
 */
DataLoader.prototype.getFullStationId = function(shortId) {
    // Use station map instance if available
    if (window.stationMap && window.stationMap.getFullId) {
        return window.stationMap.getFullId(shortId) || shortId;
    }
    // Fallback to direct map
    else if (window.stationIdMap) {
        return window.stationIdMap[shortId] || shortId;
    }

    // If station map not loaded, return as-is
    console.warn('Station ID map not loaded. Please run scripts/generate_indices.py');
    return shortId;
};

// Override DataLoader constructor to handle short IDs
const OriginalDataLoader = DataLoader;
DataLoader = function(stationId) {
    // Convert short ID to full ID
    const fullId = DataLoader.prototype.getFullStationId(stationId);
    return new OriginalDataLoader(fullId);
};
DataLoader.prototype = OriginalDataLoader.prototype;

console.log('Station Viewer ready');
