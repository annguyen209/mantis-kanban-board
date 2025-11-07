<?php
/**
 * AJAX handler for updating ticket assignee
 */

require_once( 'core.php' );

# Prevent any unwanted output
@ob_clean();
header( 'Content-Type: application/json' );

try {
    # Security check
    auth_ensure_user_authenticated();

    # Get parameters
    $bug_id = (int) gpc_get( 'bug_id', 0 );
    $new_assignee = (int) gpc_get( 'assignee_id', 0 );
    
    if( $bug_id <= 0 ) {
        throw new Exception( 'Invalid bug ID' );
    }

    # Check bug exists and access
    if( !bug_exists( $bug_id ) ) {
        throw new Exception( 'Bug not found' );
    }

    if( !access_has_bug_level( config_get( 'update_bug_assign_threshold' ), $bug_id ) ) {
        throw new Exception( 'Access denied' );
    }

    # Update the assignee
    bug_set_field( $bug_id, 'handler_id', $new_assignee );
    
    # Get the new assignee name for response
    $assignee_name = '';
    if( $new_assignee > 0 ) {
        $assignee_name = user_get_username( $new_assignee );
    }

    # Success response
    echo json_encode( array(
        'success' => true,
        'assignee_id' => $new_assignee,
        'assignee_name' => $assignee_name,
        'message' => 'Assignee updated successfully'
    ) );

} catch( Exception $e ) {
    echo json_encode( array( 
        'success' => false, 
        'error' => $e->getMessage() 
    ) );
}
?>