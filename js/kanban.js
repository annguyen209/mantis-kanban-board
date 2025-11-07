/**
 * Simple Kanban Board JavaScript
 * Handles drag and drop functionality, column visibility, and AJAX updates
 */

// Configuration object to hold data from PHP
var KanbanConfig = window.KanbanConfig || {};

// Kanban Drag and Drop Functionality
document.addEventListener('DOMContentLoaded', function() {
    // Get configuration from DOM data attributes (CSP-compliant)
    const configElement = document.getElementById('kanban-config');
    if (configElement) {
        window.KanbanConfig = {
            updateStatusUrl: configElement.dataset.updateStatusUrl,
            viewUrl: configElement.dataset.viewUrl
        };
    }
    
    // Initialize column visibility first
    setTimeout(() => {
        initializeColumnVisibility();
        
        // Force show all checked columns to ensure they're visible
        document.querySelectorAll('.column-toggle input:checked').forEach(checkbox => {
            const statusId = checkbox.id.replace('toggle-', '');
            const column = document.querySelector(`.kanban-column[data-status-id="${statusId}"]`);
            if (column) {
                column.classList.remove('hidden');
            }
        });
        
        // Double check - show ALL columns initially, then hide unchecked ones
        document.querySelectorAll('.kanban-column').forEach(column => {
            const statusId = column.dataset.statusId;
            const checkbox = document.getElementById(`toggle-${statusId}`);
            if (checkbox && checkbox.checked) {
                column.classList.remove('hidden');
            } else if (checkbox && !checkbox.checked) {
                column.classList.add('hidden');
            }
        });
    }, 200);
    
    
    // Set up event listeners for column toggles
    setupColumnToggleListeners();
    
    // Initialize drag and drop functionality for all visible columns
    if (window.reinitializeDragDrop) {
        window.reinitializeDragDrop();
    }
    
    // Add keyboard support for accessibility
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            // Hide feedback on Escape
            const feedback = document.getElementById('drag-feedback');
            if (feedback) {
                feedback.classList.remove('show');
            }
        }
    });
    
    // Initialize card event handlers
    initializeCardEventHandlers();
});

function initializeCardEventHandlers() {
    // Add single-click to open modal, remove double-click behavior
    document.querySelectorAll('.kanban-card').forEach(card => {
        // Skip if already initialized
        if (card.hasAttribute('data-events-initialized')) {
            return;
        }
        
        card.addEventListener('click', function(e) {
            // Don't open modal if clicking on external link button
            if (e.target.closest('.kanban-card-external-link')) {
                return;
            }
            
            // Don't open modal if clicking on assignee (for dropdown functionality)
            if (e.target.closest('.kanban-card-assignee')) {
                return;
            }
            
            const bugId = this.getAttribute('data-bug-id');
            if (bugId) {
                openTicketModal(bugId);
            }
        });
        
        // Add cursor pointer and tooltip
        card.style.cursor = 'pointer';
        card.setAttribute('title', 'Click to view details, drag to move between statuses');
        card.setAttribute('data-events-initialized', 'true');
    });
    
    // Handle external link button clicks
    document.querySelectorAll('.kanban-card-external-link').forEach(button => {
        // Skip if already initialized
        if (button.hasAttribute('data-events-initialized')) {
            return;
        }
        
        button.addEventListener('click', function(e) {
            e.stopPropagation(); // Prevent card click event
            const bugUrl = this.getAttribute('data-bug-url');
            if (bugUrl) {
                window.open(bugUrl, '_blank');
            }
        });
        
        button.setAttribute('data-events-initialized', 'true');
    });
    
    // Handle assignee clicks
    document.querySelectorAll('.kanban-card-assignee').forEach(assignee => {
        // Skip if already initialized
        if (assignee.hasAttribute('data-events-initialized')) {
            return;
        }
        
        assignee.addEventListener('click', handleAssigneeClick);
        assignee.setAttribute('data-events-initialized', 'true');
    });
}

// Set up event listeners for column visibility controls
function setupColumnToggleListeners() {
    // Add listeners for column toggle divs
    const toggles = document.querySelectorAll('.column-toggle');
    
    toggles.forEach(toggle => {
        const checkbox = toggle.querySelector('input[type="checkbox"]');
        const statusId = checkbox.id.replace('toggle-', '');
        // Add click listener to the toggle div
        toggle.addEventListener('click', function(e) {
            // Prevent double-triggering if clicking on the checkbox itself
            if (e.target.type !== 'checkbox') {
                e.preventDefault();
                toggleColumn(statusId);
            }
        });
        
        // Add listener to checkbox change
        checkbox.addEventListener('change', function() {
            updateColumnVisibility(statusId, this.checked);
            
            // Update toggle appearance
            if (this.checked) {
                toggle.classList.add('active');
            } else {
                toggle.classList.remove('active');
            }
        });
    });
    
    // Add listeners for show all / hide empty buttons
    const showAllBtn = document.getElementById('show-all-btn');
    const hideEmptyBtn = document.getElementById('hide-empty-btn');
    
    if (showAllBtn) {
        showAllBtn.addEventListener('click', showAllColumns);
    }
    
    if (hideEmptyBtn) {
        hideEmptyBtn.addEventListener('click', hideEmptyColumns);
    }
}

// Column visibility functions
function toggleColumn(statusId) {
    const checkbox = document.getElementById(`toggle-${statusId}`);
    const isChecked = !checkbox.checked;
    checkbox.checked = isChecked;
    updateColumnVisibility(statusId, isChecked);
    
    // Update toggle appearance
    const toggle = checkbox.closest('.column-toggle');
    if (isChecked) {
        toggle.classList.add('active');
    } else {
        toggle.classList.remove('active');
    }
}

function updateColumnVisibility(statusId, show) {
    const column = document.querySelector(`.kanban-column[data-status-id="${statusId}"]`);
    
    if (column) {
        if (show) {
            column.classList.remove('hidden');
        } else {
            column.classList.add('hidden');
        }
    }
    
    // Reinitialize drag and drop when columns change
    if (window.reinitializeDragDrop) {
        window.reinitializeDragDrop();
    }
    
    // Save preferences to localStorage
    saveColumnPreferences();
}

function showAllColumns() {
    document.querySelectorAll('.column-toggle input').forEach(checkbox => {
        checkbox.checked = true;
        updateColumnVisibility(checkbox.id.replace('toggle-', ''), true);
        checkbox.closest('.column-toggle').classList.add('active');
    });
    
    // Reinitialize drag and drop
    if (window.reinitializeDragDrop) {
        window.reinitializeDragDrop();
    }
}

function hideEmptyColumns() {
    document.querySelectorAll('.kanban-column').forEach(column => {
        const statusId = column.dataset.statusId;
        const hasBugs = column.dataset.hasBugs === 'true';
        const checkbox = document.getElementById(`toggle-${statusId}`);
        
        if (checkbox) {
            checkbox.checked = hasBugs;
            updateColumnVisibility(statusId, hasBugs);
            
            const toggle = checkbox.closest('.column-toggle');
            if (hasBugs) {
                toggle.classList.add('active');
            } else {
                toggle.classList.remove('active');
            }
        }
    });
    
    // Reinitialize drag and drop
    if (window.reinitializeDragDrop) {
        window.reinitializeDragDrop();
    }
}

