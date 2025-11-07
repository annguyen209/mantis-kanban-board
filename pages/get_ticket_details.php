<?php
/**
 * Simple AJAX handler for getting ticket details
 */

# Minimal approach to avoid conflicts
require_once( 'core.php' );

# Prevent any unwanted output
@ob_clean();
header( 'Content-Type: application/json' );

try {
    # Security check
    auth_ensure_user_authenticated();

    # Get bug ID
    $bug_id = (int) gpc_get( 'bug_id', 0 );
    
    if( $bug_id <= 0 ) {
        throw new Exception( 'Invalid bug ID' );
    }

    # Check bug exists and access
    if( !bug_exists( $bug_id ) ) {
        throw new Exception( 'Bug not found' );
    }

    if( !access_has_bug_level( config_get( 'view_bug_threshold' ), $bug_id ) ) {
        throw new Exception( 'Access denied' );
    }

    # Get bug data
    $bug = bug_get( $bug_id );
    
    # Basic response with essential info
    $response = array(
        'success' => true,
        'bug' => array(
            'id' => $bug->id,
            'summary' => string_display_line( $bug->summary ),
            'description' => string_nl2br( string_display( $bug->description ) ),
            'status_name' => get_enum_element( 'status', $bug->status ),
            'priority_name' => get_enum_element( 'priority', $bug->priority ),
            'severity_name' => get_enum_element( 'severity', $bug->severity ),
            'project_name' => project_get_name( $bug->project_id ),
            'reporter_name' => user_get_username( $bug->reporter_id ),
            'handler_name' => $bug->handler_id > 0 ? user_get_username( $bug->handler_id ) : '',
            'date_submitted' => date( 'Y-m-d H:i', $bug->date_submitted ),
            'last_updated' => date( 'Y-m-d H:i', $bug->last_updated ),
            'steps_to_reproduce' => !is_blank( $bug->steps_to_reproduce ) ? string_nl2br( string_display( $bug->steps_to_reproduce ) ) : '',
            'additional_information' => !is_blank( $bug->additional_information ) ? string_nl2br( string_display( $bug->additional_information ) ) : ''
        )
    );

    echo json_encode( $response );

} catch( Exception $e ) {
    echo json_encode( array( 
        'success' => false, 
        'error' => $e->getMessage() 
    ) );
}
?>