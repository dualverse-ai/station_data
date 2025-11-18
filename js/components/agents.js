/**
 * Agents Component - Agent List and Detail Views
 */

class AgentsPage {
    constructor() {
        this.agents = [];
        this.filteredAgents = []; // Store filtered results
        this.sortColumn = 'tick_birth';
        this.sortDirection = 'asc';
        this.loadedTicks = 0; // Track how many ticks we've loaded
        this.tickBatchSize = 50; // Load 50 ticks at a time
        this.currentChatHistory = []; // Store full chat history
        this.currentAgentName = ''; // Store current agent name
        this.searchTerm = ''; // Current search term
        this.modelFilter = ''; // Current model filter
    }

    /**
     * Render the agents list page
     */
    async renderList(dataLoader) {
        // Load all agents
        await this.loadAgents(dataLoader);

        // Store instance for event handlers
        window.currentAgentsPage = this;

        // Use setTimeout to attach events after DOM is updated
        setTimeout(() => this.attachSortHandlers(), 0);

        return `
            <div class="page-header">
                <h1 class="page-title">Agent Dialogue</h1>
            </div>

            <div class="filter-bar">
                <input type="text" id="agent-search" placeholder="Search agents..." onkeyup="window.currentAgentsPage && window.currentAgentsPage.filterAgents()">
                <select id="model-filter" onchange="window.currentAgentsPage && window.currentAgentsPage.filterAgents()">
                    <option value="">All Models</option>
                    ${this.getUniqueModels().map(model =>
                        `<option value="${model}">${model}</option>`
                    ).join('')}
                </select>
                <button class="clear-filters-btn" id="clear-filters-btn" onclick="window.currentAgentsPage && window.currentAgentsPage.clearFilters()" style="display: none;">
                    Clear Filters
                </button>
            </div>

            <table class="data-table" id="agents-table">
                <thead>
                    <tr>
                        <th class="sortable" data-sort="agent_name">Agent Name</th>
                        <th class="sortable" data-sort="model_name">Model Name</th>
                        <th class="sortable" data-sort="tick_birth">Birth Tick</th>
                        <th class="sortable" data-sort="tick_exit">Exit Tick</th>
                        <th>Description</th>
                    </tr>
                </thead>
                <tbody>
                    ${this.renderAgentRows()}
                </tbody>
            </table>
        `;
    }

    /**
     * Load agents from data files
     */
    async loadAgents(dataLoader) {
        this.agents = [];

        // Load from the index file (required)
        try {
            const indexResponse = await fetch(dataLoader.basePath + 'agents/_index.json');
            if (!indexResponse.ok) {
                throw new Error('Agent index file not found. Please run scripts/add_station.sh to generate indices.');
            }

            const index = await indexResponse.json();
            const summaries = Array.isArray(index.agent_summaries) ? index.agent_summaries : [];
            const agentFiles = index.files || [];

            if (summaries.length > 0) {
                console.log(`Loaded ${summaries.length} agent summaries from index`);
                this.agents = summaries.map(summary => this.normalizeAgentSummary(summary));
            } else {
                console.log(`Loading ${agentFiles.length} agents from YAML (legacy index)`);
                for (const agentName of agentFiles) {
                    await this.loadAgent(dataLoader, agentName);
                }
            }

        } catch (error) {
            console.error('Failed to load agents:', error);
            // Show error message instead of empty table
            this.agents = [];
        }

        // Initialize filtered agents
        this.filteredAgents = [...this.agents];

        // Sort agents by birth tick by default
        this.sortAgents();
    }


    /**
     * Convert a summary entry into the format expected by the table
     */
    normalizeAgentSummary(summary) {
        const normalized = { ...summary };
        normalized._name = summary.name || summary.agent_name || summary.display_name || '';
        normalized._displayName = summary.display_name || summary.agent_name || normalized._name;
        normalized.description = summary.description || summary.lineage || '';
        normalized._tickDeath = summary.tick_exit_display ?? this.computeTickDeathFromSummary(summary);
        return normalized;
    }


