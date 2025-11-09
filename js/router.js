/**
 * Simple hash-based router for the Station Viewer SPA
 */

class Router {
    constructor() {
        this.routes = {};
        this.currentRoute = null;
        this.currentStationId = null;

        // Bind event listeners
        window.addEventListener('hashchange', () => this.handleRoute());
        window.addEventListener('load', () => this.handleRoute());
    }

    /**
     * Register a route handler
     */
    register(pattern, handler) {
        this.routes[pattern] = handler;
    }

    /**
     * Navigate to a new route
     */
    navigate(path) {
        window.location.hash = path;
    }

    /**
     * Parse the current hash and route to appropriate handler
     */
    async handleRoute() {
        const hash = window.location.hash.slice(1) || '/';

        // Parse the route
        const parts = hash.split('/').filter(p => p);

        // Dashboard route (station selection)
        if (parts.length === 0) {
            this.currentStationId = null;
            this.showDashboard();
            return;
        }

        // Extract station ID (first 8 chars)
        const stationId = parts[0];
        this.currentStationId = stationId;

        // Station-specific routes
        if (parts.length === 1) {
            // Default to agents page when entering a station
            this.navigate(`#/${stationId}/agents`);
            return;
        }

        const page = parts[1];
        const subpage = parts[2] || null;
        const id = parts[3] || null;

        // Update navigation
        this.updateNavigation(page);

        // Route to appropriate handler
        try {
            switch (page) {
                case 'agents':
                    if (subpage) {
                        await this.showAgentDetail(stationId, subpage);
                    } else {
                        await this.showAgentsList(stationId);
                    }
                    break;

                case 'evaluations':
                    if (subpage) {
                        await this.showEvaluationDetail(stationId, subpage);
                    } else {
                        await this.showEvaluationsList(stationId);
                    }
                    break;

                case 'archive':
                    if (subpage) {
                        await this.showArchiveDetail(stationId, subpage);
                    } else {
                        await this.showArchiveList(stationId);
                    }
                    break;

                case 'memory':
                    // Handle memory routes with subpage for type (public/private)
                    if (subpage === 'public') {
                        if (id) {
                            await this.showMemoryDetail(stationId, 'public', id);
                        } else {
                            await this.showMemoryList(stationId, 'public');
                        }
                    } else if (subpage === 'private') {
                        if (id) {
                            await this.showMemoryDetail(stationId, 'private', id);
                        } else {
                            await this.showMemoryList(stationId, 'private');
                        }
                    } else {
                        // Default to public memory if no type specified
                        this.navigate(`#/${stationId}/memory/public`);
                    }
                    break;

                // Keep legacy routes for backward compatibility
                case 'memory-public':
                    if (subpage) {
                        await this.showMemoryDetail(stationId, 'public', subpage);
                    } else {
                        await this.showMemoryList(stationId, 'public');
                    }
                    break;

                case 'memory-private':
                    if (subpage) {
                        await this.showMemoryDetail(stationId, 'private', subpage);
                    } else {
                        await this.showMemoryList(stationId, 'private');
                    }
                    break;

                case 'mail':
                    if (subpage) {
                        await this.showMailDetail(stationId, subpage);
                    } else {
                        await this.showMailList(stationId);
                    }
                    break;

                default:
                    this.showError('Page not found');
            }
        } catch (error) {
            console.error('Route error:', error);
            this.showError(`Error loading page: ${error.message}`);
        }
    }

    /**
     * Update navigation bar state
     */
    updateNavigation(activePage) {
        // Remove dashboard-specific body class
        document.body.classList.remove('dashboard-view');

        const navbar = document.getElementById('navbar');
        const navLinks = navbar.querySelectorAll('.nav-links a');

        // Show navbar
        navbar.style.display = 'flex';

        // Update active link
        navLinks.forEach(link => {
            const page = link.getAttribute('data-page');
            if (page === activePage) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }

            // Update href with station ID
            if (this.currentStationId) {
                link.href = `#/${this.currentStationId}/${page}`;
            }
        });

