/**
 * Memory Capsule Component - Public and Private Memory
 */

class MemoryPage {
    constructor() {
        this.memories = [];
        this.filteredMemories = [];
        this.currentSort = { column: 'creation_tick', order: 'asc' };
        this.memoryType = 'public'; // 'public' or 'private'
    }

    async renderPublicList(dataLoader) {
        this.memoryType = 'public';
        return this.renderList(dataLoader, 'public');
    }

    async renderPrivateList(dataLoader) {
        this.memoryType = 'private';
        return this.renderList(dataLoader, 'private');
    }

    async renderList(dataLoader, type) {
        try {
            // Load memory index
            const indexPath = dataLoader.basePath + `capsules/${type}/_index.json`;
            const response = await fetch(indexPath);

            if (!response.ok) {
                // No memories or index not generated
                return `
                    <div class="page-header">
                        <h1 class="page-title">${type === 'public' ? 'Public' : 'Private'} Memory Capsules</h1>
                    </div>
                    <div class="empty-state">
                        <h3>No Memory Capsules Found</h3>
                        <p>This station has no ${type} memory capsules or the index needs to be generated.</p>
                        <p>Run <code>python scripts/add_station.py</code> to generate indices.</p>
                    </div>
                `;
            }

            const data = await response.json();
            this.memories = data.memories || [];
            this.filteredMemories = [...this.memories];

            // Apply default sort (ascending by creation tick)
            this.sortMemories('creation_tick', 'asc');

            // Store this instance globally for event handlers
            window.currentMemoryPage = this;

            // Attach event handlers after DOM updates
            setTimeout(() => {
                this.attachEventHandlers();
            }, 0);

            return `
                <div class="page-header">
                    <h1 class="page-title">${type === 'public' ? 'Public' : 'Private'} Memory Capsules</h1>
                </div>

                <div class="filter-bar">
                    <input type="text" id="search-memories" placeholder="Search capsules by name, author, lineage..."
                           onkeyup="window.currentMemoryPage && window.currentMemoryPage.filterMemories(this.value)"/>
                    <button class="clear-filters-btn" id="clear-filters-btn"
                            onclick="window.currentMemoryPage && window.currentMemoryPage.clearFilters()"
                            style="${this.memories.length !== this.filteredMemories.length ? '' : 'display: none;'}">
                        Clear Filters
                    </button>
                </div>

                <table class="data-table memory-table" id="memories-table">
                    <thead>
                        <tr>
                            <th class="sortable memory-name-col" data-sort="name">Name</th>
                            <th class="sortable memory-id-col" data-sort="id">ID</th>
                            <th class="sortable memory-author-col" data-sort="author">Author</th>
                            <th class="sortable memory-model-col" data-sort="author_model">Author Model</th>
                            <th class="sortable memory-creation-col" data-sort="creation_tick">Created Tick</th>
                            <th class="sortable memory-update-col" data-sort="last_update_tick">Updated Tick</th>
                            <th class="sortable memory-messages-col" data-sort="num_messages"># Msg</th>
                            <th class="sortable memory-words-col" data-sort="word_count">Words</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.renderMemoryRows()}
                    </tbody>
                </table>
            `;
        } catch (error) {
            console.error('Error loading memories:', error);
            return `
                <div class="page-header">
                    <h1 class="page-title">${type === 'public' ? 'Public' : 'Private'} Memory Capsules</h1>
                </div>
                <div class="error-message">
                    Error loading memory capsules: ${error.message}
                </div>
            `;
        }
    }