function saveColumnPreferences() {
    const preferences = {};
    document.querySelectorAll('.column-toggle input').forEach(checkbox => {
        const statusId = checkbox.id.replace('toggle-', '');
        preferences[statusId] = checkbox.checked;
    });
    localStorage.setItem('kanban-column-preferences', JSON.stringify(preferences));
}

function loadColumnPreferences() {
    const saved = localStorage.getItem('kanban-column-preferences');
    if (saved) {
        try {
            return JSON.parse(saved);
        } catch (e) {
            // Could not parse saved preferences
        }
    }
    return null;
}

function initializeColumnVisibility() {
    const preferences = loadColumnPreferences();
    
    if (preferences) {
        // Apply saved preferences
        Object.entries(preferences).forEach(([statusId, show]) => {
            const checkbox = document.getElementById(`toggle-${statusId}`);
            if (checkbox) {
                checkbox.checked = show;
                updateColumnVisibility(statusId, show);
                
                const toggle = checkbox.closest('.column-toggle');
                if (show) {
                    toggle.classList.add('active');
                } else {
                    toggle.classList.remove('active');
                }
            }
        });
    } else {
        // First time - show all columns that are present on the page
        const columns = document.querySelectorAll('.kanban-column');
        
        columns.forEach(column => {
            const statusId = column.dataset.statusId;
            
            // Check if column has bugs or is a default status
            const hasBugs = column.dataset.hasBugs === 'true';
            const defaultStatuses = ['10', '20', '30', '40', '50', '60', '70', '75', '80', '90'];
            const shouldShow = defaultStatuses.includes(statusId) || hasBugs;
            
            const checkbox = document.getElementById(`toggle-${statusId}`);
            if (checkbox) {
                checkbox.checked = shouldShow;
                updateColumnVisibility(statusId, shouldShow);
                
                const toggle = checkbox.closest('.column-toggle');
                if (shouldShow) {
                    toggle.classList.add('active');
                } else {
                    toggle.classList.remove('active');
                }
            }
        });
        
        // Save the initial preferences
        saveColumnPreferences();
    }
}

// Global function to reinitialize drag and drop when columns change
window.reinitializeDragDrop = function() {
    setTimeout(() => {
        // Reinitialize sortable for visible columns
        const visibleColumns = document.querySelectorAll('.kanban-column:not(.hidden) .kanban-column-body');
        
        // Store existing instances if any
        if (!window.sortableInstances) {
            window.sortableInstances = [];
        }
        
        // Destroy old instances
        window.sortableInstances.forEach(instance => {
            if (instance && instance.destroy) {
                instance.destroy();
            }
        });
        window.sortableInstances = [];
        
        // Create new instances for visible columns
        visibleColumns.forEach(function(column) {
            const sortableInstance = new Sortable(column, {
                group: 'kanban',
                animation: 150,
                ghostClass: 'sortable-ghost',
                dragClass: 'sortable-drag',
                
                onStart: function(evt) {
                    evt.from.classList.add('drag-over');
                },
                
                onEnd: function(evt) {
                    document.querySelectorAll('.kanban-column-body').forEach(col => col.classList.remove('drag-over'));
                    
                    if (evt.from !== evt.to) {
                        const bugId = evt.item.getAttribute('data-bug-id');
                        const newStatus = evt.to.getAttribute('data-status');
                        const oldStatus = evt.from.getAttribute('data-status');
                        
                        if (bugId && newStatus && oldStatus !== newStatus) {
                            if (window.updateBugStatus) {
                                window.updateBugStatus(bugId, newStatus, evt.item, evt.from, evt.to);
                            }
                        }
                    }
                },
                
                onMove: function(evt) {
                    if (evt.to !== evt.from) {
                        evt.to.classList.add('drag-over');
                    }
                    return true;
                }
            });
            
            window.sortableInstances.push(sortableInstance);
        });
        
    }, 100);
};

// Make updateBugStatus globally accessible
window.updateBugStatus = function(bugId, newStatus, cardElement, fromColumn, toColumn) {
    const feedback = document.getElementById('drag-feedback');
    
    // Show loading feedback
    showFeedback('Updating bug status...', 'info');
    
    // Disable the card during update
    cardElement.style.opacity = '0.6';
    cardElement.style.pointerEvents = 'none';
    
    // Prepare AJAX request
    const formData = new FormData();
    formData.append('bug_id', bugId);
    formData.append('new_status', newStatus);
    
    fetch(KanbanConfig.updateStatusUrl, {
        method: 'POST',
        body: formData,
        headers: {
            'X-Requested-With': 'XMLHttpRequest'
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Success - update UI
            let message = `Bug #${bugId} moved to ${data.status_name}`;
            
            // Check if auto-assignment occurred
            if (data.was_auto_assigned && data.assigned_to) {
                message += ` and assigned to ${data.assigned_to}`;
                
                // Update the assignee display in the card
                updateCardAssignee(cardElement, data.assigned_to, true);
            } else if (data.assigned_to) {
                // Update assignee display even if not auto-assigned (in case it changed)
                updateCardAssignee(cardElement, data.assigned_to, false);
            }
            
            showFeedback(message, 'success');
            
            // Update column counts
            updateColumnCounts(fromColumn, toColumn);
            
            // Re-enable the card
            cardElement.style.opacity = '1';
            cardElement.style.pointerEvents = 'auto';
            
        } else {
            // Error - revert the move
            fromColumn.appendChild(cardElement);
            showFeedback(`Error: ${data.error}`, 'error');
            
            // Re-enable the card
            cardElement.style.opacity = '1';
            cardElement.style.pointerEvents = 'auto';
        }
    })
    .catch(error => {
        // Network error - revert the move
        fromColumn.appendChild(cardElement);
        showFeedback('Network error. Please try again.', 'error');
        
        // Re-enable the card
        cardElement.style.opacity = '1';
        cardElement.style.pointerEvents = 'auto';
    });
    
    // Function to show feedback messages
    function showFeedback(message, type) {
        feedback.textContent = message;
        feedback.className = 'drag-feedback show';
        
        if (type === 'error') {
            feedback.classList.add('error');
        } else {
            feedback.classList.remove('error');
        }
        
        // Auto-hide after 3 seconds
        setTimeout(() => {
            feedback.classList.remove('show');
        }, 3000);
    }
    
    // Function to update column counts
    function updateColumnCounts(fromColumn, toColumn) {
        // Update 'from' column count
        const fromCards = fromColumn.querySelectorAll('.kanban-card').length;
        const fromHeader = fromColumn.closest('.kanban-column').querySelector('.kanban-column-count');
        fromHeader.textContent = fromCards;
        
        // Update 'to' column count
        const toCards = toColumn.querySelectorAll('.kanban-card').length;
        const toHeader = toColumn.closest('.kanban-column').querySelector('.kanban-column-count');
        toHeader.textContent = toCards;
        
        // Hide/show empty message
        updateEmptyMessage(fromColumn);
        updateEmptyMessage(toColumn);
    }
    
    // Function to update empty messages
    function updateEmptyMessage(column) {
        const cards = column.querySelectorAll('.kanban-card');
        const emptyMessage = column.querySelector('.kanban-empty');
        
        if (cards.length === 0 && !emptyMessage) {
            // Add empty message
            const emptyDiv = document.createElement('div');
            emptyDiv.className = 'kanban-empty';
            emptyDiv.textContent = 'No bugs in this status';
            column.appendChild(emptyDiv);
        } else if (cards.length > 0 && emptyMessage) {
            // Remove empty message
            emptyMessage.remove();
        }
    }
    
    // Function to update card assignee display
    function updateCardAssignee(cardElement, assignedTo, isAssigned) {
        const assigneeElement = cardElement.querySelector('.kanban-card-assignee');
        if (assigneeElement) {
            if (isAssigned && assignedTo) {
                // Update to show assigned user
                assigneeElement.textContent = `👤 ${assignedTo}`;
                assigneeElement.className = 'kanban-card-assignee assigned';
            } else if (assignedTo) {
                // Update existing assignment
                assigneeElement.textContent = `👤 ${assignedTo}`;
                assigneeElement.className = 'kanban-card-assignee assigned';
            } else {
                // Update to show unassigned
                assigneeElement.textContent = '👤 Unassigned';
                assigneeElement.className = 'kanban-card-assignee unassigned';
            }
        }
    }
};