        // Update station info
        this.updateStationInfo(this.currentStationId);
    }

    /**
     * Update station name and tick in navbar
     */
    async updateStationInfo(stationId) {
        if (!stationId) return;

        try {
            const dataLoader = new DataLoader(stationId);
            const config = await dataLoader.loadYAML('station_config.yaml');

            // Update the dropdown selector
            await this.populateStationDropdown(stationId);

            // Update end tick display
            document.getElementById('end-tick').textContent = config.current_tick || '0';
        } catch (error) {
            console.error('Error loading station info:', error);
        }
    }

    /**
     * Populate station dropdown with all available stations
     */
    async populateStationDropdown(currentStationId) {
        const selector = document.getElementById('station-selector');
        if (!selector) return;

        // Clear existing options
        selector.innerHTML = '';

        try {
            // Get all stations from station map
            const stations = await stationMap.getStations();

            // Add options in same order as dashboard
            for (const station of stations) {
                const option = document.createElement('option');
                option.value = station.id;
                option.textContent = station.name;

                // Select current station
                if (station.id === currentStationId) {
                    option.selected = true;
                }

                selector.appendChild(option);
            }

            // Add change handler if not already added
            if (!selector.hasAttribute('data-listener-added')) {
                selector.setAttribute('data-listener-added', 'true');
                selector.addEventListener('change', (e) => {
                    this.handleStationSwitch(e.target.value);
                });
            }
        } catch (error) {
            console.error('Error populating station dropdown:', error);
        }
    }

    /**
     * Handle station switching from dropdown
     */
    handleStationSwitch(newStationId) {
        // Get current page type from URL
        const hash = window.location.hash;
        const parts = hash.slice(2).split('/');

        // If we have a page type (not just station), preserve it
        if (parts.length >= 2) {
            const pageType = parts[1];
            // Navigate to same page type on new station
            window.location.hash = `#/${newStationId}/${pageType}`;
        } else {
            // Just go to agents page by default
            window.location.hash = `#/${newStationId}/agents`;
        }
    }

    /**
     * Show the dashboard (station selection)
     */
    async showDashboard() {
        // Add dashboard-specific body class
        document.body.classList.add('dashboard-view');

        const navbar = document.getElementById('navbar');
        navbar.style.display = 'none';

        const content = document.getElementById('content');
        const dashboard = new DashboardPage();
        content.innerHTML = await dashboard.render();
    }

    /**
     * Show agents list
     */
    async showAgentsList(stationId) {
        const content = document.getElementById('content');

        // Show loading indicator first
        content.innerHTML = `
            <div class="loading">
                <div>Loading agents<span class="loading-dots"></span></div>
            </div>
        `;

        // Small delay to ensure loading shows
        await new Promise(resolve => setTimeout(resolve, 10));

        const dataLoader = new DataLoader(stationId);
        const agentsPage = new AgentsPage();
        content.innerHTML = await agentsPage.renderList(dataLoader);
    }

    /**
     * Show agent detail
     */
    async showAgentDetail(stationId, agentName) {
        // Decode the agent name using standard URL decoding
        const decodedName = decodeURIComponent(agentName);

        const content = document.getElementById('content');

        // Show loading indicator first
        content.innerHTML = `
            <div class="loading">
                <div>Loading agent: ${decodedName}<span class="loading-dots"></span></div>
            </div>
        `;

        // Small delay to ensure loading shows
        await new Promise(resolve => setTimeout(resolve, 10));

        const dataLoader = new DataLoader(stationId);
        const agentsPage = new AgentsPage();
        content.innerHTML = await agentsPage.renderDetail(dataLoader, decodedName);
    }

    /**
     * Show evaluations list
     */
    async showEvaluationsList(stationId) {
        const content = document.getElementById('content');
        const dataLoader = new DataLoader(stationId);
        const evaluationsPage = new EvaluationsPage();
        content.innerHTML = await evaluationsPage.renderList(dataLoader);
    }

    /**
     * Show evaluation detail
     */
    async showEvaluationDetail(stationId, evalId) {
        const content = document.getElementById('content');
        const dataLoader = new DataLoader(stationId);
        const evaluationsPage = new EvaluationsPage();
        content.innerHTML = await evaluationsPage.renderDetail(dataLoader, evalId);
    }

    /**
     * Show archive list
     */
    async showArchiveList(stationId) {
        const content = document.getElementById('content');
        const dataLoader = new DataLoader(stationId);

        // Use the global archivePage instance if it exists, or create a new one
        if (!window.archivePage) {
            window.archivePage = new ArchivePage();
        }

        content.innerHTML = await window.archivePage.renderList(dataLoader);
    }

    /**
     * Show archive detail
     */
    async showArchiveDetail(stationId, capsuleId) {
        const content = document.getElementById('content');
        const dataLoader = new DataLoader(stationId);

        // Use the global archivePage instance if it exists, or create a new one
        if (!window.archivePage) {
            window.archivePage = new ArchivePage();
        }

        content.innerHTML = await window.archivePage.renderDetail(dataLoader, capsuleId);
    }

    /**
     * Show memory list
     */
    async showMemoryList(stationId, type) {
        const content = document.getElementById('content');
        const dataLoader = new DataLoader(stationId);

        // Use the global memoryPage instance if it exists, or create a new one
        if (!window.memoryPage) {
            window.memoryPage = new MemoryPage();
        }

        // Call the appropriate render method based on type
        if (type === 'public') {
            content.innerHTML = await window.memoryPage.renderPublicList(dataLoader);
        } else {
            content.innerHTML = await window.memoryPage.renderPrivateList(dataLoader);
        }
    }

    /**
     * Show memory detail
     */
    async showMemoryDetail(stationId, type, capsuleId) {
        const content = document.getElementById('content');
        const dataLoader = new DataLoader(stationId);

        // Use the global memoryPage instance if it exists, or create a new one
        if (!window.memoryPage) {
            window.memoryPage = new MemoryPage();
        }

        content.innerHTML = await window.memoryPage.renderDetail(dataLoader, type, capsuleId);
    }

    /**
     * Show mail list
     */
    async showMailList(stationId) {
        const content = document.getElementById('content');
        const dataLoader = new DataLoader(stationId);
        const mailPage = new MailPage();
        content.innerHTML = await mailPage.renderList(dataLoader);
    }

    /**
     * Show mail detail
     */
    async showMailDetail(stationId, mailId) {
        const content = document.getElementById('content');
        const dataLoader = new DataLoader(stationId);
        const mailPage = new MailPage();
        content.innerHTML = await mailPage.renderDetail(dataLoader, mailId);
    }

    /**
     * Show error message
     */
    showError(message) {
        const content = document.getElementById('content');
        content.innerHTML = `
            <div class="error-message">
                <h2>Error</h2>
                <p>${message}</p>
                <a href="#/" class="back-button">← Back to Dashboard</a>
            </div>
        `;
    }
}

// Create global router instance
const router = new Router();