    renderMemoryRows() {
        if (this.filteredMemories.length === 0) {
            return `
                <tr>
                    <td colspan="8" style="text-align: center; color: var(--text-muted);">
                        No memory capsules found
                    </td>
                </tr>
            `;
        }

        return this.filteredMemories.map(memory => {
            // Extract numeric ID for display
            let displayId = memory.id;
            if (this.memoryType === 'public' && displayId.startsWith('public_')) {
                displayId = displayId.replace('public_', '');
            } else if (this.memoryType === 'private') {
                // For private memories like "Aether_private_1", extract just the number
                const match = displayId.match(/_private_(\d+)$/);
                if (match) {
                    displayId = match[1];
                } else {
                    // Fallback if pattern doesn't match
                    displayId = displayId.replace(/.*_/, '');
                }
            }

            return `
                <tr onclick="router.navigate('#/${router.currentStationId}/memory/${this.memoryType}/${memory.id}')">
                    <td title="${this.escapeHtml(memory.name)}">${this.truncateName(this.escapeHtml(memory.name))}</td>
                    <td>${displayId}</td>
                    <td>${this.escapeHtml(memory.author)}</td>
                    <td>${this.escapeHtml(memory.author_model || 'Unknown')}</td>
                    <td>${memory.creation_tick}</td>
                    <td>${memory.last_update_tick}</td>
                    <td>${memory.num_messages}</td>
                    <td>${memory.word_count.toLocaleString()}</td>
                </tr>
            `;
        }).join('');
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

    sortMemories(column, order = null) {
        // Toggle order if same column
        if (this.currentSort.column === column && order === null) {
            order = this.currentSort.order === 'asc' ? 'desc' : 'asc';
        } else if (order === null) {
            order = 'asc';
        }

        this.currentSort = { column, order };

        this.filteredMemories.sort((a, b) => {
            let aVal = a[column];
            let bVal = b[column];

            // Handle special cases
            if (column === 'id') {
                // Extract numeric part for proper sorting
                const aMatch = aVal.match(/_(\d+)$/);
                const bMatch = bVal.match(/_(\d+)$/);
                aVal = aMatch ? parseInt(aMatch[1]) : 0;
                bVal = bMatch ? parseInt(bMatch[1]) : 0;
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

    filterMemories(searchTerm) {
        const term = searchTerm.toLowerCase();

        if (!term) {
            this.filteredMemories = [...this.memories];
        } else {
            this.filteredMemories = this.memories.filter(memory => {
                const searchFields = [
                    memory.name.toLowerCase(),
                    memory.author.toLowerCase(),
                    memory.id.toLowerCase()
                ];

                // Add lineage to search fields if it exists
                if (memory.lineage) {
                    searchFields.push(memory.lineage.toLowerCase());
                }

                return searchFields.some(field => field.includes(term));
            });
        }

        // Show/hide clear button based on filter state
        const clearBtn = document.getElementById('clear-filters-btn');
        if (clearBtn) {
            clearBtn.style.display = term ? '' : 'none';
        }

        // Reapply current sort
        this.sortMemories(this.currentSort.column, this.currentSort.order);
    }

    clearFilters() {
        const searchBox = document.getElementById('search-memories');
        if (searchBox) {
            searchBox.value = '';
        }
        this.filterMemories('');

        // Hide clear button
        const clearBtn = document.getElementById('clear-filters-btn');
        if (clearBtn) {
            clearBtn.style.display = 'none';
        }
    }

    updateTable() {
        const tbody = document.querySelector('#memories-table tbody');
        if (tbody) {
            tbody.innerHTML = this.renderMemoryRows();
        }

        // Update sort indicators
        document.querySelectorAll('#memories-table th.sortable').forEach(th => {
            const column = th.getAttribute('data-sort');
            th.classList.remove('sort-asc', 'sort-desc');
            if (column === this.currentSort.column) {
                th.classList.add(this.currentSort.order === 'asc' ? 'sort-asc' : 'sort-desc');
            }
        });
    }

    async renderDetail(dataLoader, type, capsuleId) {
        try {
            // Determine the correct path based on type
            let capsulePath;
            if (type === 'public') {
                capsulePath = `capsules/public/${capsuleId}.yaml`;
            } else {
                // For private, we need to find the lineage directory
                // First, check if we have the memory in our current list
                const memory = this.memories.find(m => m.id === capsuleId);
                if (memory && memory.lineage) {
                    capsulePath = `capsules/private/lineage_${memory.lineage}/${capsuleId}.yaml`;
                } else {
                    // Try to extract lineage from the capsule ID
                    const lineageMatch = capsuleId.match(/^([^_]+)_private_/);
                    if (lineageMatch) {
                        const lineage = lineageMatch[1];
                        capsulePath = `capsules/private/lineage_${lineage}/${capsuleId}.yaml`;
                    } else {
                        throw new Error('Could not determine lineage for private memory');
                    }
                }
            }

            const capsuleData = await dataLoader.loadYAML(capsulePath);

            if (!capsuleData || capsuleData.is_deleted) {
                return `
                    <a href="#/${router.currentStationId}/memory/${type}" class="back-button">
                        ← Back to ${type === 'public' ? 'Public' : 'Private'} Memory
                    </a>
                    <div class="error-message">
                        Memory capsule not found or has been deleted.
                    </div>
                `;
            }

            // Render the detail view
            return `
                <a href="#/${router.currentStationId}/memory/${type}" class="back-button">
                    ← Back to ${type === 'public' ? 'Public' : 'Private'} Memory
                </a>

                <div class="memory-detail">
                    <div class="memory-header">
                        <h1 class="memory-title">${this.escapeHtml(capsuleData.title || 'Untitled')}</h1>
                        <div class="memory-metadata">
                            <div class="metadata-item">
                                <span class="metadata-label">Author:</span>
                                <span class="metadata-value">${this.escapeHtml(capsuleData.author_name)}</span>
                            </div>
                            ${capsuleData.author_lineage ? `
                                <div class="metadata-item">
                                    <span class="metadata-label">Lineage:</span>
                                    <span class="metadata-value">${this.escapeHtml(capsuleData.author_lineage)}</span>
                                </div>
                            ` : ''}
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
                            <div class="memory-abstract">
                                <h3>Abstract</h3>
                                <p>${this.escapeHtml(capsuleData.abstract)}</p>
                            </div>
                        ` : ''}
                        ${capsuleData.tags && capsuleData.tags.length > 0 ? `
                            <div class="memory-tags">
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
            console.error('Error loading memory capsule:', error);
            return `
                <a href="#/${router.currentStationId}/memory/${type}" class="back-button">
                    ← Back to ${type === 'public' ? 'Public' : 'Private'} Memory
                </a>
                <div class="error-message">
                    Error loading memory capsule: ${error.message}
                </div>
            `;
        }
    }

    renderMessages(messages) {
        if (!messages || messages.length === 0) {
            return '<div class="empty-state">No messages in this memory capsule.</div>';
        }

        return messages.map(msg => {
            if (msg.is_deleted) return '';

            return `
                <div class="chat-entry">
                    <div class="chat-bubble memory-message">
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
        const headers = document.querySelectorAll('#memories-table th.sortable');
        headers.forEach(th => {
            th.onclick = () => {
                const column = th.getAttribute('data-sort');
                if (window.currentMemoryPage) {
                    window.currentMemoryPage.sortMemories(column);
                }
            };
        });
    }
}

// Create global instance
window.memoryPage = new MemoryPage();