// Filter functionality
document.addEventListener('DOMContentLoaded', function() {
    initializeFilters();
    initializeRefreshButton();
    initializeAssigneeModal();
    initializeCardEventHandlers(); // Initialize card events
    
    // Close modals when clicking outside
    document.addEventListener('click', function(e) {
        // Close ticket modal
        const ticketModal = document.getElementById('ticketModal');
        if (ticketModal && e.target === ticketModal) {
            closeModal();
        }
        
        // Close assignee modal
        const assigneeModal = document.getElementById('assignee-modal');
        if (assigneeModal && e.target === assigneeModal) {
            closeAssigneeModal();
        }
    });
    
    // Additional initialization for search when panel is opened
    document.addEventListener('click', function(e) {
        if (e.target && e.target.id === 'filter-btn') {
            setTimeout(() => {
                setupOptionsSearch();
            }, 200);
        }
    });
});

function setupOptionsSearch() {
    const searchInput = document.getElementById('options-search');
    
    if (searchInput) {
        searchInput.addEventListener('input', function(e) {
            performSearch(e.target.value);
        });
        
        searchInput.addEventListener('keyup', function(e) {
            performSearch(e.target.value);
        });
    }
}

function performSearch(searchValue) {
    const searchTerm = searchValue.toLowerCase().trim();
    const activeOptions = document.querySelector('.filter-options.active');
    
    if (!activeOptions) return;
    
    const checkboxes = activeOptions.querySelectorAll('.filter-checkbox');
    let visibleCount = 0;
    
    checkboxes.forEach(checkbox => {
        const textElement = checkbox.querySelector('.filter-text');
        if (textElement) {
            const text = textElement.textContent.toLowerCase();
            if (searchTerm === '' || text.includes(searchTerm)) {
                checkbox.classList.remove('hidden');
                visibleCount++;
            } else {
                checkbox.classList.add('hidden');
            }
        }
    });
    
    // Update count
    const countElement = document.getElementById('selection-count');
    if (countElement) {
        const selectedOptions = activeOptions.querySelectorAll('input[type="checkbox"]:checked').length;
        countElement.textContent = `${selectedOptions} of ${visibleCount}`;
    }
}

function initializeRefreshButton() {
    const refreshBtn = document.getElementById('refresh-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function() {
            window.location.reload();
        });
    }
}

function initializeFilters() {
    const filterBtn = document.getElementById('filter-btn');
    const filterPanel = document.getElementById('filter-panel');
    const searchInput = document.getElementById('board-search');
    
    // Show filter panel
    if (filterBtn) {
        filterBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            toggleFilterPanel();
        });
    }

function toggleFilterPanel() {
    const overlay = document.getElementById('filter-panel-overlay');
    const panel = document.getElementById('filter-panel');
    const btn = document.querySelector('.filter-btn');
    
    if (overlay && panel && btn) {
        const isActive = overlay.classList.contains('active');
        
        if (isActive) {
            overlay.classList.remove('active');
            panel.classList.remove('active');
            btn.classList.remove('active');
            document.body.classList.remove('filter-panel-lock');
        } else {
            overlay.classList.add('active');
            panel.classList.add('active');
            btn.classList.add('active');
            document.body.classList.add('filter-panel-lock');
            
            // Setup search when panel opens
            setTimeout(() => {
                setupOptionsSearch();
                initializeOptionsSearch();
            }, 100);
        }
    }
}

function closeFilterPanel() {
    const overlay = document.getElementById('filter-panel-overlay');
    const panel = document.getElementById('filter-panel');
    const btn = document.querySelector('.filter-btn');
    
    if (overlay && panel && btn) {
        overlay.classList.remove('active');
        panel.classList.remove('active');
        btn.classList.remove('active');
        document.body.classList.remove('filter-panel-lock');
    }
}

    // Initialize filter panel
    const filterOverlay = document.getElementById('filter-panel-overlay');
    
    if (filterPanel && filterOverlay) {
        // Close panel handlers
        const closeBtn = document.getElementById('filter-panel-close');
        
        if (closeBtn) {
            closeBtn.addEventListener('click', closeFilterPanel);
        }
        
        // Close on overlay click (but not panel click)
        filterOverlay.addEventListener('click', function(e) {
            if (e.target === filterOverlay) {
                closeFilterPanel();
            }
        });
        
        // Close on outside click
        document.addEventListener('click', function(e) {
            if (!filterPanel.contains(e.target) && !filterBtn.contains(e.target)) {
                closeFilterPanel();
            }
        });
        
        // Close on Escape
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && filterOverlay.classList.contains('active')) {
                closeFilterPanel();
            }
        });
    }
    
    // Handle category selection
    document.querySelectorAll('.filter-category').forEach(category => {
        category.addEventListener('click', function() {
            const categoryType = this.dataset.category;
            switchFilterCategory(categoryType);
        });
    });
    
    // Real-time search
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            applyFilters();
            updateActiveFiltersDisplay();
        });
    }
    
    // Initialize options search
    initializeOptionsSearch();
    
    // Auto-apply filters when checkboxes change
    document.querySelectorAll('input[type="checkbox"][data-filter]').forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            // Special handling for parent filter
            if (this.dataset.filter === 'parent') {
                handleParentFilter(this);
            } else {
                applyFilters();
                updateSelectionCount();
                updateActiveFiltersDisplay();
            }
        });
    });
    
    // Initialize with assignee category
    switchFilterCategory('assignee');
    
    // Initialize active filters display
    updateActiveFiltersDisplay();
    
    // Add clear all filters button listener
    const clearAllBtn = document.getElementById('clear-all-filters');
    if (clearAllBtn) {
        clearAllBtn.addEventListener('click', clearAllFilters);
    }
    
    // Initialize modal
    initializeModal();
}

