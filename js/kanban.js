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
    
    // Add double-click to view bug details
    document.querySelectorAll('.kanban-card').forEach(card => {
        card.addEventListener('dblclick', function() {
            const bugId = this.getAttribute('data-bug-id');
            if (bugId && KanbanConfig.viewUrl) {
                window.open(`${KanbanConfig.viewUrl}${bugId}`, '_blank');
            }
        });
        
        // Add tooltip
        card.setAttribute('title', 'Drag to move between statuses, double-click to view details');
    });
});

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
    
    // Toggle filter panel
    if (filterBtn) {
        filterBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            filterPanel.classList.toggle('active');
            filterBtn.classList.toggle('active');
            
            // Setup search when panel opens
            if (filterPanel.classList.contains('active')) {
                setTimeout(() => {
                    setupOptionsSearch();
                    initializeOptionsSearch();
                }, 100);
            }
        });
    }
    
    // Close filter panel when clicking outside
    document.addEventListener('click', function(e) {
        if (!filterPanel.contains(e.target) && !filterBtn.contains(e.target)) {
            filterPanel.classList.remove('active');
            filterBtn.classList.remove('active');
        }
    });
    
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
    
    // Initialize parent filter based on URL parameter
    initializeParentFilter();
    
    // Initialize active filters display
    updateActiveFiltersDisplay();
    
    // Add clear all filters button listener
    const clearAllBtn = document.getElementById('clear-all-filters');
    if (clearAllBtn) {
        clearAllBtn.addEventListener('click', clearAllFilters);
    }
}

function handleParentFilter(checkbox) {
    // Parent filter works differently - it reloads the page with new data
    const selectedValue = checkbox.value;
    const urlParams = new URLSearchParams(window.location.search);
    
    if (checkbox.checked) {
        // Uncheck other parent options (radio button behavior)
        document.querySelectorAll('input[data-filter="parent"]').forEach(cb => {
            if (cb !== checkbox) {
                cb.checked = false;
            }
        });
        
        // Update URL parameter
        if (selectedValue === '0') {
            urlParams.delete('parent_id');
        } else {
            urlParams.set('parent_id', selectedValue);
        }
        
        // Reload page with new parent filter
        window.location.search = urlParams.toString();
    } else {
        // If unchecking, default to "show all"
        urlParams.delete('parent_id');
        window.location.search = urlParams.toString();
    }
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
    // Check URL for parent_id parameter and set the appropriate checkbox
    const urlParams = new URLSearchParams(window.location.search);
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
        
        // Note: Parent filter is handled separately as it requires page reload
        
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
    document.getElementById('filter-panel').classList.remove('active');
    document.getElementById('filter-btn').classList.remove('active');
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
    
    // Get parent filter
    const selectedParent = document.querySelector('input[data-filter="parent"]:checked');
    if (selectedParent && selectedParent.value !== '0') {
        const text = selectedParent.parentElement.querySelector('.filter-text').textContent;
        activeFilters.push({
            type: 'parent',
            label: `Parent: ${text}`,
            value: selectedParent.value,
            checkbox: selectedParent
        });
    }
    
    // Show/hide container based on active filters
    if (activeFilters.length > 0) {
        container.style.display = 'flex';
        
        // Create filter tags
        activeFilters.forEach(filter => {
            const tag = document.createElement('div');
            tag.className = 'filter-tag';
            tag.innerHTML = `
                <span>${filter.label}</span>
                <button type="button" class="remove-filter" data-filter-type="${filter.type}" data-filter-value="${filter.value}">
                    <i class="fa fa-times"></i>
                </button>
            `;
            list.appendChild(tag);
        });
        
        // Add event listeners to remove buttons
        list.querySelectorAll('.remove-filter').forEach(button => {
            button.addEventListener('click', function(e) {
                e.stopPropagation();
                removeFilter(this.dataset.filterType, this.dataset.filterValue);
            });
        });
        
    } else {
        container.style.display = 'none';
    }
}

function removeFilter(type, value) {
    if (type === 'search') {
        // Clear search input
        document.getElementById('board-search').value = '';
    } else if (type === 'parent') {
        // For parent filter, redirect to clear it
        const urlParams = new URLSearchParams(window.location.search);
        urlParams.delete('parent_id');
        window.location.search = urlParams.toString();
        return;
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