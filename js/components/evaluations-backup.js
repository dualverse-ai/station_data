/**
 * Research Component - Research Submission Evaluations
 */

class EvaluationsPage {
    constructor() {
        this.evaluations = [];
        this.filteredEvaluations = [];
        this.currentSort = { column: 'submitted_tick', order: 'desc' };
    }

    async renderList(dataLoader) {
        try {
            // Load research index
            const indexPath = dataLoader.basePath + 'evaluations/_index.json';
            const response = await fetch(indexPath);

            if (!response.ok) {
                // No evaluations or index not generated
                return `
                    <div class="page-header">
                        <h1 class="page-title">Research Submissions</h1>
                    </div>
                    <div class="empty-state">
                        <h3>No Research Submissions Found</h3>
                        <p>This station has no research evaluations or the index needs to be generated.</p>
                        <p>Run <code>python scripts/add_station.py</code> to generate indices.</p>
                    </div>
                `;
            }

            const data = await response.json();
            this.evaluations = data.evaluations || [];
            this.filteredEvaluations = [...this.evaluations];

            // Apply default sort (descending by submitted tick - newest first)
            this.sortEvaluations('submitted_tick', 'desc');

            // Store this instance globally for event handlers
            window.currentEvaluationsPage = this;

            // Attach event handlers after DOM updates
            setTimeout(() => {
                this.attachEventHandlers();
            }, 0);

            return `
                <div class="page-header">
                    <h1 class="page-title">Research Submissions</h1>
                </div>

                <div class="filter-bar">
                    <input type="text" id="search-evaluations" placeholder="Search by title, author, tags..."
                           onkeyup="window.currentEvaluationsPage && window.currentEvaluationsPage.filterEvaluations(this.value)"/>
                    <button class="clear-filters-btn" id="clear-filters-btn"
                            onclick="window.currentEvaluationsPage && window.currentEvaluationsPage.clearFilters()"
                            style="${this.evaluations.length !== this.filteredEvaluations.length ? '' : 'display: none;'}">
                        Clear Filters
                    </button>
                </div>

                <table class="data-table research-table" id="evaluations-table">
                    <thead>
                        <tr>
                            <th class="sortable research-name-col" data-sort="name">Name</th>
                            <th class="sortable research-author-col" data-sort="author">Author</th>
                            <th class="sortable research-model-col" data-sort="author_model">Author Model</th>
                            <th class="sortable research-tick-col" data-sort="submitted_tick">Submitted Tick</th>
                            <th class="sortable research-score-col" data-sort="score">Score</th>
                            <th class="sortable research-breakthrough-col" data-sort="breakthrough">Breakthrough</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.renderEvaluationRows()}
                    </tbody>
                </table>
            `;
        } catch (error) {
            console.error('Error loading evaluations:', error);
            return `
                <div class="page-header">
                    <h1 class="page-title">Research Submissions</h1>
                </div>
                <div class="error-message">
                    Error loading research submissions: ${error.message}
                </div>
            `;
        }
    }

    renderEvaluationRows() {
        if (this.filteredEvaluations.length === 0) {
            return `
                <tr>
                    <td colspan="6" style="text-align: center; color: var(--text-muted);">
                        No research submissions found
                    </td>
                </tr>
            `;
        }

        return this.filteredEvaluations.map(item => {
            const scoreDisplay = item.score === 'n.a.' ? 'n.a.' :
                                (typeof item.score === 'number' ? item.score.toFixed(6) : item.score);
            const breakthroughDisplay = item.breakthrough ? 'Y' : 'N';
            const scoreClass = item.breakthrough ? 'score-breakthrough' : '';

            return `
                <tr onclick="router.navigate('#/${router.currentStationId}/evaluations/${item.id}')">
                    <td title="${this.escapeHtml(item.name)}">${this.truncateName(this.escapeHtml(item.name))}</td>
                    <td>${this.escapeHtml(item.author)}</td>
                    <td>${this.escapeHtml(item.author_model || 'Unknown')}</td>
                    <td>${item.submitted_tick}</td>
                    <td class="${scoreClass}">${scoreDisplay}</td>
                    <td class="${item.breakthrough ? 'breakthrough-yes' : 'breakthrough-no'}">${breakthroughDisplay}</td>
                </tr>
            `;
        }).join('');
    }

