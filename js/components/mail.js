/**
 * Mail Component - Mail Conversations
 */

class MailPage {
    constructor() {
        this.mails = [];
        this.filteredMails = [];
        this.currentSort = { column: 'creation_tick', order: 'asc' };
    }

    async renderList(dataLoader) {
        try {
            // Load mail index
            const indexPath = dataLoader.basePath + 'capsules/mail/_index.json';
            const response = await fetch(indexPath);

            if (!response.ok) {
                // No mails or index not generated
                return `
                    <div class="page-header">
                        <h1 class="page-title">Mail</h1>
                    </div>
                    <div class="empty-state">
                        <h3>No Mail Threads Found</h3>
                        <p>This station has no mail conversations or the index needs to be generated.</p>
                        <p>Run <code>python scripts/add_station.py</code> to generate indices.</p>
                    </div>
                `;
            }

            const data = await response.json();
            this.mails = data.mails || [];
            this.filteredMails = [...this.mails];

            // Apply default sort (ascending by creation tick)
            this.sortMails('creation_tick', 'asc');

            // Store this instance globally for event handlers
            window.currentMailPage = this;

            // Attach event handlers after DOM updates
            setTimeout(() => {
                this.attachEventHandlers();
            }, 0);

            return `
                <div class="page-header">
                    <h1 class="page-title">Mail</h1>
                </div>

                <div class="filter-bar">
                    <input type="text" id="search-mails" placeholder="Search mail by subject, author, recipients..."
                           onkeyup="window.currentMailPage && window.currentMailPage.filterMails(this.value)"/>
                    <button class="clear-filters-btn" id="clear-filters-btn"
                            onclick="window.currentMailPage && window.currentMailPage.clearFilters()"
                            style="${this.mails.length !== this.filteredMails.length ? '' : 'display: none;'}">
                        Clear Filters
                    </button>
                </div>

                <table class="data-table mail-table" id="mails-table">
                    <thead>
                        <tr>
                            <th class="sortable mail-name-col" data-sort="name">Subject</th>
                            <th class="sortable mail-id-col" data-sort="id">ID</th>
                            <th class="sortable mail-author-col" data-sort="author">Author</th>
                            <th class="sortable mail-model-col" data-sort="author_model">Author Model</th>
                            <th class="sortable mail-recipients-col" data-sort="recipients">Recipients</th>
                            <th class="sortable mail-creation-col" data-sort="creation_tick">Created Tick</th>
                            <th class="sortable mail-update-col" data-sort="last_update_tick">Updated Tick</th>
                            <th class="sortable mail-messages-col" data-sort="num_messages"># Msg</th>
                            <th class="sortable mail-words-col" data-sort="word_count">Words</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.renderMailRows()}
                    </tbody>
                </table>
            `;
        } catch (error) {
            console.error('Error loading mails:', error);
            return `
                <div class="page-header">
                    <h1 class="page-title">Mail</h1>
                </div>
                <div class="error-message">
                    Error loading mail threads: ${error.message}
                </div>
            `;
        }
    }

    renderMailRows() {
        if (this.filteredMails.length === 0) {
            return `
                <tr>
                    <td colspan="9" style="text-align: center; color: var(--text-muted);">
                        No mail threads found
                    </td>
                </tr>
            `;
        }

        return this.filteredMails.map(mail => {
            // Extract numeric ID for display
            let displayId = mail.id;
            if (displayId.startsWith('mail_')) {
                displayId = displayId.replace('mail_', '');
            }

            return `
                <tr onclick="router.navigate('#/${router.currentStationId}/mail/${mail.id}')">
                    <td data-label="Subject" title="${this.escapeHtml(mail.name)}"><span class="cell-value cell-value-long">${this.truncateName(this.escapeHtml(mail.name))}</span></td>
                    <td data-label="ID">${displayId}</td>
                    <td data-label="Author">${this.escapeHtml(mail.author)}</td>
                    <td data-label="Author Model">${this.escapeHtml(mail.author_model || 'Unknown')}</td>
                    <td data-label="Recipients" title="${this.escapeHtml(mail.recipients || 'None')}">${this.truncateRecipients(this.escapeHtml(mail.recipients || 'None'))}</td>
                    <td data-label="Created Tick">${mail.creation_tick}</td>
                    <td data-label="Updated Tick">${mail.last_update_tick}</td>
                    <td data-label="# Msg">${mail.num_messages}</td>
                    <td data-label="Words">${mail.word_count.toLocaleString()}</td>
                </tr>
            `;
        }).join('');
    }

    truncateName(name, maxLength = 80) {
        if (name.length <= maxLength) return name;
        return name.substring(0, maxLength) + '...';
    }

