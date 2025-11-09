/**
 * Archive Component - Published Papers
 */

class ArchivePage {
    constructor() {
        this.archives = [];
        this.filteredArchives = [];
        this.currentSort = { column: 'creation_tick', order: 'asc' };
    }

    async renderList(dataLoader) {
        try {
            // Load archive index
            const indexPath = dataLoader.basePath + 'capsules/archive/_index.json';
            const response = await fetch(indexPath);

            if (!response.ok) {
                // No archives or index not generated
                return `
                    <div class="page-header">
                        <h1 class="page-title">Archive</h1>
                    </div>
                    <div class="empty-state">
                        <h3>No Archives Found</h3>
                        <p>This station has no published archives or the archive index needs to be generated.</p>
                        <p>Run <code>python scripts/add_station.py</code> to generate indices.</p>
                    </div>
                `;
            }

            const data = await response.json();
            this.archives = data.archives || [];
            this.filteredArchives = [...this.archives];

            // Apply default sort (ascending by creation tick)
            this.sortArchives('creation_tick', 'asc');

            // Store this instance globally for event handlers
            window.currentArchivePage = this;

            // Attach event handlers after DOM updates
            setTimeout(() => {
                this.attachEventHandlers();
            }, 0);

            return `
                <div class="page-header">
                    <h1 class="page-title">Archive</h1>
                </div>

                <div class="filter-bar">
                    <input type="text" id="search-archives" placeholder="Search archives by name, author..."
                           onkeyup="window.currentArchivePage && window.currentArchivePage.filterArchives(this.value)"/>
                    <button class="clear-filters-btn" id="clear-filters-btn"
                            onclick="window.currentArchivePage && window.currentArchivePage.clearFilters()"
                            style="${this.archives.length !== this.filteredArchives.length ? '' : 'display: none;'}">
                        Clear Filters
                    </button>
                </div>

                <table class="data-table archive-table" id="archives-table">
                    <thead>
                        <tr>
                            <th class="sortable archive-name-col" data-sort="name">Name</th>
                            <th class="sortable archive-id-col" data-sort="id">ID</th>
                            <th class="sortable archive-author-col" data-sort="author">Author</th>
                            <th class="sortable archive-model-col" data-sort="author_model">Author Model</th>
                            <th class="sortable archive-creation-col" data-sort="creation_tick">Created Tick</th>
                            <th class="sortable archive-update-col" data-sort="last_update_tick">Updated Tick</th>
                            <th class="sortable archive-responses-col" data-sort="num_responses"># Msg</th>
                            <th class="sortable archive-words-col" data-sort="word_count">Words</th>
                            <th class="sortable archive-score-col" data-sort="reviewer_score">Score</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.renderArchiveRows()}
                    </tbody>
                </table>
            `;
        } catch (error) {
            console.error('Error loading archives:', error);
            return `
                <div class="page-header">
                    <h1 class="page-title">Archive</h1>
                </div>
                <div class="error-message">
                    Error loading archives: ${error.message}
                </div>
            `;
        }
    }

    renderArchiveRows() {
        if (this.filteredArchives.length === 0) {
            return `
                <tr>
                    <td colspan="9" style="text-align: center; color: var(--text-muted);">
                        No archives found
                    </td>
                </tr>
            `;
        }

        return this.filteredArchives.map(archive => `
            <tr onclick="router.navigate('#/${router.currentStationId}/archive/${archive.id}')">
                <td title="${this.escapeHtml(archive.name)}">${this.truncateName(this.escapeHtml(archive.name))}</td>
                <td>${archive.id.replace('archive_', '')}</td>
                <td>${this.escapeHtml(archive.author)}</td>
                <td>${this.escapeHtml(archive.author_model || 'Unknown')}</td>
                <td>${archive.creation_tick}</td>
                <td>${archive.last_update_tick}</td>
                <td>${archive.num_responses}</td>
                <td>${archive.word_count.toLocaleString()}</td>
                <td class="${archive.reviewer_score === 'n.a.' ? 'muted' : ''}">${archive.reviewer_score}</td>
            </tr>
        `).join('');
    }

