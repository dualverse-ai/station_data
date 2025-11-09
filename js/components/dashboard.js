/**
 * Dashboard Component - Station Selection Page
 */

class DashboardPage {
    constructor() {
        this.stations = [];
    }

    /**
     * Render the dashboard
     */
    async render() {
        // Discover available stations
        await this.discoverStations();

        return `
            <div class="dashboard-container">
                <img src="images/logo.png" alt="Station" class="station-logo-large">
                <h2 style="color: var(--text-secondary); font-size: 1.3rem; margin-bottom: 1rem;">Select a station to explore</h2>
                <div class="station-grid">
                    ${this.renderStationCards()}
                </div>
            </div>
        `;
    }

    /**
     * Discover available stations in the data directory
     */
    async discoverStations() {
        // Load the stations manifest file (required)
        let stationIds = [];

        try {
            const response = await fetch('data/stations.json');
            if (!response.ok) {
                throw new Error('stations.json not found');
            }

            const manifest = await response.json();
            stationIds = manifest.stations || [];

            if (stationIds.length === 0) {
                throw new Error('No stations found in manifest');
            }
        } catch (error) {
            console.error('Failed to load stations:', error);
            console.error('Please run scripts/add_station.sh to generate station manifest');
            // Show error in UI
            this.stations = [];
            return;
        }

        // Load station configs to get names
        for (const stationId of stationIds) {
            try {
                const response = await fetch(`data/${stationId}/station_config.yaml`);
                if (response.ok) {
                    const text = await response.text();
                    const config = jsyaml.load(text);
                    this.stations.push({
                        id: stationId,
                        shortId: stationId.substring(0, 8),
                        name: config.station_name || 'Unnamed Station',
                        tick: config.current_tick || 0
                    });
                }
            } catch (error) {
                console.warn(`Failed to load station ${stationId}:`, error);
            }
        }
    }

    /**
     * Render station cards
     */
    renderStationCards() {
        if (this.stations.length === 0) {
            return `
                <div class="empty-state">
                    <h3>No Stations Found</h3>
                    <p>Please ensure station data is available in the data directory.</p>
                    <div style="margin-top: 1.5rem; padding: 1rem; background: var(--bg-tertiary); border-radius: 0.5rem; text-align: left;">
                        <h4 style="color: var(--accent-cyan); margin-bottom: 0.5rem;">Setup Instructions:</h4>
                        <ol style="color: var(--text-secondary); line-height: 1.8;">
                            <li>Copy your station data to: <code>viewer/data/{station-id}/</code></li>
                            <li>Run the setup script: <code>bash scripts/add_station.sh</code></li>
                            <li>Refresh this page</li>
                        </ol>
                        <p style="margin-top: 1rem; color: var(--text-muted); font-size: 0.9rem;">
                            The script will automatically discover stations and generate all necessary index files.
                        </p>
                    </div>
                </div>
            `;
        }

        return this.stations.map(station => `
            <div class="station-card" onclick="router.navigate('#/${station.shortId}/agents')">
                <h3>${station.name}</h3>
                <div class="station-id">ID: ${station.shortId}</div>
                <div style="margin-top: 0.5rem; color: var(--text-secondary);">
                    End Tick: ${station.tick}
                </div>
            </div>
        `).join('');
    }
}