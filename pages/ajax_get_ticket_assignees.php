<?php
/**
 * Simple Kanban Plugin - AJAX endpoint to get possible assignees for a ticket.
 * Returns clean JSON. Debug logs go to a plugin log file and are only included
 * in the response when explicitly requested via ?debug=1.
 */

// Hard suppress any error display in case server-level php.ini pushes error_log to output
@ini_set('display_errors', '0');
@ini_set('display_startup_errors', '0');
error_reporting(E_ERROR | E_PARSE | E_CORE_ERROR | E_COMPILE_ERROR); // No notices/warnings

// Send headers early (no extra output allowed before JSON)
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST');
header('Access-Control-Allow-Headers: Content-Type');
header('Cache-Control: no-cache, must-revalidate');
header('Content-Type: application/json; charset=utf-8');

// Buffer anything that might slip through from included core and discard later
ob_start();

$include_debug = isset($_GET['debug']) && $_GET['debug'] == '1';

// Robust log file path inside plugin directory (create folder if needed)
$log_dir = dirname(__DIR__) . DIRECTORY_SEPARATOR . 'files';
if (!is_dir($log_dir)) {
    @mkdir($log_dir, 0775, true);
}
$log_file = $log_dir . DIRECTORY_SEPARATOR . 'simplekanban_debug.log';

function sk_debug($msg) {
    global $log_file, $include_debug; // $include_debug only controls response, not logging
    $line = date('[Y-m-d H:i:s] ') . $msg . PHP_EOL;
    // Write atomically
    if ($fp = @fopen($log_file, 'a')) {
        if (flock($fp, LOCK_EX)) {
            fwrite($fp, $line);
            fflush($fp);
            flock($fp, LOCK_UN);
        }
        fclose($fp);
    }
}

sk_debug('ajax_get_ticket_assignees.php accessed. Method=' . ($_SERVER['REQUEST_METHOD'] ?? 'unknown') . ' URI=' . ($_SERVER['REQUEST_URI'] ?? 'empty') . ' QueryString=' . ($_SERVER['QUERY_STRING'] ?? 'empty'));
sk_debug('GET params: ' . json_encode($_GET));

// Simple health test without touching MantisBT internals
if (isset($_GET['test'])) {
    ob_end_clean(); // discard any buffered noise
    echo json_encode([
        'status' => 'ok',
        'message' => 'Endpoint reachable',
        'time' => date('c')
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

# Try to include MantisBT core
$core_included = false;
if (function_exists('config_get')) {
    $core_included = true;
    sk_debug('Core already available (loaded via plugin.php)');
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
                sk_debug("Core included from: $path");
                break;
            }
        }
    }
}

if (!$core_included) {
    sk_debug('Failed to include core.php');
    ob_end_clean();
    echo json_encode(['error' => 'MantisBT core not available']);
    exit;
}

# Check authentication
if (!function_exists('auth_is_user_authenticated') || !auth_is_user_authenticated()) {
    sk_debug('User not authenticated');
    ob_end_clean();
    http_response_code(401);
    echo json_encode(['error' => 'Authentication required']);
    exit;
}

# Get ticket_id from parameters
$ticket_id = 0;
if (isset($_GET['ticket_id'])) {
    $ticket_id = (int)$_GET['ticket_id'];
    sk_debug("ticket_id (GET) = $ticket_id");
} elseif (function_exists('gpc_get_int')) {
    try {
        $ticket_id = gpc_get_int('ticket_id', 0);
        sk_debug("ticket_id (gpc_get_int) = $ticket_id");
    } catch (Exception $e) {
        sk_debug('gpc_get_int failed: ' . $e->getMessage());
    }
}

sk_debug("Received ticket_id: $ticket_id");

if ($ticket_id <= 0) {
    sk_debug("Invalid ticket ID provided: $ticket_id");
    ob_end_clean();
    http_response_code(400);
    echo json_encode(['error' => 'Invalid ticket ID', 'received_id' => $ticket_id]);
    exit;
}

try {
    # Verify ticket exists and user has access
    if (!bug_exists($ticket_id)) {
    sk_debug("Ticket $ticket_id does not exist");
        http_response_code(404);
        echo json_encode(['error' => 'Ticket not found']);
        exit;
    }
    
    # Check if user has access to view/update this bug
    if (!access_has_bug_level(config_get('view_bug_threshold'), $ticket_id)) {
    sk_debug("User lacks access to ticket $ticket_id");
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
    sk_debug("Ticket ID: $ticket_id, Project ID: $project_id, Project Name: $project_name, Current Assignee={$bug->handler_id}, MinThreshold=$min_assign_threshold");
    
    # Get all users who have access to this ticket's project
    $query = "SELECT u.id, u.username, u.realname, u.enabled, pul.access_level
              FROM {user} u
              LEFT JOIN {project_user_list} pul ON u.id = pul.user_id
              WHERE u.enabled = 1
              AND ((pul.project_id = $project_id AND pul.access_level >= $min_assign_threshold)  OR u.access_level >= " . config_get_global( 'admin_site_threshold' ) . ")
              ORDER BY u.realname, u.username";
              
    sk_debug("SQL Query: $query");
    
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
    sk_debug("User $user_count: ID={$row['id']}, Name=$full_name, AccessLevel={$row['access_level']}, Current=" . ($is_current ? 'YES' : 'NO'));
    }
    
    sk_debug("Found $user_count users for project $project_id");
    
    # Add option for "No one assigned" (always at the top)
    $unassigned_is_current = ($bug->handler_id == 0);
    array_unshift($users, array(
        'id' => 0,
        'username' => '',
        'realname' => '',
        'display_name' => '[No one assigned]',
        'is_current_assignee' => $unassigned_is_current
    ));
    
    sk_debug("Added 'No one assigned' option; Current=" . ($unassigned_is_current ? 'YES' : 'NO'));
    sk_debug('Total users (including unassigned): ' . count($users));
    
    $response = [
        'ticket_id' => $ticket_id,
        'project_id' => $project_id,
        'project_name' => $project_name,
        'current_assignee' => $bug->handler_id,
        'min_assign_threshold' => $min_assign_threshold,
        'users' => $users
    ];
    if ($include_debug) {
        $response['debug'] = [
            'sql' => $query,
            'user_count_from_db' => $user_count,
            'total_users_returned' => count($users)
        ];
    }
    sk_debug('Response prepared (debug ' . ($include_debug ? 'included' : 'excluded') . ')');
    ob_end_clean();
    echo json_encode($response, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    
} catch (Exception $e) {
    sk_debug('Exception: ' . $e->getMessage());
    sk_debug('Trace: ' . $e->getTraceAsString());
    ob_end_clean();
    http_response_code(500);
    echo json_encode(['error' => 'Internal server error']);
}
?>