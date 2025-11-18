/**
 * Main application initialization
 */

// Initialize the application when DOM is ready
const THEME_STORAGE_KEY = 'station-viewer-theme';

document.addEventListener('DOMContentLoaded', function() {
    console.log('Station Viewer initializing...');

    initializeThemeControls();
    initializeGlobalEventHandlers();
    initializeMobileNavigation();

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

    const toggleButtons = document.querySelectorAll('[data-theme-toggle]');
    if (!toggleButtons.length) {
        return;
    }

    toggleButtons.forEach(button => {
        button.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
            const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
            applyTheme(nextTheme);
            localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
        });
    });
}

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const toggleButtons = document.querySelectorAll('[data-theme-toggle]');
    const label = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
    toggleButtons.forEach(button => {
        button.textContent = label;
        button.setAttribute('aria-pressed', theme === 'dark');
    });
}

function initializeMobileNavigation() {
    const menuToggle = document.getElementById('mobile-menu-toggle');
    const drawer = document.querySelector('#navbar .nav-left');
    const backdrop = document.getElementById('mobile-menu-backdrop');
    const root = document.documentElement;

    if (!menuToggle || !drawer || !backdrop) {
        return;
    }

    const originalParent = drawer.parentElement;
    const drawerPlaceholder = document.createComment('mobile-drawer-placeholder');
    originalParent.insertBefore(drawerPlaceholder, drawer.nextSibling);
    let drawerDetached = false;

    const attachDrawerToBody = () => {
        if (!drawerDetached) {
            document.body.appendChild(drawer);
            drawerDetached = true;
        }
    };

    const restoreDrawer = () => {
        if (drawerDetached && drawerPlaceholder.parentNode) {
            drawerPlaceholder.parentNode.insertBefore(drawer, drawerPlaceholder);
            drawerDetached = false;
        }
    };

    const closeDrawer = () => {
        document.body.classList.remove('mobile-drawer-open');
        root.classList.remove('mobile-drawer-open');
        menuToggle.setAttribute('aria-expanded', 'false');
        menuToggle.classList.remove('is-active');
        drawer.classList.remove('drawer-open');
        drawer.style.transform = '';
        restoreDrawer();
    };

    const openDrawer = () => {
        attachDrawerToBody();
        document.body.classList.add('mobile-drawer-open');
        root.classList.add('mobile-drawer-open');
        menuToggle.setAttribute('aria-expanded', 'true');
        menuToggle.classList.add('is-active');
        drawer.classList.add('drawer-open');
        drawer.style.transform = 'translateX(0)';
    };

    const toggleDrawer = () => {
        if (document.body.classList.contains('mobile-drawer-open')) {
            closeDrawer();
        } else {
            openDrawer();
        }
    };

    menuToggle.addEventListener('click', toggleDrawer);
    backdrop.addEventListener('click', closeDrawer);

    window.addEventListener('resize', () => {
        if (window.innerWidth > 768) {
            closeDrawer();
            drawer.style.transform = '';
        } else if (document.body.classList.contains('mobile-drawer-open')) {
            attachDrawerToBody();
        }
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            closeDrawer();
        }
    });

    drawer.addEventListener('click', (event) => {
        const link = event.target.closest('a');
        if (link) {
            closeDrawer();
        }
    });
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