function handleParentFilter(checkbox) {
    // Parent filter now works client-side like other filters
    if (checkbox.value === '0') {
        // "Show all tickets" selected - uncheck other parents
        if (checkbox.checked) {
            document.querySelectorAll('input[data-filter="parent"]').forEach(cb => {
                if (cb !== checkbox) {
                    cb.checked = false;
                }
            });
        }
    } else {
        // Specific parent selected - uncheck "Show all tickets"
        if (checkbox.checked) {
            const showAllCheckbox = document.querySelector('input[data-filter="parent"][value="0"]');
            if (showAllCheckbox) {
                showAllCheckbox.checked = false;
            }
        } else {
            // If unchecking and no other parents are selected, check "Show all"
            const selectedParents = document.querySelectorAll('input[data-filter="parent"]:checked:not([value="0"])');
            if (selectedParents.length === 0) {
                const showAllCheckbox = document.querySelector('input[data-filter="parent"][value="0"]');
                if (showAllCheckbox) {
                    showAllCheckbox.checked = true;
                }
            }
        }
    }
    
    // Apply filters without page reload
    applyFilters();
    updateSelectionCount();
    updateActiveFiltersDisplay();
}

function updateParentIdsParameter(urlParams) {
    const selectedParents = Array.from(document.querySelectorAll('input[data-filter="parent"]:checked'))
        .filter(cb => cb.value !== '0')
        .map(cb => cb.value);
    
    if (selectedParents.length > 0) {
        urlParams.set('parent_ids', selectedParents.join(','));
    } else {
        urlParams.delete('parent_ids');
    }
    
    // Remove legacy single parent parameter
    urlParams.delete('parent_id');
}

function initializeOptionsSearch() {
    const optionsSearch = document.getElementById('options-search');
    
    if (optionsSearch) {
        // Clear existing listeners
        optionsSearch.onkeyup = null;
        optionsSearch.oninput = null;
        
        // Use direct event assignment for better compatibility
        optionsSearch.oninput = function() {
            filterOptionsSearch();
        };
        
        optionsSearch.onkeyup = function() {
            filterOptionsSearch();
        };
        
        // Test if search input is accessible
        optionsSearch.addEventListener('focus', function() {
            this.style.borderColor = '#0052CC';
        });
        
        optionsSearch.addEventListener('blur', function() {
            this.style.borderColor = '#DFE1E6';
        });
    }
}

function initializeParentFilter() {
    // Check URL for parent parameters and set the appropriate checkboxes
    const urlParams = new URLSearchParams(window.location.search);
    
    // Check for new multiple parent parameter first
    const parentIdsParam = urlParams.get('parent_ids');
    
    if (parentIdsParam) {
        // Handle multiple parent IDs
        const parentIds = parentIdsParam.split(',').map(id => id.trim());
        let foundAny = false;
        
        parentIds.forEach(parentId => {
            const parentCheckbox = document.querySelector(`input[data-filter="parent"][value="${parentId}"]`);
            if (parentCheckbox) {
                parentCheckbox.checked = true;
                foundAny = true;
            }
        });
        
        if (!foundAny) {
            // No valid parent checkboxes found, default to "show all"
            const showAllCheckbox = document.querySelector('input[data-filter="parent"][value="0"]');
            if (showAllCheckbox) {
                showAllCheckbox.checked = true;
            }
        }
    } else {
        // Fallback to legacy single parent parameter
        const parentId = urlParams.get('parent_id') || '0';
        
        // Find and check the appropriate parent filter checkbox
        const parentCheckbox = document.querySelector(`input[data-filter="parent"][value="${parentId}"]`);
        if (parentCheckbox) {
            parentCheckbox.checked = true;
        } else {
            // Default to "show all" if no matching checkbox found
            const showAllCheckbox = document.querySelector('input[data-filter="parent"][value="0"]');
            if (showAllCheckbox) {
                showAllCheckbox.checked = true;
            }
        }
    }
}

function filterOptionsSearch() {
    const optionsSearch = document.getElementById('options-search');
    if (!optionsSearch) {
        return;
    }
    
    const searchTerm = optionsSearch.value.toLowerCase().trim();
    const activeOptions = document.querySelector('.filter-options.active');
    
    if (activeOptions) {
        const checkboxes = activeOptions.querySelectorAll('.filter-checkbox');
        let visibleCount = 0;
        
        checkboxes.forEach(checkbox => {
            const textElement = checkbox.querySelector('.filter-text');
            if (textElement) {
                const text = textElement.textContent.toLowerCase();
                if (searchTerm === '' || text.includes(searchTerm)) {
                    checkbox.style.display = 'flex';
                    visibleCount++;
                } else {
                    checkbox.style.display = 'none';
                }
            }
        });
        
        // Update the selection count to show filtered results
        const countElement = document.getElementById('selection-count');
        if (countElement) {
            const selectedOptions = activeOptions.querySelectorAll('input[type="checkbox"]:checked').length;
            countElement.textContent = `${selectedOptions} of ${visibleCount}`;
        }
    }
}

function switchFilterCategory(categoryType) {
    // Update active category
    document.querySelectorAll('.filter-category').forEach(cat => {
        cat.classList.remove('active');
    });
    document.querySelector(`[data-category="${categoryType}"]`).classList.add('active');
    
    // Update active options panel
    document.querySelectorAll('.filter-options').forEach(options => {
        options.classList.remove('active');
    });
    document.getElementById(`${categoryType}-options`).classList.add('active');
    
    // Update header title and search visibility
    const titleElement = document.getElementById('current-category-title');
    const searchContainer = document.getElementById('options-search-container');
    const optionsSearch = document.getElementById('options-search');
    
    switch(categoryType) {
        case 'assignee':
            titleElement.textContent = 'Assignee';
            searchContainer.style.display = 'block';
            optionsSearch.placeholder = 'Search assignee';
            break;
        case 'priority':
            titleElement.textContent = 'Priority';
            searchContainer.style.display = 'none';
            break;
        case 'status':
            titleElement.textContent = 'Status';
            searchContainer.style.display = 'none';
            break;
        case 'labels':
            titleElement.textContent = 'Labels';
            searchContainer.style.display = 'block';
            optionsSearch.placeholder = 'Search labels';
            break;
    }
    
    // Clear search when switching categories
    if (optionsSearch) {
        optionsSearch.value = '';
        // Show all options in the new category
        const activeOptions = document.querySelector('.filter-options.active');
        if (activeOptions) {
            activeOptions.querySelectorAll('.filter-checkbox').forEach(checkbox => {
                checkbox.style.display = 'flex';
            });
        }
    }
    
    // Update selection count
    updateSelectionCount();
    
    // Reinitialize search for the new category
    setTimeout(() => {
        initializeOptionsSearch();
    }, 50);
}

