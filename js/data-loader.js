/**
 * Data Loader for reading and caching YAML/JSON files
 */

class DataLoader {
    constructor(stationId) {
        this.stationId = stationId;
        this.basePath = `data/${stationId}/`;
        this.cache = new Map();
    }

    /**
     * Load and parse a YAML file
     */
    async loadYAML(path) {
        const fullPath = this.basePath + path;

        // Check cache
        if (this.cache.has(fullPath)) {
            return this.cache.get(fullPath);
        }

        try {
            const response = await fetch(fullPath);
            if (!response.ok) {
                throw new Error(`Failed to load ${path}: ${response.statusText}`);
            }

            const text = await response.text();
            const data = jsyaml.load(text);

            // Cache the result
            this.cache.set(fullPath, data);
            return data;
        } catch (error) {
            console.error(`Error loading YAML ${path}:`, error);
            throw error;
        }
    }

    /**
     * Load and parse a YAMLL file (YAML Lines format)
     * Each document is separated by ---
     */
    async loadYAMLL(path) {
        const fullPath = this.basePath + path;

        // Check cache
        if (this.cache.has(fullPath)) {
            return this.cache.get(fullPath);
        }

        try {
            const response = await fetch(fullPath);
            if (!response.ok) {
                throw new Error(`Failed to load ${path}: ${response.statusText}`);
            }

            const text = await response.text();

            // Split by document separator and parse each
            const documents = [];
            const lines = text.trim().split('\n---\n');

            for (const line of lines) {
                if (line.trim()) {
                    try {
                        const doc = jsyaml.load(line);
                        documents.push(doc);
                    } catch (e) {
                        console.warn('Failed to parse YAMLL document:', e);
                    }
                }
            }

            // Cache the result
            this.cache.set(fullPath, documents);
            return documents;
        } catch (error) {
            console.error(`Error loading YAMLL ${path}:`, error);
            throw error;
        }
    }

    /**
     * Load and parse a JSON file
     */
    async loadJSON(path) {
        const fullPath = this.basePath + path;

        // Check cache
        if (this.cache.has(fullPath)) {
            return this.cache.get(fullPath);
        }

        try {
            const response = await fetch(fullPath);
            if (!response.ok) {
                throw new Error(`Failed to load ${path}: ${response.statusText}`);
            }

            const data = await response.json();

            // Cache the result
            this.cache.set(fullPath, data);
            return data;
        } catch (error) {
            console.error(`Error loading JSON ${path}:`, error);
            throw error;
        }
    }

    /**
     * List files in a directory
     * Requires pre-generated index file from scripts/generate_indices.py
     */
    async listFiles(directory) {
        const index = await this.loadJSON(`${directory}/_index.json`);
        return index.files || [];
    }

    /**
     * Get all available agents
     */
    async getAllAgents() {
        const agents = [];

        // Try to get list of agent files
        const files = await this.listFiles('agents');

        for (const file of files) {
            try {
                const agent = await this.loadYAML(`agents/${file}.yaml`);
                if (agent) {
                    agents.push(agent);
                }
            } catch (error) {
                console.warn(`Failed to load agent ${file}:`, error);
            }
        }

        // Also check for Reviewer agent
        try {
            const reviewer = await this.loadYAML('agents/Reviewer.yaml');
            if (reviewer) {
                agents.push(reviewer);
            }
        } catch (error) {
            // No reviewer agent
        }

        return agents;
    }

    /**
     * Get all evaluations
     */
    async getAllEvaluations() {
        const evaluations = [];
        const files = await this.listFiles('evaluations');

        for (const file of files) {
            try {
                const eval_data = await this.loadJSON(`evaluations/${file}.json`);
                if (eval_data) {
                    evaluations.push(eval_data);
                }
            } catch (error) {
                console.warn(`Failed to load evaluation ${file}:`, error);
            }
        }

        return evaluations;
    }

    /**
     * Get all capsules of a specific type
     */
    async getCapsules(type) {
        const capsules = [];
        const directory = `capsules/${type}`;
        const files = await this.listFiles(directory);

        for (const file of files) {
            try {
                const capsule = await this.loadYAML(`${directory}/${file}.yaml`);
                if (capsule) {
                    capsule._filename = file; // Store filename for reference
                    capsules.push(capsule);
                }
            } catch (error) {
                console.warn(`Failed to load capsule ${file}:`, error);
            }
        }

        return capsules;
    }

    /**
     * Clear the cache
     */
    clearCache() {
        this.cache.clear();
    }
}