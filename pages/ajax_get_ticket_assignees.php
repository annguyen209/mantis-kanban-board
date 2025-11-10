<?php
# MantisBT - A web based bug tracking system
# Simple Kanban Plugin - AJAX endpoint to get assignees for a specific ticket

# Allow access control headers for AJAX
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

# Test that the file is being reached
error_log("DEBUG: ajax_get_ticket_assignees.php - File accessed at " . date('Y-m-d H:i:s'));
error_log("DEBUG: ajax_get_ticket_assignees.php - REQUEST_METHOD: " . ($_SERVER['REQUEST_METHOD'] ?? 'unknown'));
error_log("DEBUG: ajax_get_ticket_assignees.php - QUERY_STRING: " . ($_SERVER['QUERY_STRING'] ?? 'empty'));
error_log("DEBUG: ajax_get_ticket_assignees.php - REQUEST_URI: " . ($_SERVER['REQUEST_URI'] ?? 'empty'));
error_log("DEBUG: ajax_get_ticket_assignees.php - GET params: " . print_r($_GET, true));

# Simple test response first
if (isset($_GET['test'])) {
    echo json_encode(['status' => 'success', 'message' => 'AJAX endpoint is reachable', 'time' => date('Y-m-d H:i:s')]);
    exit;
}

# Try to include MantisBT core
$core_included = false;
if (function_exists('config_get')) {
    $core_included = true;
    error_log("DEBUG: ajax_get_ticket_assignees.php - Core already available");
} else {
    # Try different paths to core.php
    $possible_core_paths = [
        '../../../../core.php',
        '../../../core.php', 
        '../../core.php',
        '../core.php',
        './core.php'
    ];
    
    foreach ($possible_core_paths as $path) {
        if (file_exists($path)) {
            require_once($path);
            if (function_exists('config_get')) {
                $core_included = true;
                error_log("DEBUG: ajax_get_ticket_assignees.php - Core included from: $path");
                break;
            }
        }
    }
}

if (!$core_included) {
    error_log("DEBUG: ajax_get_ticket_assignees.php - Failed to include core.php");
    echo json_encode(['error' => 'MantisBT core not available']);
    exit;
}

# Check authentication
if (!function_exists('auth_is_user_authenticated') || !auth_is_user_authenticated()) {
    error_log("DEBUG: ajax_get_ticket_assignees.php - User not authenticated");
    http_response_code(401);
    echo json_encode(['error' => 'Authentication required']);
    exit;
}

# Get ticket_id from parameters
$ticket_id = 0;
if (isset($_GET['ticket_id'])) {
    $ticket_id = (int)$_GET['ticket_id'];
    error_log("DEBUG: ajax_get_ticket_assignees.php - ticket_id from GET: $ticket_id");
} elseif (function_exists('gpc_get_int')) {
    try {
        $ticket_id = gpc_get_int('ticket_id', 0);
        error_log("DEBUG: ajax_get_ticket_assignees.php - ticket_id from gpc_get_int: $ticket_id");
    } catch (Exception $e) {
        error_log("DEBUG: ajax_get_ticket_assignees.php - gpc_get_int failed: " . $e->getMessage());
    }
}

error_log("DEBUG: ajax_get_ticket_assignees.php - Received ticket_id: $ticket_id");

if ($ticket_id <= 0) {
    error_log("DEBUG: ajax_get_ticket_assignees.php - Invalid ticket ID provided: $ticket_id");
    http_response_code(400);
    echo json_encode(['error' => 'Invalid ticket ID', 'received_id' => $ticket_id, 'debug' => 'Endpoint reached but no valid ticket_id']);
    exit;
}