    truncateName(name, maxLength = 60) {
        if (name.length <= maxLength) return name;
        return name.substring(0, maxLength) + '...';
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    highlightCode(code, language = 'python') {
        // If highlight.js is available, use it
        if (typeof hljs !== 'undefined') {
            try {
                const result = hljs.highlight(code, { language: language });
                return result.value;
            } catch (e) {
                // Fallback to escaped HTML if highlighting fails
                return this.escapeHtml(code);
            }
        } else {
            // Fallback if highlight.js not loaded
            return this.escapeHtml(code);
        }
    }

    sortEvaluations(column, order = null) {
        // Toggle order if same column
        if (this.currentSort.column === column && order === null) {
            order = this.currentSort.order === 'asc' ? 'desc' : 'asc';
        } else if (order === null) {
            order = column === 'submitted_tick' ? 'desc' : 'asc';
        }

        this.currentSort = { column, order };

        this.filteredEvaluations.sort((a, b) => {
            let aVal = a[column];
            let bVal = b[column];

            // Handle special cases
            if (column === 'score') {
                // Convert 'n.a.' to -1 for sorting
                aVal = aVal === 'n.a.' ? -1 : aVal;
                bVal = bVal === 'n.a.' ? -1 : bVal;
            } else if (column === 'breakthrough') {
                // Convert boolean to number for sorting
                aVal = aVal ? 1 : 0;
                bVal = bVal ? 1 : 0;
            }

            // Handle strings
            if (typeof aVal === 'string' && typeof bVal === 'string') {
                aVal = aVal.toLowerCase();
                bVal = bVal.toLowerCase();
            }

            if (aVal < bVal) return order === 'asc' ? -1 : 1;
            if (aVal > bVal) return order === 'asc' ? 1 : -1;
            return 0;
        });

        this.updateTable();
    }

    filterEvaluations(searchTerm) {
        const term = searchTerm.toLowerCase();

        if (!term) {
            this.filteredEvaluations = [...this.evaluations];
        } else {
            this.filteredEvaluations = this.evaluations.filter(item => {
                const searchFields = [
                    item.name.toLowerCase(),
                    item.author.toLowerCase(),
                    (item.author_model || 'Unknown').toLowerCase(),
                    item.submitted_tick.toString(),
                    item.score.toString()
                ];

                return searchFields.some(field => field.includes(term));
            });
        }

        // Show/hide clear button based on filter state
        const clearBtn = document.getElementById('clear-filters-btn');
        if (clearBtn) {
            clearBtn.style.display = term ? '' : 'none';
        }

        // Reapply current sort
        this.sortEvaluations(this.currentSort.column, this.currentSort.order);
    }

    clearFilters() {
        const searchBox = document.getElementById('search-evaluations');
        if (searchBox) {
            searchBox.value = '';
        }
        this.filterEvaluations('');

        // Hide clear button
        const clearBtn = document.getElementById('clear-filters-btn');
        if (clearBtn) {
            clearBtn.style.display = 'none';
        }
    }

    updateTable() {
        const tbody = document.querySelector('#evaluations-table tbody');
        if (tbody) {
            tbody.innerHTML = this.renderEvaluationRows();
        }

        // Update sort indicators
        document.querySelectorAll('#evaluations-table th.sortable').forEach(th => {
            const column = th.getAttribute('data-sort');
            th.classList.remove('sort-asc', 'sort-desc');
            if (column === this.currentSort.column) {
                th.classList.add(this.currentSort.order === 'asc' ? 'sort-asc' : 'sort-desc');
            }
        });
    }

    async renderDetail(dataLoader, evalId) {
        try {
            // Load the specific evaluation file
            const evalPath = `evaluations/evaluation_${evalId}.json`;
            const evalData = await dataLoader.loadJSON(evalPath);

            if (!evalData) {
                return `
                    <a href="#/${router.currentStationId}/evaluations" class="back-button">
                        ← Back to Research Submissions
                    </a>
                    <div class="error-message">
                        Evaluation not found.
                    </div>
                `;
            }

            // Get the notified version
            const versionNotified = evalData.notification?.version_notified || 'original';

            // Get the score and evaluation details from the notified version
            let score = 'n.a.';
            let evaluationDetails = '';
            let submissionContent = '';
            let executionLogs = '';

            if (versionNotified === 'original' && evalData.original_submission) {
                const result = evalData.original_submission.evaluation_result || {};
                score = result.score;
                evaluationDetails = result.evaluation_details || '';
                submissionContent = evalData.original_submission.content || '';
                executionLogs = result.logs || '';
            } else if (evalData.versions && evalData.versions[versionNotified]) {
                const versionData = evalData.versions[versionNotified];
                const result = versionData.evaluation_result || {};
                score = result.score;
                evaluationDetails = result.evaluation_details || '';
                submissionContent = versionData.content || '';
                executionLogs = result.logs || '';
            }

            // Format score
            const scoreDisplay = score === 'n.a.' ? 'n.a.' :
                                (typeof score === 'number' ? score.toFixed(8) : score);

            // Get author model
            const authorName = evalData.author || 'Unknown';
            const authorModel = await this.getAuthorModel(dataLoader, authorName);

            // Render the detail view
            return `
                <a href="#/${router.currentStationId}/evaluations" class="back-button">
                    ← Back to Research Submissions
                </a>

                <div class="research-detail">
                    <div class="research-header">
                        <h1 class="research-title">${this.escapeHtml(evalData.title || 'Untitled')}</h1>
                        <div class="research-metadata">
                            <div class="metadata-item">
                                <span class="metadata-label">Author:</span>
                                <span class="metadata-value">${this.escapeHtml(authorName)}</span>
                            </div>
                            <div class="metadata-item">
                                <span class="metadata-label">Model:</span>
                                <span class="metadata-value">${this.escapeHtml(authorModel)}</span>
                            </div>
                            <div class="metadata-item">
                                <span class="metadata-label">Submitted:</span>
                                <span class="metadata-value">Tick ${evalData.submitted_tick || 0}</span>
                            </div>
                            <div class="metadata-item">
                                <span class="metadata-label">Primary Score:</span>
                                <span class="metadata-value">${scoreDisplay}</span>
                            </div>
                            <div class="metadata-item">
                                <span class="metadata-label">Version:</span>
                                <span class="metadata-value">${versionNotified}</span>
                            </div>
                        </div>
                        ${evalData.abstract ? `
                            <div class="research-abstract">
                                <h3>Abstract</h3>
                                <p>${this.escapeHtml(evalData.abstract)}</p>
                            </div>
                        ` : ''}
                        ${evalData.tags && evalData.tags.length > 0 ? `
                            <div class="research-tags">
                                ${evalData.tags.map(tag =>
                                    `<span class="tag">${this.escapeHtml(tag)}</span>`
                                ).join('')}
                            </div>
                        ` : ''}
                        ${this.renderEvaluationDetails(evaluationDetails)}
                    </div>

                    <div class="research-content">
                        <h2>Submission Code</h2>
                        <div class="code-block">
                            <pre><code class="language-python">${this.highlightCode(submissionContent, 'python')}</code></pre>
                        </div>

                        <h2>Execution Logs</h2>
                        <div class="logs-block">
                            <pre>${this.escapeHtml(executionLogs)}</pre>
                        </div>
                    </div>
                </div>
            `;
        } catch (error) {
            console.error('Error loading evaluation detail:', error);
            return `
                <a href="#/${router.currentStationId}/evaluations" class="back-button">
                    ← Back to Research Submissions
                </a>
                <div class="error-message">
                    Error loading evaluation: ${error.message}
                </div>
            `;
        }
    }

    renderEvaluationDetails(evaluationDetails) {
        if (!evaluationDetails) {
            return '';
        }

        // If it's a string, just display it
        if (typeof evaluationDetails === 'string') {
            return `
                <div class="research-evaluation-details">
                    <h3>Evaluation Details</h3>
                    <p>${this.escapeHtml(evaluationDetails)}</p>
                </div>
            `;
        }

        // If it's an object/dictionary, extract message and secondary metrics
        if (typeof evaluationDetails === 'object') {
            let html = '<div class="research-evaluation-details">';

            // Show main message if exists
            if (evaluationDetails.Message || evaluationDetails.message) {
                const message = evaluationDetails.Message || evaluationDetails.message;
                html += `
                    <h3>Evaluation Details</h3>
                    <pre class="evaluation-message">${this.escapeHtml(message)}</pre>
                `;
            }

            // Extract secondary metrics (all keys except Message/message)
            const secondaryMetrics = {};
            for (const [key, value] of Object.entries(evaluationDetails)) {
                if (key !== 'Message' && key !== 'message') {
                    // Handle array values (e.g., ["0.627", 0.6269217])
                    if (Array.isArray(value) && value.length >= 2) {
                        secondaryMetrics[key] = value[1]; // Use the numeric value
                    } else {
                        secondaryMetrics[key] = value;
                    }
                }
            }

            // Display secondary metrics in a table if they exist
            if (Object.keys(secondaryMetrics).length > 0) {
                html += `
                    <h3>Secondary Metrics</h3>
                    <table class="secondary-metrics-table">
                        <thead>
                            <tr>
                `;

                // Add headers (keys)
                for (const key of Object.keys(secondaryMetrics)) {
                    html += `<th>${this.escapeHtml(key)}</th>`;
                }

                html += `
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                `;

                // Add values
                for (const value of Object.values(secondaryMetrics)) {
                    const displayValue = typeof value === 'number' ? value.toFixed(8) : value;
                    html += `<td>${this.escapeHtml(String(displayValue))}</td>`;
                }

                html += `
                            </tr>
                        </tbody>
                    </table>
                `;
            }

            html += '</div>';
            return html;
        }

        return '';
    }

    async getAuthorModel(dataLoader, authorName) {
        try {
            const agentPath = `agents/${authorName}.yaml`;
            const agentData = await dataLoader.loadYAML(agentPath);
            if (agentData && agentData.model_name) {
                return agentData.model_name;
            }
        } catch (error) {
            // Agent file doesn't exist or can't be loaded
        }
        return 'Unknown';
    }

    attachEventHandlers() {
        // Attach sort handlers to table headers
        const headers = document.querySelectorAll('#evaluations-table th.sortable');
        headers.forEach(th => {
            th.onclick = () => {
                const column = th.getAttribute('data-sort');
                if (window.currentEvaluationsPage) {
                    window.currentEvaluationsPage.sortEvaluations(column);
                }
            };
        });
    }
}

// Export class to global scope
window.EvaluationsPage = EvaluationsPage;