    /**
     * Compute exit tick fallback when summaries are missing the precomputed field
     */
    computeTickDeathFromSummary(summary) {
        if (summary.name === 'Reviewer' || summary.status === 'Reviewer') {
            return 'n/a';
        }

        if (summary.tick_exit !== undefined && summary.tick_exit !== null && summary.tick_exit !== '') {
            return summary.tick_exit;
        }

        if (summary.session_ended === true) {
            return 'Ended';
        }

        if (summary.status === 'Exited') {
            return 'Exited';
        }

        return 'Active';
    }


    /**
     * Load a single agent
     */
    async loadAgent(dataLoader, agentName) {
        try {
            const agent = await dataLoader.loadYAML(`agents/${agentName}.yaml`);
            if (agent && agent.status !== 'Guest Agent') {
                // Add computed fields
                agent._name = agentName;
                agent._displayName = agent.agent_name || agentName;

                // Determine tick of exit
                if (agent.tick_exit) {
                    agent._tickDeath = agent.tick_exit;
                } else if (agent.session_ended === true) {
                    // Session ended but no exit tick recorded
                    agent._tickDeath = 'Ended';
                } else if (agent.status === 'Exited') {
                    agent._tickDeath = 'Exited';
                } else {
                    agent._tickDeath = 'Active';
                }

                // Special handling for Reviewer
                if (agentName === 'Reviewer' || agent.status === 'Reviewer') {
                    agent._displayName = 'Reviewer';
                    agent.tick_birth = 'n/a';
                    agent._tickDeath = 'n/a';
                    agent.description = 'Archive Evaluation Reviewer';
                }

                this.agents.push(agent);
            }
        } catch (error) {
            // Agent doesn't exist or failed to load
            console.debug(`Agent ${agentName} not found or failed to load`);
        }
    }

    /**
     * Get unique models from agents
     */
    getUniqueModels() {
        const models = new Set();
        this.agents.forEach(agent => {
            if (agent.model_name) {
                models.add(agent.model_name);
            }
        });
        return Array.from(models).sort();
    }

    /**
     * Render agent table rows
     */
    renderAgentRows() {
        if (this.filteredAgents.length === 0) {
            const message = this.searchTerm || this.modelFilter
                ? 'No agents match your search criteria.'
                : 'No agents have been created in this station yet.';
            return `
                <tr>
                    <td colspan="5" style="text-align: center; padding: 2rem;">
                        <div class="empty-state">
                            <h3>No Agents Found</h3>
                            <p>${message}</p>
                        </div>
                    </td>
                </tr>
            `;
        }

        return this.filteredAgents.map(agent => {
            // Use standard URL encoding
            const agentPath = encodeURIComponent(agent._name);
            return `
                <tr onclick="router.navigate('#/${router.currentStationId}/agents/${agentPath}')">
                    <td data-label="Agent"><span class="cell-value cell-value-long">${agent._displayName}</span></td>
                    <td data-label="Model">${agent.model_name || 'Unknown'}</td>
                    <td data-label="Birth Tick">${agent.tick_birth}</td>
                    <td data-label="End Tick" class="${agent._tickDeath === 'Active' ? 'active' : 'muted'}">
                        ${agent._tickDeath}
                    </td>
                    <td data-label="Summary">${agent.description || agent.lineage || ''}</td>
                </tr>
            `;
        }).join('');
    }

    /**
     * Attach sort handlers to table headers
     */
    attachSortHandlers() {
        const headers = document.querySelectorAll('#agents-table th.sortable');
        headers.forEach(header => {
            header.addEventListener('click', () => {
                const column = header.getAttribute('data-sort');
                this.sort(column);
            });
        });
    }

    /**
     * Sort agents by column
     */
    sort(column) {
        // Save the current agents before sorting
        if (this.filteredAgents.length === 0) return;

        if (this.sortColumn === column) {
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortColumn = column;
            this.sortDirection = 'asc';
        }

        this.sortAgents();
        this.updateTable();
    }