    truncateName(name, maxLength = 100) {
        if (name.length <= maxLength) return name;
        return name.substring(0, maxLength) + '...';
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    sortArchives(column, order = null) {
        // Toggle order if same column
        if (this.currentSort.column === column && order === null) {
            order = this.currentSort.order === 'asc' ? 'desc' : 'asc';
        } else if (order === null) {
            order = 'asc';
        }

        this.currentSort = { column, order };

        this.filteredArchives.sort((a, b) => {
            let aVal = a[column];
            let bVal = b[column];

            // Handle special cases
            if (column === 'reviewer_score') {
                // Convert scores for comparison (n.a. should be last)
                aVal = aVal === 'n.a.' ? -1 : parseInt(aVal.split('/')[0]);
                bVal = bVal === 'n.a.' ? -1 : parseInt(bVal.split('/')[0]);
            } else if (column === 'id') {
                // Extract numeric part for proper sorting
                aVal = parseInt(aVal.replace('archive_', '')) || 0;
                bVal = parseInt(bVal.replace('archive_', '')) || 0;
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

    filterArchives(searchTerm) {
        const term = searchTerm.toLowerCase();

        if (!term) {
            this.filteredArchives = [...this.archives];
        } else {
            this.filteredArchives = this.archives.filter(archive =>
                archive.name.toLowerCase().includes(term) ||
                archive.author.toLowerCase().includes(term) ||
                archive.id.toLowerCase().includes(term)
            );
        }

        // Show/hide clear button based on filter state
        const clearBtn = document.getElementById('clear-filters-btn');
        if (clearBtn) {
            clearBtn.style.display = term ? '' : 'none';
        }

        // Reapply current sort
        this.sortArchives(this.currentSort.column, this.currentSort.order);
    }

    clearFilters() {
        const searchBox = document.getElementById('search-archives');
        if (searchBox) {
            searchBox.value = '';
        }
        this.filterArchives('');

        // Hide clear button
        const clearBtn = document.getElementById('clear-filters-btn');
        if (clearBtn) {
            clearBtn.style.display = 'none';
        }
    }

    updateTable() {
        const tbody = document.querySelector('#archives-table tbody');
        if (tbody) {
            tbody.innerHTML = this.renderArchiveRows();
        }

        // Update sort indicators
        document.querySelectorAll('#archives-table th.sortable').forEach(th => {
            const column = th.getAttribute('data-sort');
            th.classList.remove('sort-asc', 'sort-desc');
            if (column === this.currentSort.column) {
                th.classList.add(this.currentSort.order === 'asc' ? 'sort-asc' : 'sort-desc');
            }
        });
    }

    async renderDetail(dataLoader, capsuleId) {
        try {
            // Load the specific archive capsule
            const capsulePath = `capsules/archive/${capsuleId}.yaml`;
            const capsuleData = await dataLoader.loadYAML(capsulePath);

            if (!capsuleData || capsuleData.is_deleted) {
                return `
                    <a href="#/${router.currentStationId}/archive" class="back-button">
                        ← Back to Archive
                    </a>
                    <div class="error-message">
                        Archive capsule not found or has been deleted.
                    </div>
                `;
            }

            // Render the detail view
            return `
                <a href="#/${router.currentStationId}/archive" class="back-button">
                    ← Back to Archive
                </a>

                <div class="archive-detail">
                    <div class="archive-header">
                        <h1 class="archive-title">${this.escapeHtml(capsuleData.title || 'Untitled')}</h1>
                        <div class="archive-metadata">
                            <div class="metadata-item">
                                <span class="metadata-label">Author:</span>
                                <span class="metadata-value">${this.escapeHtml(capsuleData.author_name)}</span>
                            </div>
                            <div class="metadata-item">
                                <span class="metadata-label">Created:</span>
                                <span class="metadata-value">Tick ${capsuleData.created_at_tick}</span>
                            </div>
                            <div class="metadata-item">
                                <span class="metadata-label">Last Updated:</span>
                                <span class="metadata-value">Tick ${capsuleData.last_updated_at_tick}</span>
                            </div>
                            <div class="metadata-item">
                                <span class="metadata-label">Word Count:</span>
                                <span class="metadata-value">${capsuleData.word_count_total?.toLocaleString() || 0}</span>
                            </div>
                        </div>
                        ${capsuleData.abstract ? `
                            <div class="archive-abstract">
                                <h3>Abstract</h3>
                                <p>${this.escapeHtml(capsuleData.abstract)}</p>
                            </div>
                        ` : ''}
                        ${capsuleData.tags && capsuleData.tags.length > 0 ? `
                            <div class="archive-tags">
                                ${capsuleData.tags.map(tag =>
                                    `<span class="tag">${this.escapeHtml(tag)}</span>`
                                ).join('')}
                            </div>
                        ` : ''}
                    </div>

                    <div class="chat-history">
                        ${this.renderMessages(capsuleData.messages || [])}
                    </div>
                </div>
            `;
        } catch (error) {
            console.error('Error loading archive capsule:', error);
            return `
                <a href="#/${router.currentStationId}/archive" class="back-button">
                    ← Back to Archive
                </a>
                <div class="error-message">
                    Error loading archive capsule: ${error.message}
                </div>
            `;
        }
    }

    renderMessages(messages) {
        if (!messages || messages.length === 0) {
            return '<div class="empty-state">No messages in this archive.</div>';
        }

        return messages.map(msg => {
            if (msg.is_deleted) return '';

            const isReviewer = msg.author_name === 'Archive Review System';

            return `
                <div class="chat-entry">
                    <div class="chat-bubble archive-message ${isReviewer ? 'reviewer-message' : ''}">
                        <div class="chat-meta">
                            ${this.escapeHtml(msg.author_name)} • Tick ${msg.posted_at_tick}
                            ${msg.word_count ? ` • ${msg.word_count} words` : ''}
                        </div>
                        ${msg.title ? `<div class="message-title">${this.escapeHtml(msg.title)}</div>` : ''}
                        <div class="markdown-content-host">${marked.parse(msg.content || '')}</div>
                    </div>
                </div>
            `;
        }).join('');
    }

    attachEventHandlers() {
        // Attach sort handlers to table headers
        const headers = document.querySelectorAll('#archives-table th.sortable');
        headers.forEach(th => {
            th.onclick = () => {
                const column = th.getAttribute('data-sort');
                if (window.currentArchivePage) {
                    window.currentArchivePage.sortArchives(column);
                }
            };
        });
    }
}

// Create global instance
window.archivePage = new ArchivePage();