try {
    # Verify ticket exists and user has access
    if (!bug_exists($ticket_id)) {
        error_log("DEBUG: ajax_get_ticket_assignees.php - Ticket $ticket_id does not exist");
        http_response_code(404);
        echo json_encode(['error' => 'Ticket not found']);
        exit;
    }
    
    # Check if user has access to view/update this bug
    if (!access_has_bug_level(config_get('view_bug_threshold'), $ticket_id)) {
        error_log("DEBUG: ajax_get_ticket_assignees.php - User does not have access to ticket $ticket_id");
        http_response_code(403);
        echo json_encode(['error' => 'Access denied']);
        exit;
    }
    
    # Get ticket details
    $bug = bug_get($ticket_id, true);
    $project_id = $bug->project_id;
    $project_name = project_get_name($project_id);
    
    # Get minimum access level required to be assigned bugs
    $min_assign_threshold = config_get('update_bug_assign_threshold');
    
    # DEBUG: Log the query parameters
    error_log("DEBUG: ajax_get_ticket_assignees.php - Ticket ID: $ticket_id");
    error_log("DEBUG: ajax_get_ticket_assignees.php - Project ID: $project_id");
    error_log("DEBUG: ajax_get_ticket_assignees.php - Project Name: $project_name");
    error_log("DEBUG: ajax_get_ticket_assignees.php - Current Assignee ID: " . $bug->handler_id);
    error_log("DEBUG: ajax_get_ticket_assignees.php - Min Assign Threshold: $min_assign_threshold");
    
    # Get all users who have access to this ticket's project
    $query = "SELECT u.id, u.username, u.realname, u.enabled, pul.access_level
              FROM {project_user_list} pul
              LEFT JOIN {user} u ON u.id = pul.user_id
              WHERE pul.project_id = $project_id 
              AND u.enabled = 1
              AND pul.access_level >= $min_assign_threshold
              ORDER BY u.realname, u.username";
              
    error_log("DEBUG: ajax_get_ticket_assignees.php - SQL Query: $query");
    
    $result = db_query($query);
    $users = array();
    $user_count = 0;
    
    while ($row = db_fetch_array($result)) {
        $full_name = !empty($row['realname']) ? $row['realname'] : $row['username'];
        $is_current = ($bug->handler_id == $row['id']);
        
        $users[] = array(
            'id' => $row['id'],
            'username' => $row['username'],
            'realname' => $row['realname'],
            'display_name' => string_display_line($full_name),
            'is_current_assignee' => $is_current
        );
        
        $user_count++;
        error_log("DEBUG: ajax_get_ticket_assignees.php - User $user_count: ID={$row['id']}, Name=$full_name, Access Level={$row['access_level']}, Is Current=" . ($is_current ? 'YES' : 'NO'));
    }
    
    error_log("DEBUG: ajax_get_ticket_assignees.php - Found $user_count users for project $project_id");
    
    # Add option for "No one assigned" (always at the top)
    $unassigned_is_current = ($bug->handler_id == 0);
    array_unshift($users, array(
        'id' => 0,
        'username' => '',
        'realname' => '',
        'display_name' => '[No one assigned]',
        'is_current_assignee' => $unassigned_is_current
    ));
    
    error_log("DEBUG: ajax_get_ticket_assignees.php - Added 'No one assigned' option, Is Current: " . ($unassigned_is_current ? 'YES' : 'NO'));
    error_log("DEBUG: ajax_get_ticket_assignees.php - Total users (including unassigned): " . count($users));
    
    $response = array(
        'ticket_id' => $ticket_id,
        'project_id' => $project_id,
        'project_name' => $project_name,
        'current_assignee' => $bug->handler_id,
        'min_assign_threshold' => $min_assign_threshold,
        'users' => $users,
        'debug' => array(
            'query' => $query,
            'user_count_from_db' => $user_count,
            'total_users_returned' => count($users)
        )
    );
    
    error_log("DEBUG: ajax_get_ticket_assignees.php - Response: " . json_encode($response, JSON_PRETTY_PRINT));
    
    echo json_encode($response);
    
} catch (Exception $e) {
    error_log("DEBUG: ajax_get_ticket_assignees.php - Exception: " . $e->getMessage());
    error_log("DEBUG: ajax_get_ticket_assignees.php - Exception trace: " . $e->getTraceAsString());
    http_response_code(500);
    echo json_encode(['error' => 'Internal server error: ' . $e->getMessage()]);
}
?>