function updateSelectionCount() {
    const activeOptions = document.querySelector('.filter-options.active');
    if (activeOptions) {
        const totalOptions = activeOptions.querySelectorAll('.filter-checkbox').length;
        const selectedOptions = activeOptions.querySelectorAll('input[type="checkbox"]:checked').length;
        
        const countElement = document.getElementById('selection-count');
        if (countElement) {
            countElement.textContent = `${selectedOptions} of ${totalOptions}`;
        }
    }
}

function applyFilters() {
    const searchTerm = document.getElementById('board-search').value.toLowerCase();
    
    // Get selected values from checkboxes
    const selectedAssignees = Array.from(document.querySelectorAll('input[data-filter="assignee"]:checked')).map(cb => cb.value);
    const selectedParents = Array.from(document.querySelectorAll('input[data-filter="parent"]:checked')).map(cb => cb.value);
    const selectedPriorities = Array.from(document.querySelectorAll('input[data-filter="priority"]:checked')).map(cb => cb.value);
    const selectedStatuses = Array.from(document.querySelectorAll('input[data-filter="status"]:checked')).map(cb => cb.value);
    
    // Get all cards
    const cards = document.querySelectorAll('.kanban-card');
    
    cards.forEach(card => {
        let showCard = true;
        
        // Search filter
        if (searchTerm) {
            const cardText = card.textContent.toLowerCase();
            if (!cardText.includes(searchTerm)) {
                showCard = false;
            }
        }
        
        // Assignee filter
        if (selectedAssignees.length > 0) {
            const cardAssignee = card.dataset.assignee || '';
            let matchesAssignee = false;
            
            // Check for unassigned (empty string)
            if (selectedAssignees.includes('') && cardAssignee === '') {
                matchesAssignee = true;
            }
            
            // Check for specific assignees
            if (cardAssignee && selectedAssignees.includes(cardAssignee)) {
                matchesAssignee = true;
            }
            
            if (!matchesAssignee) {
                showCard = false;
            }
        }
        
        // Priority filter
        if (selectedPriorities.length > 0) {
            const cardPriority = card.dataset.priority;
            if (!selectedPriorities.includes(cardPriority)) {
                showCard = false;
            }
        }
        
        // Status filter
        if (selectedStatuses.length > 0) {
            const cardStatus = card.dataset.status;
            if (!selectedStatuses.includes(cardStatus)) {
                showCard = false;
            }
        }
        
        // Parent filter
        if (selectedParents.length > 0 && !selectedParents.includes('0')) {
            // If specific parents are selected (not "show all")
            const cardParents = card.dataset.parents ? card.dataset.parents.split(',') : [];
            let matchesParent = false;
            
            // Check if card has any of the selected parents
            for (let selectedParent of selectedParents) {
                if (cardParents.includes(selectedParent)) {
                    matchesParent = true;
                    break;
                }
            }
            
            if (!matchesParent) {
                showCard = false;
            }
        }
        
        // Show/hide card
        if (showCard) {
            card.style.display = '';
        } else {
            card.style.display = 'none';
        }
    });
    
    // Update empty column messages
    updateEmptyColumnMessages();
    
    // Update filter button to show active state
    updateFilterButtonState();
    
    // Update active filters display
    updateActiveFiltersDisplay();
}

function clearFilters() {
    // Clear search
    document.getElementById('board-search').value = '';
    
    // Clear options search
    const optionsSearch = document.getElementById('options-search');
    if (optionsSearch) {
        optionsSearch.value = '';
        // Show all options
        document.querySelectorAll('.filter-checkbox').forEach(checkbox => {
            checkbox.style.display = 'flex';
        });
    }
    
    // Uncheck all checkboxes
    document.querySelectorAll('input[type="checkbox"][data-filter]').forEach(checkbox => {
        checkbox.checked = false;
    });
    
    // Show all cards
    document.querySelectorAll('.kanban-card').forEach(card => {
        card.style.display = '';
    });
    
    // Update empty messages
    updateEmptyColumnMessages();
    
    // Update filter button state
    updateFilterButtonState();
    
    // Update selection count
    updateSelectionCount();
    
    // Close filter panel
    const backdrop = document.getElementById('filter-panel-backdrop');
    document.getElementById('filter-panel').classList.remove('active');
    document.getElementById('filter-btn').classList.remove('active');
    if (backdrop) {
        backdrop.classList.remove('active');
    }
}

function updateFilterButtonState() {
    const filterBtn = document.getElementById('filter-btn');
    const hasActiveFilters = document.querySelectorAll('input[type="checkbox"][data-filter]:checked').length > 0 ||
                           document.getElementById('board-search').value.trim() !== '';
    
    if (hasActiveFilters) {
        filterBtn.classList.add('has-filters');
    } else {
        filterBtn.classList.remove('has-filters');
    }
}

function updateEmptyColumnMessages() {
    document.querySelectorAll('.kanban-column').forEach(column => {
        const visibleCards = column.querySelectorAll('.kanban-card:not([style*="display: none"])');
        const emptyMessage = column.querySelector('.kanban-empty');
        
        if (visibleCards.length === 0) {
            if (!emptyMessage) {
                const newEmptyMessage = document.createElement('div');
                newEmptyMessage.className = 'kanban-empty';
                newEmptyMessage.textContent = 'No matching issues';
                column.querySelector('.kanban-column-body').appendChild(newEmptyMessage);
            } else {
                emptyMessage.style.display = '';
            }
        } else {
            if (emptyMessage) {
                emptyMessage.style.display = 'none';
            }
        }
    });
}

