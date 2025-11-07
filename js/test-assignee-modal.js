console.log('Testing Assignee Modal...');

// Test function to check if assignee modal elements exist and are properly styled
function testAssigneeModal() {
    console.log('=== Assignee Modal Test ===');
    
    const modal = document.getElementById('assignee-modal');
    const content = document.querySelector('.assignee-modal-content');
    const backdrop = modal ? modal.querySelector('.modal-backdrop') : null;
    const header = modal ? modal.querySelector('.modal-header') : null;
    const body = modal ? modal.querySelector('.modal-body') : null;
    
    console.log('Modal element:', modal ? 'Found' : 'Not found');
    console.log('Modal content:', content ? 'Found' : 'Not found');
    console.log('Backdrop:', backdrop ? 'Found' : 'Not found');
    console.log('Header:', header ? 'Found' : 'Not found');
    console.log('Body:', body ? 'Found' : 'Not found');
    
    if (content) {
        const styles = window.getComputedStyle(content);
        console.log('Content position:', styles.position);
        console.log('Content transform:', styles.transform);
        console.log('Content display:', styles.display);
        console.log('Content z-index:', styles.zIndex);
    }
    
    // Test modal show/hide
    if (modal && typeof showAssigneeModal === 'function') {
        console.log('showAssigneeModal function available');
    } else {
        console.log('showAssigneeModal function not available');
    }
    
    console.log('=== Test Complete ===');
}

// Run test after page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', testAssigneeModal);
} else {
    testAssigneeModal();
}