    truncateRecipients(recipients, maxLength = 20) {
        if (recipients.length <= maxLength) return recipients;
        return recipients.substring(0, maxLength) + '...';
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    sortMails(column, order = null) {
        // Toggle order if same column
        if (this.currentSort.column === column && order === null) {
            order = this.currentSort.order === 'asc' ? 'desc' : 'asc';
        } else if (order === null) {
            order = 'asc';
        }

        this.currentSort = { column, order };

        this.filteredMails.sort((a, b) => {
            let aVal = a[column];
            let bVal = b[column];

            // Handle special cases
            if (column === 'id') {
                // Extract numeric part for proper sorting
                const aMatch = aVal.match(/mail_(\d+)$/);
                const bMatch = bVal.match(/mail_(\d+)$/);
                aVal = aMatch ? parseInt(aMatch[1]) : parseInt(aVal.replace('mail_', '')) || 0;
                bVal = bMatch ? parseInt(bMatch[1]) : parseInt(bVal.replace('mail_', '')) || 0;
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

    filterMails(searchTerm) {
        const term = searchTerm.toLowerCase();

        if (!term) {
            this.filteredMails = [...this.mails];
        } else {
            this.filteredMails = this.mails.filter(mail => {
                const searchFields = [
                    mail.name.toLowerCase(),
                    mail.author.toLowerCase(),
                    mail.id.toLowerCase(),
                    (mail.recipients || '').toLowerCase()
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
        this.sortMails(this.currentSort.column, this.currentSort.order);
    }

    clearFilters() {
        const searchBox = document.getElementById('search-mails');
        if (searchBox) {
            searchBox.value = '';
        }
        this.filterMails('');

        // Hide clear button
        const clearBtn = document.getElementById('clear-filters-btn');
        if (clearBtn) {
            clearBtn.style.display = 'none';
        }
    }

    updateTable() {
        const tbody = document.querySelector('#mails-table tbody');
        if (tbody) {
            tbody.innerHTML = this.renderMailRows();
        }

        // Update sort indicators
        document.querySelectorAll('#mails-table th.sortable').forEach(th => {
            const column = th.getAttribute('data-sort');
            th.classList.remove('sort-asc', 'sort-desc');
            if (column === this.currentSort.column) {
                th.classList.add(this.currentSort.order === 'asc' ? 'sort-asc' : 'sort-desc');
            }
        });
    }

    extractRecipients(messages, originalAuthor) {
        const recipients = new Set();
        if (messages && Array.isArray(messages)) {
            for (const msg of messages) {
                if (!msg.is_deleted && msg.author_name && msg.author_name !== originalAuthor) {
                    recipients.add(msg.author_name);
                }
            }
        }
        return recipients.size > 0 ? Array.from(recipients).sort().join(', ') : 'None';
    }

    async renderDetail(dataLoader, mailId) {
        try {
            // Load the specific mail capsule
            const capsulePath = `capsules/mail/${mailId}.yaml`;
            const capsuleData = await dataLoader.loadYAML(capsulePath);

            if (!capsuleData || capsuleData.is_deleted) {
                return `
                    <div class="error-message">
                        Mail thread not found or has been deleted.
                    </div>
                `;
            }

            // Extract recipients from the messages
            const recipients = this.extractRecipients(capsuleData.messages, capsuleData.author_name);

            // Render the detail view
            return `
                <div class="mail-detail">
                    <div class="mail-header">
                        <h1 class="mail-title">${this.escapeHtml(capsuleData.title || 'Untitled')}</h1>
                        <div class="mail-metadata">
                            <div class="metadata-item">
                                <span class="metadata-label">Started by:</span>
                                <span class="metadata-value">${this.escapeHtml(capsuleData.author_name)}</span>
                            </div>
                            <div class="metadata-item">
                                <span class="metadata-label">Recipients:</span>
                                <span class="metadata-value">${this.escapeHtml(recipients)}</span>
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
                            <div class="mail-abstract">
                                <h3>Abstract</h3>
                                <p>${this.escapeHtml(capsuleData.abstract)}</p>
                            </div>
                        ` : ''}
                        ${capsuleData.tags && capsuleData.tags.length > 0 ? `
                            <div class="mail-tags">
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
            console.error('Error loading mail thread:', error);
                return `
                    <div class="error-message">
                        Error loading mail thread: ${error.message}
                    </div>
                `;
        }
    }

    renderMessages(messages) {
        if (!messages || messages.length === 0) {
            return '<div class="empty-state">No messages in this mail thread.</div>';
        }

        return messages.map(msg => {
            if (msg.is_deleted) return '';

            return `
                <div class="chat-entry">
                    <div class="chat-bubble mail-message">
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
        const headers = document.querySelectorAll('#mails-table th.sortable');
        headers.forEach(th => {
            th.onclick = () => {
                const column = th.getAttribute('data-sort');
                if (window.currentMailPage) {
                    window.currentMailPage.sortMails(column);
                }
            };
        });
    }
}

// Create global instance
window.mailPage = new MailPage();