function updateActiveFiltersDisplay() {
    const container = document.getElementById('active-filters');
    const list = document.getElementById('active-filters-list');
    
    if (!container || !list) return;
    
    // Clear existing filter tags
    list.innerHTML = '';
    
    const activeFilters = [];
    
    // Get search filter
    const searchValue = document.getElementById('board-search').value.trim();
    if (searchValue) {
        activeFilters.push({
            type: 'search',
            label: `Search: "${searchValue}"`,
            value: searchValue
        });
    }
    
    // Get assignee filters
    const selectedAssignees = Array.from(document.querySelectorAll('input[data-filter="assignee"]:checked'));
    selectedAssignees.forEach(checkbox => {
        const value = checkbox.value;
        const text = checkbox.parentElement.querySelector('.filter-text').textContent;
        activeFilters.push({
            type: 'assignee',
            label: `Assignee: ${text}`,
            value: value,
            checkbox: checkbox
        });
    });
    
    // Get priority filters
    const selectedPriorities = Array.from(document.querySelectorAll('input[data-filter="priority"]:checked'));
    selectedPriorities.forEach(checkbox => {
        const text = checkbox.parentElement.querySelector('.filter-text').textContent;
        activeFilters.push({
            type: 'priority',
            label: `Priority: ${text}`,
            value: checkbox.value,
            checkbox: checkbox
        });
    });
    
    // Get status filters
    const selectedStatuses = Array.from(document.querySelectorAll('input[data-filter="status"]:checked'));
    selectedStatuses.forEach(checkbox => {
        const text = checkbox.parentElement.querySelector('.filter-text').textContent;
        activeFilters.push({
            type: 'status',
            label: `Status: ${text}`,
            value: checkbox.value,
            checkbox: checkbox
        });
    });
    
    // Get parent filters
    const selectedParents = document.querySelectorAll('input[data-filter="parent"]:checked');
    selectedParents.forEach(checkbox => {
        if (checkbox.value !== '0') { // Skip "Show all" option
            const text = checkbox.parentElement.querySelector('.filter-text').textContent;
            activeFilters.push({
                type: 'parent',
                label: `Parent: ${text}`,
                value: checkbox.value,
                checkbox: checkbox
            });
        }
    });
    
    // Show/hide container based on active filters
    if (activeFilters.length > 0) {
        container.style.display = 'flex';
        
        // Smart display logic for many filters
        const maxVisible = 5; // Maximum visible filters before showing "more"
        const isExpanded = container.classList.contains('expanded');
        
        if (activeFilters.length <= maxVisible || isExpanded) {
            // Show all filters
            activeFilters.forEach(filter => {
                const tag = createFilterTag(filter);
                list.appendChild(tag);
            });
            
            // Add collapse button if expanded and has many filters
            if (isExpanded && activeFilters.length > maxVisible) {
                const collapseBtn = document.createElement('button');
                collapseBtn.className = 'filters-expand-btn';
                collapseBtn.innerHTML = '<i class="fa fa-chevron-up"></i> Show less';
                collapseBtn.addEventListener('click', () => {
                    container.classList.remove('expanded');
                    updateActiveFiltersDisplay();
                });
                list.appendChild(collapseBtn);
            }
        } else {
            // Show first few filters + "more" indicator
            const visibleFilters = activeFilters.slice(0, maxVisible);
            const hiddenCount = activeFilters.length - maxVisible;
            
            visibleFilters.forEach(filter => {
                const tag = createFilterTag(filter);
                list.appendChild(tag);
            });
            
            // Add "more" indicator
            const moreIndicator = document.createElement('div');
            moreIndicator.className = 'filters-more-indicator';
            moreIndicator.textContent = `+${hiddenCount} more`;
            moreIndicator.addEventListener('click', () => {
                container.classList.add('expanded');
                updateActiveFiltersDisplay();
            });
            list.appendChild(moreIndicator);
            
            // Add expand button
            const expandBtn = document.createElement('button');
            expandBtn.className = 'filters-expand-btn';
            expandBtn.innerHTML = '<i class="fa fa-chevron-down"></i> Show all';
            expandBtn.addEventListener('click', () => {
                container.classList.add('expanded');
                updateActiveFiltersDisplay();
            });
            list.appendChild(expandBtn);
        }
        
    } else {
        container.style.display = 'none';
    }
}

function createFilterTag(filter) {
    const tag = document.createElement('div');
    tag.className = 'filter-tag';
    tag.innerHTML = `
        <span>${filter.label}</span>
        <button type="button" class="remove-filter" data-filter-type="${filter.type}" data-filter-value="${filter.value}">
            <i class="fa fa-times"></i>
        </button>
    `;
    
    // Add event listener to remove button
    const removeBtn = tag.querySelector('.remove-filter');
    removeBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        removeFilter(this.dataset.filterType, this.dataset.filterValue);
    });
    
    return tag;
}

function removeFilter(type, value) {
    if (type === 'search') {
        // Clear search input
        document.getElementById('board-search').value = '';
    } else if (type === 'parent') {
        // For parent filter, uncheck the specific parent
        const checkbox = document.querySelector(`input[data-filter="parent"][value="${value}"]`);
        if (checkbox) {
            checkbox.checked = false;
            
            // Check if any other parents are still selected
            const remainingParents = document.querySelectorAll('input[data-filter="parent"]:checked:not([value="0"])');
            if (remainingParents.length === 0) {
                // No parents selected, show all tickets
                const showAllCheckbox = document.querySelector('input[data-filter="parent"][value="0"]');
                if (showAllCheckbox) {
                    showAllCheckbox.checked = true;
                }
            }
        }
    } else {
        // Uncheck the specific checkbox
        const checkbox = document.querySelector(`input[data-filter="${type}"][value="${value}"]`);
        if (checkbox) {
            checkbox.checked = false;
        }
    }
    
    // Reapply filters
    applyFilters();
    updateSelectionCount();
    updateActiveFiltersDisplay();
}

function clearAllFilters() {
    // Clear search
    document.getElementById('board-search').value = '';
    
    // Clear all filter checkboxes except parent=0
    document.querySelectorAll('input[type="checkbox"][data-filter]').forEach(checkbox => {
        if (checkbox.dataset.filter === 'parent' && checkbox.value === '0') {
            checkbox.checked = true; // Keep "show all" selected
        } else {
            checkbox.checked = false;
        }
    });
    
    // Check if parent filter needs URL clearing
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('parent_id')) {
        urlParams.delete('parent_id');
        window.location.search = urlParams.toString();
        return;
    }
    
    // Reapply filters
    applyFilters();
    updateSelectionCount();
    updateActiveFiltersDisplay();
}

// Modal functionality for ticket details
function openTicketModal(bugId) {
    const modal = document.getElementById('ticket-modal');
    if (!modal) return;
    
    const modalTitle = document.getElementById('modal-title');
    const modalLoading = document.getElementById('modal-loading');
    const modalContent = document.getElementById('modal-content');
    const modalError = document.getElementById('modal-error');
    const externalLinkBtn = document.getElementById('modal-external-link');
    const editBtn = document.getElementById('modal-edit');
    
    // Show modal and reset state
    modal.classList.add('show');
    modalLoading.style.display = 'flex';
    modalContent.style.display = 'none';
    modalError.style.display = 'none';
    modalTitle.textContent = `Loading Ticket #${bugId}...`;
    
    // Set up external link button
    externalLinkBtn.onclick = function() {
        if (KanbanConfig.viewUrl) {
            window.open(`${KanbanConfig.viewUrl}${bugId}`, '_blank');
        }
    };
    
    // Set up edit button  
    editBtn.onclick = function() {
        if (KanbanConfig.viewUrl) {
            const editUrl = KanbanConfig.viewUrl.replace('view.php?id=', 'bug_update_page.php?bug_id=');
            window.open(`${editUrl}${bugId}`, '_blank');
        }
    };
    
    // Load ticket details
    loadTicketDetails(bugId);
    
    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden';
}

