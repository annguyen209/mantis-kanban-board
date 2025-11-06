<?php
/**
 * AJAX handler for updating bug status via drag and drop
 */

# Security: Ensure user is authenticated and has proper permissions
auth_ensure_user_authenticated();
access_ensure_project_level( config_get( 'update_bug_threshold' ) );

# Get input parameters
$f_bug_id = gpc_get_int( 'bug_id' );
$f_new_status = gpc_get_int( 'new_status' );

# Validate input
if( $f_bug_id <= 0 || $f_new_status <= 0 ) {
    http_response_code( 400 );
    echo json_encode( array( 
        'success' => false, 
        'error' => 'Invalid bug ID or status' 
    ) );
    exit;
}

try {
    # Check if bug exists and user can modify it
    if( !bug_exists( $f_bug_id ) ) {
        throw new Exception( 'Bug does not exist' );
    }
    
    # Check if user has access to this bug
    $t_bug = bug_get( $f_bug_id, true );
    if( !access_has_bug_level( config_get( 'update_bug_threshold' ), $f_bug_id ) ) {
        throw new Exception( 'Access denied' );
    }
    
    # Validate new status - use more robust approach
    try {
        # Try to get the status name to validate it exists
        $t_status_name = get_enum_element( 'status', $f_new_status );
    } catch( Exception $e ) {
        throw new Exception( 'Invalid status value: ' . $f_new_status );
    }
    
    # Update the bug status using MantisBT's proper API
    bug_set_field( $f_bug_id, 'status', $f_new_status );
    
    # Auto-assign to current user when moving to "Assigned" status if not already assigned
    $t_assigned_status = config_get( 'bug_assigned_status' );
    $t_was_auto_assigned = false;
    if( $f_new_status == $t_assigned_status ) {
        # Check if bug is currently unassigned
        $t_current_handler = $t_bug->handler_id;
        if( empty( $t_current_handler ) || $t_current_handler == 0 ) {
            # Assign to current user
            $t_current_user = auth_get_current_user_id();
            bug_set_field( $f_bug_id, 'handler_id', $t_current_user );
            $t_was_auto_assigned = true;
            
            # Log the auto-assignment
            $t_current_username = user_get_username( $t_current_user );
            log_event( LOG_PLUGIN, "Kanban: Bug #{$f_bug_id} auto-assigned to {$t_current_username} when moved to Assigned status" );
        }
    }
    
    # Log the change
    log_event( LOG_PLUGIN, "Kanban: Bug #{$f_bug_id} status changed to {$f_new_status} via drag and drop" );
    
    # Get the status name for response
    $t_status_name = get_enum_element( 'status', $f_new_status );
    
    # Get updated bug data for response
    $t_updated_bug = bug_get( $f_bug_id, true );
    $t_assigned_to = '';
    if( !empty( $t_updated_bug->handler_id ) && $t_updated_bug->handler_id > 0 ) {
        $t_assigned_to = user_get_username( $t_updated_bug->handler_id );
    }
    
    # Return success response
    echo json_encode( array(
        'success' => true,
        'bug_id' => $f_bug_id,
        'new_status' => $f_new_status,
        'status_name' => $t_status_name,
        'assigned_to' => $t_assigned_to,
        'was_auto_assigned' => $t_was_auto_assigned,
        'message' => 'Bug status updated successfully'
    ) );
    
} catch( Exception $e ) {
    http_response_code( 500 );
    echo json_encode( array(
        'success' => false,
        'error' => $e->getMessage()
    ) );
    
    # Log the error
    log_event( LOG_PLUGIN, "Kanban: Error updating bug #{$f_bug_id}: " . $e->getMessage() );
}
?>