    /**
     * Sort the agents array
     */
    sortAgents() {
        this.filteredAgents.sort((a, b) => {
            let aVal, bVal;

            // Use the computed _tickDeath for exit column
            if (this.sortColumn === 'tick_exit') {
                aVal = a._tickDeath;
                bVal = b._tickDeath;
            } else if (this.sortColumn === 'agent_name') {
                // Use display name for agent name column
                aVal = a._displayName || a.agent_name || '';
                bVal = b._displayName || b.agent_name || '';
            } else {
                aVal = a[this.sortColumn];
                bVal = b[this.sortColumn];
            }

            // Handle special values
            if (aVal === 'n/a') aVal = this.sortDirection === 'asc' ? -1 : 999999;
            if (bVal === 'n/a') bVal = this.sortDirection === 'asc' ? -1 : 999999;
            if (aVal === 'Active') aVal = 999999;
            if (bVal === 'Active') bVal = 999999;
            if (aVal === 'Ended') aVal = 999998;
            if (bVal === 'Ended') bVal = 999998;
            if (aVal === 'Exited') aVal = 999997;
            if (bVal === 'Exited') bVal = 999997;

            // Numeric comparison for tick values
            if (this.sortColumn.includes('tick') || typeof aVal === 'number' || typeof bVal === 'number') {
                aVal = parseInt(aVal) || 0;
                bVal = parseInt(bVal) || 0;
            }

            if (aVal < bVal) return this.sortDirection === 'asc' ? -1 : 1;
            if (aVal > bVal) return this.sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
    }

    /**
     * Clear all filters
     */
    clearFilters() {
        // Clear filter values
        this.searchTerm = '';
        this.modelFilter = '';

        // Clear input fields
        const searchInput = document.getElementById('agent-search');
        const modelSelect = document.getElementById('model-filter');
        if (searchInput) searchInput.value = '';
        if (modelSelect) modelSelect.value = '';

        // Reset to show all agents
        this.filteredAgents = [...this.agents];

        // Re-sort and update
        this.sortAgents();
        this.updateTable();
        this.updateFilterVisibility();
    }

    /**
     * Filter agents based on search and filters
     */
    filterAgents() {
        // Get current filter values
        const searchInput = document.getElementById('agent-search');
        const modelSelect = document.getElementById('model-filter');

        if (searchInput) {
            this.searchTerm = searchInput.value.toLowerCase().trim();
        }
        if (modelSelect) {
            this.modelFilter = modelSelect.value;
        }

        // Apply filters
        this.filteredAgents = this.agents.filter(agent => {
            // Search filter - check agent name, lineage, and description
            if (this.searchTerm) {
                const searchableText = [
                    agent._displayName || '',
                    agent.agent_name || '',
                    agent.lineage || '',
                    agent.description || '',
                    agent.status || ''
                ].join(' ').toLowerCase();

                if (!searchableText.includes(this.searchTerm)) {
                    return false;
                }
            }

            // Model filter
            if (this.modelFilter && agent.model_name !== this.modelFilter) {
                return false;
            }

            return true;
        });

        // Re-sort the filtered results
        this.sortAgents();

        // Update the table
        this.updateTable();
        this.updateFilterVisibility();
    }

    /**
     * Update filter visibility
     */
    updateFilterVisibility() {
        const clearBtn = document.getElementById('clear-filters-btn');
        if (clearBtn) {
            if (this.searchTerm || this.modelFilter) {
                clearBtn.style.display = 'block';
            } else {
                clearBtn.style.display = 'none';
            }
        }
    }

    /**
     * Update the table display
     */
    updateTable() {
        const tbody = document.querySelector('#agents-table tbody');
        if (tbody) {
            tbody.innerHTML = this.renderAgentRows();
        }

        // Update sort indicators
        document.querySelectorAll('#agents-table th').forEach(th => {
            th.classList.remove('sort-asc', 'sort-desc');
        });

        const activeHeader = document.querySelector(`#agents-table th[data-sort="${this.sortColumn}"]`);
        if (activeHeader) {
            activeHeader.classList.add(this.sortDirection === 'asc' ? 'sort-asc' : 'sort-desc');
        }

        // Re-attach sort handlers since we didn't replace the headers
        // Headers still have their listeners
    }

    /**
     * Render agent detail page
     */
    async renderDetail(dataLoader, agentName) {
        // Store instance for event handlers
        window.currentAgentsPage = this;

        // Reset pagination for new agent
        this.loadedTicks = this.tickBatchSize;
        this.currentAgentName = agentName;

        // Setup auto-load on scroll (after a small delay to ensure DOM is ready)
        setTimeout(() => this.setupAutoLoad(), 100);

        try {
            // Load agent data
            const agent = await dataLoader.loadYAML(`agents/${agentName}.yaml`);

            // Load chat history
            let chatHistory = [];
            try {
                chatHistory = await dataLoader.loadYAMLL(`agents/${agentName}/llm_chat_history.yamll`);
                this.currentChatHistory = chatHistory; // Store full history
            } catch (error) {
                console.warn('No chat history found for agent:', agentName);
                this.currentChatHistory = [];
            }

            return `
                <div class="agent-detail">
                    <h1>${agent.agent_name || agentName}</h1>

                    <div class="agent-info-grid">
                        <div class="info-item">
                            <label>Status</label>
                            <span>${agent.status}</span>
                        </div>
                        <div class="info-item">
                            <label>Lineage</label>
                            <span>${agent.lineage} Generation ${agent.generation || 1}</span>
                        </div>
                        <div class="info-item">
                            <label>Model</label>
                            <span>${agent.model_name}</span>
                        </div>
                        <div class="info-item">
                            <label>Birth Tick</label>
                            <span>${agent.tick_birth}</span>
                        </div>
                        <div class="info-item">
                            <label>Exit Tick</label>
                            <span>${agent.tick_exit || 'Active'}</span>
                        </div>
                    </div>

                    <h2 style="margin-top: 2rem; margin-bottom: 1rem;">Chat History</h2>
                    <div class="chat-history" id="chat-history-container">
                        ${this.renderChatHistory(chatHistory, true)}
                    </div>
                </div>
            `;
        } catch (error) {
            return `
                <div class="error-message">
                    <h2>Error Loading Agent</h2>
                    <p>Failed to load agent data: ${error.message}</p>
                </div>
            `;
        }
    }

    /**
     * Render chat history with pagination
     */
    renderChatHistory(history, initialLoad = false) {
        if (!history || history.length === 0) {
            return `
                <div class="empty-state">
                    <h3>No Chat History</h3>
                    <p>This agent has no recorded conversations.</p>
                </div>
            `;
        }

        // Get unique ticks and sort them
        const ticksInHistory = [...new Set(history.map(entry => entry.tick || 0))].sort((a, b) => a - b);

        // Determine which ticks to show
        let ticksToShow;
        if (initialLoad) {
            // For initial load, show first 50 ticks
            ticksToShow = ticksInHistory.slice(0, this.tickBatchSize);
        } else {
            // For subsequent loads, show up to the current loaded tick count
            ticksToShow = ticksInHistory.slice(0, this.loadedTicks);
        }

        // Filter history to only include entries from ticks we're showing
        const filteredHistory = history.filter(entry => {
            const tick = entry.tick || 0;
            return ticksToShow.includes(tick);
        });

        let html = filteredHistory.map((entry, index) => {
            const role = entry.role;
            const isStation = role === 'user';
            const bubbleClass = isStation ? 'chat-bubble-station' : 'chat-bubble-agent';

            // Get the content (handling different formats)
            let content = '';
            if (entry.parts && entry.parts[0]) {
                content = entry.parts[0].text || entry.parts[0].content || '';
            } else if (entry.content) {
                content = entry.content;
            }

            // Render markdown
            const renderedContent = this.renderMarkdown(content);

            // Handle thinking content if present
            let thinkingHtml = '';
            if (entry.thinking_content) {
                thinkingHtml = `
                    <div class="thinking-toggle" onclick="window.currentAgentsPage.toggleThinking(${index})">
                        💭 Hide Thinking Process
                    </div>
                    <div class="thinking-content visible" id="thinking-${index}">
                        ${this.renderMarkdown(entry.thinking_content)}
                    </div>
                `;
            }

            return `
                <div class="chat-bubble ${bubbleClass}">
                    <div class="chat-meta">
                        Tick ${entry.tick || '?'} • ${isStation ? 'Station' : 'Agent'}
                    </div>
                    ${thinkingHtml}
                    ${renderedContent}
                </div>
            `;
        }).join('');

        // Add Load More button if there are more ticks to load
        const totalTicks = ticksInHistory.length;
        const shownTicks = ticksToShow.length;

        if (shownTicks < totalTicks) {
            const remaining = totalTicks - shownTicks;
            html += `
                <div class="load-more-container" id="load-more-container">
                    <button class="load-more-button" onclick="window.currentAgentsPage.loadMoreHistory()">
                        Load More (${remaining} more ticks)
                    </button>
                </div>
            `;
        }

        return html;
    }

    /**
     * Load more chat history
     */
    loadMoreHistory() {
        // Show loading state
        const loadMoreBtn = document.querySelector('.load-more-button');
        if (loadMoreBtn) {
            loadMoreBtn.textContent = 'Loading...';
            loadMoreBtn.disabled = true;
        }

        // Small delay to show loading state
        setTimeout(() => {
            // Increase the loaded tick count
            this.loadedTicks += this.tickBatchSize;

            // Re-render the chat history with more entries
            const container = document.getElementById('chat-history-container');
            if (container && this.currentChatHistory) {
                // Store scroll position before re-render
                const scrollPos = window.pageYOffset || document.documentElement.scrollTop;

                container.innerHTML = this.renderChatHistory(this.currentChatHistory, false);

                // Restore scroll position
                window.scrollTo(0, scrollPos);
            }
        }, 100);
    }

    /**
     * Setup auto-load on scroll
     */
    setupAutoLoad() {
        let isLoading = false;

        const checkScroll = () => {
            if (isLoading) return;

            const loadMoreButton = document.querySelector('.load-more-button');
            if (!loadMoreButton) return;

            // Check if we're near the bottom (within 500px)
            const scrollPosition = window.scrollY + window.innerHeight;
            const documentHeight = document.documentElement.scrollHeight;

            if (documentHeight - scrollPosition < 500) {
                isLoading = true;
                this.loadMoreHistory();
                setTimeout(() => { isLoading = false; }, 100);
            }
        };

        // Debounce scroll event
        let scrollTimer;
        window.addEventListener('scroll', () => {
            clearTimeout(scrollTimer);
            scrollTimer = setTimeout(checkScroll, 100);
        });
    }

    /**
     * Render markdown content
     */
    renderMarkdown(content) {
        const normalized = this.normalizeMarkdownContent(content);

        // Configure marked options
        marked.setOptions({
            breaks: true,
            gfm: true,
            headerIds: false,
            mangle: false
        });

        return `<div class="markdown-content-host">${marked.parse(normalized)}</div>`;
    }

    /**
     * Ensure code fences have a blank line before them so marked renders correctly
     */
    normalizeMarkdownContent(content) {
        if (!content) {
            return '';
        }

        const normalizedLineEndings = content.replace(/\r\n/g, '\n');

        // Some transcripts mash section headers like "!**Heading**" without a newline.
        // Insert a blank line before bold headings that immediately follow sentence-ending punctuation
        // so Markdown renders them as separate paragraphs.
        const withHeadingSpacing = normalizedLineEndings.replace(
            /([.!?])(\*\*[A-Z][^*]*\*\*)/g,
            (_, punctuation, heading) => `${punctuation}\n\n${heading}`
        );

        const lines = withHeadingSpacing.split('\n');
        const normalized = [];
        let inFence = false;

        for (const line of lines) {
            const trimmed = line.trimStart();
            const isFence = trimmed.startsWith('```');

            if (isFence) {
                if (!inFence && normalized.length && normalized[normalized.length - 1].trim() !== '') {
                    normalized.push('');
                }
                normalized.push(line);
                inFence = !inFence;
                continue;
            }

            normalized.push(line);
        }

        return normalized.join('\n');
    }

    /**
     * Toggle thinking content visibility
     */
    toggleThinking(index) {
        const element = document.getElementById(`thinking-${index}`);
        const toggle = element.previousElementSibling;

        if (element.classList.contains('visible')) {
            element.classList.remove('visible');
            toggle.textContent = '💭 Show Thinking Process';
        } else {
            element.classList.add('visible');
            toggle.textContent = '💭 Hide Thinking Process';
        }
    }
}
