// Modal functionality for ticket details

function openTicketModal(bugId) {
    const modal = document.getElementById('ticket-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalLoading = document.getElementById('modal-loading');
    const modalContent = document.getElementById('modal-content');
    const modalError = document.getElementById('modal-error');
    const externalLinkBtn = document.getElementById('modal-external-link');
    const editBtn = document.getElementById('modal-edit');
    
    if (!modal) return;
    
    // Show modal and reset state
    modal.style.display = 'block';
    modalLoading.style.display = 'flex';
    modalContent.style.display = 'none';
    modalError.style.display = 'none';
    modalTitle.textContent = `Loading Ticket #${bugId}...`;
    
    // Set up external link button
    externalLinkBtn.onclick = function() {
        window.open(`${KanbanConfig.viewUrl}${bugId}`, '_blank');
    };
    
    // Set up edit button
    editBtn.onclick = function() {
        window.open(`${KanbanConfig.viewUrl.replace('view.php', 'bug_update_page.php')}${bugId}`, '_blank');
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
    
    // Get basic info from the card
    const card = document.querySelector(`.kanban-card[data-bug-id="${bugId}"]`);
    
    if (card) {
        // Get basic info from the card
        const title = card.querySelector('.kanban-card-title').textContent.trim();
        const priority = card.dataset.priority;
        const assignee = card.dataset.assignee;
        const status = card.dataset.status;
        
        // Get assignee name from the card display
        const assigneeElement = card.querySelector('.kanban-card-assignee');
        const assigneeName = assigneeElement ? assigneeElement.textContent.trim() : 'Unassigned';
        
        // Get status name from the column
        const column = card.closest('.kanban-column');
        const statusName = column ? column.dataset.statusName : 'Unknown';
        
        // Get priority name from the card
        const priorityElement = card.querySelector('.kanban-card-priority');
        const priorityName = priorityElement ? priorityElement.textContent.trim() : 'Normal';
        
        // Create basic ticket content
        modalContent.innerHTML = `
            <div class="ticket-details">
                <h3>${title}</h3>
                
                <div class="ticket-meta">
                    <div class="ticket-meta-item">
                        <strong>Status:</strong> 
                        <span class="status-badge">${statusName}</span>
                    </div>
                    <div class="ticket-meta-item">
                        <strong>Priority:</strong> 
                        <span class="priority-badge">${priorityName}</span>
                    </div>
                    <div class="ticket-meta-item">
                        <strong>Assignee:</strong> 
                        <span class="assignee-badge">${assigneeName}</span>
                    </div>
                </div>
                
                <div class="ticket-description">
                    <strong>Description:</strong>
                    <div class="description-placeholder">
                        <p>Click "Edit Ticket" to view full details and edit this ticket.</p>
                        <p>This modal shows basic ticket information. For complete details, editing, and adding comments, use the edit button or external link.</p>
                    </div>
                </div>
                
                <div class="ticket-actions">
                    <p><strong>Available Actions:</strong></p>
                    <ul>
                        <li>🔗 <strong>External Link</strong> - Opens full ticket view in new tab</li>
                        <li>✏️ <strong>Edit Ticket</strong> - Opens ticket edit page in new tab</li>
                        <li>🎯 <strong>Drag & Drop</strong> - Move ticket between status columns on the board</li>
                    </ul>
                </div>
            </div>
        `;
        
        modalTitle.textContent = `Ticket #${bugId}`;
        modalLoading.style.display = 'none';
        modalContent.style.display = 'block';
        
    } else {
        modalTitle.textContent = `Error - Ticket #${bugId}`;
        modalLoading.style.display = 'none';
        modalError.style.display = 'flex';
    }
}

function closeTicketModal() {
    const modal = document.getElementById('ticket-modal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = '';
    }
}

// Initialize modal event listeners when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
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
});