function loadTicketDetails(bugId) {
    const modalTitle = document.getElementById('modal-title');
    const modalLoading = document.getElementById('modal-loading');
    const modalContent = document.getElementById('modal-content');
    const modalError = document.getElementById('modal-error');
    
    // Show loading state
    modalLoading.style.display = 'block';
    modalContent.style.display = 'none';
    modalError.style.display = 'none';
    modalTitle.textContent = `Loading Ticket #${bugId}...`;
    
    // Get the config data
    const config = document.getElementById('kanban-config');
    const detailsUrl = config.dataset.getDetailsUrl;
    
    // Make AJAX request to get full ticket details
    fetch(detailsUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `bug_id=${bugId}`
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.text();
    })
    .then(text => {
        try {
            const data = JSON.parse(text);
            if (data.success) {
                const bug = data.bug;
            
            // Create ticket content with full details
            modalContent.innerHTML = `
                <div class="ticket-details">
                    <div class="ticket-header">
                        <h3 class="ticket-title">${bug.summary}</h3>
                        <div class="ticket-badges">
                            <span class="badge badge-status">${bug.status_name}</span>
                            <span class="badge badge-priority">${bug.priority_name}</span>
                            <span class="badge badge-severity">${bug.severity_name}</span>
                        </div>
                    </div>
                    
                    <div class="ticket-meta-grid">
                        <div class="meta-item">
                            <strong>Project:</strong> 
                            <span>${bug.project_name}</span>
                        </div>
                        <div class="meta-item">
                            <strong>Reporter:</strong> 
                            <span>${bug.reporter_name}</span>
                        </div>
                        <div class="meta-item">
                            <strong>Assignee:</strong> 
                            <span>${bug.handler_name || 'Unassigned'}</span>
                        </div>
                        <div class="meta-item">
                            <strong>Reproducibility:</strong> 
                            <span>${bug.reproducibility_name}</span>
                        </div>
                        <div class="meta-item">
                            <strong>Date Submitted:</strong> 
                            <span>${bug.date_submitted}</span>
                        </div>
                        <div class="meta-item">
                            <strong>Last Updated:</strong> 
                            <span>${bug.last_updated}</span>
                        </div>
                    </div>
                    
                    <div class="ticket-section">
                        <h4>Description</h4>
                        <div class="ticket-description">
                            ${bug.description || '<em>No description provided</em>'}
                        </div>
                    </div>
                    
                    ${bug.steps_to_reproduce ? `
                    <div class="ticket-section">
                        <h4>Steps to Reproduce</h4>
                        <div class="ticket-steps">
                            ${bug.steps_to_reproduce}
                        </div>
                    </div>
                    ` : ''}
                    
                    ${bug.additional_information ? `
                    <div class="ticket-section">
                        <h4>Additional Information</h4>
                        <div class="ticket-additional">
                            ${bug.additional_information}
                        </div>
                    </div>
                    ` : ''}
                </div>
            `;
            
            modalTitle.textContent = `Ticket #${bug.id}`;
            modalLoading.style.display = 'none';
            modalContent.style.display = 'block';
            
        } else {
            throw new Error(data.error || 'Unknown error occurred');
        }
        } catch (parseError) {
            console.error('JSON parse error:', parseError);
            console.error('Raw response:', text);
            // Fall back to basic card info if AJAX fails
            throw new Error('Server returned invalid response. Showing basic info from card.');
        }
    })
    .catch(error => {
        console.error('Error loading ticket details:', error);
        
        // Fallback: Get basic info from the card
        const card = document.querySelector(`.kanban-card[data-bug-id="${bugId}"]`);
        let fallbackContent = '';
        
        if (card) {
            const title = card.querySelector('.kanban-card-title').textContent.trim();
            const assigneeElement = card.querySelector('.kanban-card-assignee');
            const assigneeName = assigneeElement ? assigneeElement.textContent.trim() : 'Unassigned';
            const column = card.closest('.kanban-column');
            const statusName = column ? column.dataset.statusName : 'Unknown';
            const priorityElement = card.querySelector('.kanban-card-priority');
            const priorityName = priorityElement ? priorityElement.textContent.trim() : 'Normal';
            
            fallbackContent = `
                <div class="ticket-details">
                    <div class="ticket-header">
                        <h3 class="ticket-title">${title}</h3>
                        <div class="ticket-badges">
                            <span class="badge badge-status">${statusName}</span>
                            <span class="badge badge-priority">${priorityName}</span>
                        </div>
                    </div>
                    
                    <div class="ticket-meta-grid">
                        <div class="meta-item">
                            <strong>Assignee:</strong> 
                            <span>${assigneeName}</span>
                        </div>
                    </div>
                    
                    <div class="ticket-section">
                        <h4>Description</h4>
                        <div class="ticket-description">
                            <em>Could not load full ticket details. Please use the "Edit Ticket" button below to view complete information.</em>
                            <br><br>
                            <strong>Error:</strong> ${error.message}
                        </div>
                    </div>
                </div>
            `;
        } else {
            fallbackContent = `
                <div class="ticket-details">
                    <div class="ticket-section">
                        <div class="ticket-description">
                            <em>Could not load ticket details. Please use the "Edit Ticket" button below to view this ticket.</em>
                            <br><br>
                            <strong>Error:</strong> ${error.message}
                        </div>
                    </div>
                </div>
            `;
        }
        
        modalContent.innerHTML = fallbackContent;
        modalTitle.textContent = `Ticket #${bugId}`;
        modalLoading.style.display = 'none';
        modalContent.style.display = 'block';
    });
}

function closeTicketModal() {
    const modal = document.getElementById('ticket-modal');
    if (modal) {
        modal.classList.remove('show');
        document.body.style.overflow = '';
    }
}

function initializeModal() {
    const modal = document.getElementById('ticket-modal');
    if (!modal) return;
    
    const closeBtn = document.getElementById('modal-close');
    const closeFooterBtn = document.getElementById('modal-close-footer');
    const backdrop = modal.querySelector('.modal-backdrop');
    
    // Close modal event listeners
    if (closeBtn) {
        closeBtn.addEventListener('click', closeTicketModal);
    }
    
    if (closeFooterBtn) {
        closeFooterBtn.addEventListener('click', closeTicketModal);
    }
    
    if (backdrop) {
        backdrop.addEventListener('click', closeTicketModal);
    }
    
    // Close modal on Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeTicketModal();
        }
    });
}

// Assignee Dropdown Functionality
let currentAssigneeDropdown = null;
let allUsers = null;

function initializeAssigneeDropdowns() {
    // Reset user data to force fresh load
    allUsers = null;
    
    // Get all users from the current page data
    getAllUsers();
    
    // Initialize assignee modal
    initializeAssigneeModal();
    
    // Add click handlers to all assignee elements
    document.addEventListener('click', handleAssigneeClick);
}

function getAllUsers() {
    if (allUsers) return; // Already loaded
    
    allUsers = [];
    
    try {
        // Get users from filter panel if available
        const assigneeOptions = document.querySelectorAll('#assignee-options .filter-checkbox input');
        if (assigneeOptions.length > 0) {
            assigneeOptions.forEach(option => {
                const userId = parseInt(option.value);
                if (userId && userId > 0) {
                    const userLabel = option.closest('.filter-checkbox');
                    const userNameElement = userLabel ? userLabel.querySelector('.filter-text') : null;
                    if (userNameElement) {
                        const userName = userNameElement.textContent.trim();
                        if (userName) {
                            allUsers.push({
                                id: userId,
                                name: userName
                            });
                        }
                    }
                }
            });
        }
        
        // Fallback: Get users from cards if filter panel is not available
        if (allUsers.length === 0) {
            const cards = document.querySelectorAll('.kanban-card');
            const seenUsers = new Set();
            
            cards.forEach(card => {
                const assigneeElement = card.querySelector('.kanban-card-assignee');
                if (assigneeElement) {
                    let assigneeName = assigneeElement.textContent.trim();
                    // Remove the emoji prefix if it exists
                    assigneeName = assigneeName.replace(/^👤\s*/, '');
                    
                    if (assigneeName && assigneeName !== 'Unassigned' && !seenUsers.has(assigneeName)) {
                        seenUsers.add(assigneeName);
                        // Generate a placeholder ID (we'll handle this in the update function)
                        allUsers.push({
                            id: allUsers.length + 1,
                            name: assigneeName,
                            isPlaceholder: true
                        });
                    }
                }
            });
        }
        
        // Add "Unassigned" option at the beginning
        allUsers.unshift({
            id: 0,
            name: 'Unassigned'
        });
        
    } catch (error) {
        console.error('Error getting users:', error);
        // Provide a minimal fallback
        allUsers = [
            { id: 0, name: 'Unassigned' }
        ];
    }
}

function handleAssigneeClick(e) {
    const assigneeElement = e.target.closest('.kanban-card-assignee');
    if (!assigneeElement) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    // Get card and bug info
    const card = assigneeElement.closest('.kanban-card');
    const bugId = card.dataset.bugId;
    
    // Show assignee modal
    showAssigneeModal(bugId, assigneeElement);
}

function showAssigneeModal(bugId, assigneeElement) {
    const modal = document.getElementById('assignee-modal');
    const modalTitle = document.getElementById('assignee-modal-title');
    const optionsContainer = document.getElementById('assignee-options-modal');
    const searchInput = document.getElementById('assignee-search-input');
    
    if (!modal || !optionsContainer) {
        alert('Assignee modal not found. Please refresh the page.');
        return;
    }
    
    // Store reference to the assignee element for later update
    modal.assigneeElement = assigneeElement;
    modal.bugId = bugId;
    
    // Set title
    modalTitle.textContent = `Change Assignee - Ticket #${bugId}`;
    
    // Ensure we have user data
    getAllUsers();
    
    // Populate options
    populateAssigneeOptions(bugId);
    
    // Show modal
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
    
    // Clear and focus search
    searchInput.value = '';
    setTimeout(() => {
        searchInput.focus();
    }, 100);
}

function populateAssigneeOptions(bugId) {
    const container = document.getElementById('assignee-options-modal');
    
    if (!allUsers || allUsers.length === 0) {
        container.innerHTML = '<div class="assignee-option-modal">No users available</div>';
        return;
    }
    
    // Get current assignee
    let currentAssignee = '';
    try {
        const card = document.querySelector(`[data-bug-id="${bugId}"]`);
        if (card) {
            const assigneeElement = card.querySelector('.kanban-card-assignee');
            if (assigneeElement) {
                currentAssignee = assigneeElement.textContent.trim();
                // Remove the emoji prefix if it exists
                currentAssignee = currentAssignee.replace(/^👤\s*/, '');
            }
        }
    } catch (error) {
        console.error('Error getting current assignee:', error);
    }
    
    let html = '';
    allUsers.forEach(user => {
        if (!user || typeof user.id === 'undefined' || !user.name) return;
        
        const isSelected = (user.name === currentAssignee) ? 'selected' : '';
        const isUnassigned = user.id === 0 ? 'unassigned' : '';
        const avatar = user.id === 0 ? '?' : user.name.substring(0, 2).toUpperCase();
        
        html += `
            <div class="assignee-option-modal ${isSelected} ${isUnassigned}" data-user-id="${user.id}" data-user-name="${user.name}">
                <div class="user-avatar">${avatar}</div>
                <div class="user-name">${user.name}</div>
            </div>
        `;
    });
    
    container.innerHTML = html;
    
    // Add click handlers
    container.querySelectorAll('.assignee-option-modal').forEach(option => {
        option.addEventListener('click', function() {
            const newAssigneeId = parseInt(this.dataset.userId);
            const modal = document.getElementById('assignee-modal');
            
            if (!isNaN(newAssigneeId) && modal.assigneeElement) {
                updateTicketAssignee(modal.bugId, newAssigneeId, modal.assigneeElement);
                closeAssigneeModal();
            }
        });
    });
    
    // Add search functionality
    const searchInput = document.getElementById('assignee-search-input');
    searchInput.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        const options = container.querySelectorAll('.assignee-option-modal');
        
        options.forEach(option => {
            const userName = option.dataset.userName.toLowerCase();
            if (userName.includes(searchTerm)) {
                option.style.display = 'flex';
            } else {
                option.style.display = 'none';
            }
        });
    });
}

function closeAssigneeModal() {
    const modal = document.getElementById('assignee-modal');
    if (modal) {
        modal.classList.remove('show');
        document.body.style.overflow = '';
        modal.assigneeElement = null;
        modal.bugId = null;
    }
}

// Initialize assignee modal
function initializeAssigneeModal() {
    const modal = document.getElementById('assignee-modal');
    if (!modal) return;
    
    // Load users data
    if (!allUsers || allUsers.length === 0) {
        getAllUsers();
    }
    
    const closeBtn = document.getElementById('assignee-modal-close');
    const backdrop = modal.querySelector('.modal-backdrop');
    
    // Close modal event listeners
    if (closeBtn) {
        closeBtn.addEventListener('click', closeAssigneeModal);
    }
    
    if (backdrop) {
        backdrop.addEventListener('click', closeAssigneeModal);
    }
    
    // Close modal on Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && modal.classList.contains('show')) {
            closeAssigneeModal();
        }
    });
}

function updateTicketAssignee(bugId, newAssigneeId, assigneeElement) {
    const config = document.getElementById('kanban-config');
    const updateUrl = config.dataset.updateAssigneeUrl;
    
    // Show loading state
    assigneeElement.style.opacity = '0.6';
    
    fetch(updateUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `bug_id=${bugId}&assignee_id=${newAssigneeId}`
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Update the card display
            const newAssigneeName = data.assignee_name || 'Unassigned';
            assigneeElement.textContent = newAssigneeName;
            
            // Update card styling based on assignment
            const card = assigneeElement.closest('.kanban-card');
            if (newAssigneeId === 0) {
                card.classList.add('unassigned');
            } else {
                card.classList.remove('unassigned');
            }
            
            // Show success feedback
            showUpdateFeedback(assigneeElement, 'success');
        } else {
            throw new Error(data.error || 'Failed to update assignee');
        }
    })
    .catch(error => {
        console.error('Error updating assignee:', error);
        showUpdateFeedback(assigneeElement, 'error');
        alert('Error updating assignee: ' + error.message);
    })
    .finally(() => {
        assigneeElement.style.opacity = '1';
    });
}

function showUpdateFeedback(element, type) {
    const originalBg = element.style.backgroundColor;
    const feedbackColor = type === 'success' ? '#E3FCEF' : '#FFEBE6';
    
    element.style.backgroundColor = feedbackColor;
    element.style.transition = 'background-color 0.3s ease';
    
    setTimeout(() => {
        element.style.backgroundColor = originalBg;
        setTimeout(() => {
            element.style.transition = '';
        }, 300);
    }, 1000);
}