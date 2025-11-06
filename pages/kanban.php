<?php
/**
 * Simple Kanban Board Page
 */

# Access control
access_ensure_project_level( config_get( 'view_bug_threshold' ) );

$t_project_id = helper_get_current_project();
$t_project_name = project_get_name( $t_project_id );

# Page layout
layout_page_header( 'Kanban Board - ' . $t_project_name );
layout_page_begin();

# Include CSS using layout function if available
if (function_exists('html_css_link')) {
    html_css_link( 'plugins/' . plugin_get_current() . '/css/kanban.css' );
} else {
    # Fallback to direct include
    echo '<link rel="stylesheet" type="text/css" href="plugins/' . plugin_get_current() . '/css/kanban.css">';
}

# Get bugs safely
$t_bugs_by_status = array();
$t_status_values = array();

try {
    # Get bugs by status for current project
    $t_bug_table = db_get_table( 'mantis_bug_table' );
    
    # If "All Projects" is selected, get all projects accessible to user
    if( $t_project_id == ALL_PROJECTS ) {
        $t_project_clause = '';
        $t_params = array();
        
        # Get all projects user has access to
        $t_accessible_projects = user_get_accessible_projects( auth_get_current_user_id() );
        if( !empty( $t_accessible_projects ) ) {
            $t_project_clause = ' WHERE project_id IN (' . implode( ',', $t_accessible_projects ) . ')';
        }
    } else {
        $t_project_clause = ' WHERE project_id = ' . db_param();
        $t_params = array( $t_project_id );
    }
    
    $t_query = "SELECT id, project_id, summary, status, priority, severity, reporter_id, handler_id, date_submitted
                FROM $t_bug_table" . $t_project_clause . " 
                ORDER BY status, id DESC";
    $t_result = db_query_bound( $t_query, $t_params );
    
    while( $t_row = db_fetch_array( $t_result ) ) {
        $t_status = $t_row['status'];
        if( !isset( $t_bugs_by_status[$t_status] ) ) {
            $t_bugs_by_status[$t_status] = array();
        }
        $t_bugs_by_status[$t_status][] = $t_row;
    }
    
    # Debug: Log bug counts by status
    $t_total_bugs = 0;
    foreach( $t_bugs_by_status as $status => $bugs ) {
        $t_total_bugs += count($bugs);
        log_event( LOG_PLUGIN, "Kanban: Status {$status} has " . count($bugs) . " bugs" );
    }
    log_event( LOG_PLUGIN, "Kanban: Found {$t_total_bugs} bugs across " . count($t_bugs_by_status) . " statuses for project {$t_project_id}" );

    # Get status enum values - use direct config approach
    $t_status_values = array();
    
    try {
        $t_status_enum = config_get( 'status_enum_string' );
        
        # Debug: Show what we got from config
        log_event( LOG_PLUGIN, "Kanban: Status enum from config: " . $t_status_enum );
        
        # Parse the enum string manually (more reliable)
        # Format: '10:new,20:feedback,30:acknowledged,40:confirmed,50:assigned,60:in progress,70:ready to test,75:testing,80:resolved,90:closed'
        $t_enum_parts = explode( ',', $t_status_enum );
        foreach( $t_enum_parts as $t_part ) {
            $t_part = trim($t_part);
            if( strpos( $t_part, ':' ) !== false ) {
                list( $t_id, $t_name ) = explode( ':', $t_part, 2 );
                $t_status_values[intval(trim($t_id))] = trim($t_name);
            }
        }
        
        # If still empty, use hardcoded fallback
        if( empty( $t_status_values ) ) {
            log_event( LOG_PLUGIN, "Kanban: Manual parsing failed, using hardcoded fallback" );
            $t_status_values = array(
                10 => 'new',
                20 => 'feedback',
                30 => 'acknowledged', 
                40 => 'confirmed',
                50 => 'assigned',
                60 => 'in progress',
                70 => 'ready to test',
                75 => 'testing',
                80 => 'resolved',
                90 => 'closed'
            );
        }
        
    } catch( Exception $e2 ) {
        log_event( LOG_PLUGIN, "Kanban: Error getting statuses: " . $e2->getMessage() );
        # Use hardcoded fallback
        $t_status_values = array(
            10 => 'new',
            20 => 'feedback',
            30 => 'acknowledged', 
            40 => 'confirmed',
            50 => 'assigned',
            60 => 'in progress',
            70 => 'ready to test',
            75 => 'testing',
            80 => 'resolved',
            90 => 'closed'
        );
    }
    
} catch( Exception $e ) {
    # If database fails, show basic message with your custom statuses
    $t_bugs_by_status = array();
    $t_status_values = array( 
        10 => 'new',
        20 => 'feedback', 
        30 => 'acknowledged',
        40 => 'confirmed',
        50 => 'assigned',
        60 => 'in progress',
        70 => 'ready to test',
        75 => 'testing',
        80 => 'resolved',
        90 => 'closed'
    );
}

# Get parent tickets that have children for dropdown
$t_parent_tickets = array();
$t_selected_parent = gpc_get_int( 'parent_id', 0 );

try {
    # Get all tickets that have children (are source in parent-child relationships)
    $t_bug_table = db_get_table( 'mantis_bug_table' );
    $t_relationship_table = db_get_table( 'mantis_bug_relationship_table' );
    
    # Project filter for parent tickets
    if( $t_project_id == ALL_PROJECTS ) {
        $t_project_clause = '';
        $t_params = array( BUG_DEPENDANT );
        
        # Get all projects user has access to
        $t_accessible_projects = user_get_accessible_projects( auth_get_current_user_id() );
        if( !empty( $t_accessible_projects ) ) {
            $t_project_clause = ' AND b.project_id IN (' . implode( ',', $t_accessible_projects ) . ')';
        }
    } else {
        $t_project_clause = ' AND b.project_id = ' . db_param();
        $t_params = array( BUG_DEPENDANT, $t_project_id );
    }
    
    $t_parent_query = "SELECT DISTINCT b.id, b.summary, b.status 
                       FROM $t_bug_table b
                       JOIN $t_relationship_table r ON b.id = r.source_bug_id 
                       WHERE r.relationship_type = " . db_param() . $t_project_clause . "
                       ORDER BY b.id DESC";
    
    $t_parent_result = db_query_bound( $t_parent_query, $t_params );
    
    while( $t_row = db_fetch_array( $t_parent_result ) ) {
        $t_parent_tickets[] = $t_row;
    }
    
} catch( Exception $e ) {
    log_event( LOG_PLUGIN, "Kanban: Error getting parent tickets: " . $e->getMessage() );
}

# If a parent ticket is selected, filter bugs to show only its children
if( $t_selected_parent > 0 ) {
    $t_bugs_by_status = array();
    
    try {
        # Get child tickets of the selected parent
        $t_child_query = "SELECT b.id, b.project_id, b.summary, b.status, b.priority, b.severity, b.reporter_id, b.handler_id, b.date_submitted
                          FROM $t_bug_table b
                          JOIN $t_relationship_table r ON b.id = r.destination_bug_id 
                          WHERE r.source_bug_id = " . db_param() . " AND r.relationship_type = " . db_param() . "
                          ORDER BY b.status, b.id DESC";
        
        $t_child_result = db_query_bound( $t_child_query, array( $t_selected_parent, BUG_DEPENDANT ) );
        
        while( $t_row = db_fetch_array( $t_child_result ) ) {
            $t_status = $t_row['status'];
            if( !isset( $t_bugs_by_status[$t_status] ) ) {
                $t_bugs_by_status[$t_status] = array();
            }
            $t_bugs_by_status[$t_status][] = $t_row;
        }
        
    } catch( Exception $e ) {
        log_event( LOG_PLUGIN, "Kanban: Error getting child tickets: " . $e->getMessage() );
    }
}
?>

<div class="kanban-container">
    <div class="kanban-header">
        <div>
            <h1 class="kanban-title">
                <i class="fa fa-columns"></i>
                Simple Kanban Board - <?php echo string_display_line( $t_project_name ); ?>
                <?php if( $t_selected_parent > 0 ) { 
                    $t_parent_info = '';
                    foreach( $t_parent_tickets as $t_parent ) {
                        if( $t_parent['id'] == $t_selected_parent ) {
                            $t_parent_info = ' - Children of #' . $t_parent['id'] . ': ' . string_display_line( $t_parent['summary'] );
                            break;
                        }
                    }
                    echo $t_parent_info;
                } ?>
            </h1>
            <p class="kanban-subtitle">
                <?php if( $t_selected_parent > 0 ) { ?>
                    Child tickets of the selected parent ticket
                <?php } else { ?>
                    Visual overview of bugs in the current project
                <?php } ?>
            </p>
        </div>
        <div class="kanban-actions">
            <button type="button" class="btn btn-success" id="refresh-btn">
                <i class="fa fa-refresh"></i> Refresh
            </button>
            <a href="<?php echo helper_mantis_url( 'view_all_bug_page.php' ); ?>" 
               class="btn btn-primary" 
               target="_blank" 
               rel="noopener noreferrer">
                <i class="fa fa-list"></i> View All
            </a>
            <a href="<?php echo helper_mantis_url( 'bug_report_page.php' ); ?>" 
               class="btn btn-info" 
               target="_blank" 
               rel="noopener noreferrer">
                <i class="fa fa-plus"></i> New Bug
            </a>
        </div>
    </div>

    <!-- Filter Controls -->
    <div class="kanban-filters">
        <div class="filter-row">
            <div class="search-box">
                <i class="fa fa-search"></i>
                <input type="text" id="board-search" placeholder="Search board" autocomplete="off">
            </div>
            <div class="filter-dropdown">
                <button class="filter-btn" id="filter-btn">
                    <i class="fa fa-filter"></i> Filter
                </button>
                <div class="filter-panel" id="filter-panel">
                    <div class="filter-categories">
                        <div class="filter-category" data-category="assignee">
                            <i class="fa fa-user"></i>
                            <span>Assignee</span>
                        </div>
                        <div class="filter-category" data-category="parent">
                            <i class="fa fa-sitemap"></i>
                            <span>Parent Ticket</span>
                        </div>
                        <div class="filter-category" data-category="priority">
                            <i class="fa fa-exclamation-triangle"></i>
                            <span>Priority</span>
                        </div>
                        <div class="filter-category" data-category="status">
                            <i class="fa fa-tag"></i>
                            <span>Status</span>
                        </div>
                        <div class="filter-category" data-category="labels">
                            <i class="fa fa-tags"></i>
                            <span>Labels</span>
                        </div>
                    </div>
                    <div class="filter-options-panel">
                        <div class="filter-options-header">
                            <span id="current-category-title">Select a field to start creating a filter.</span>
                            <div class="options-search" id="options-search-container" style="display: none;">
                                <input type="text" placeholder="Search..." id="options-search" autocomplete="off">
                            </div>
                        </div>
                        
                        <!-- Assignee Options -->
                        <div class="filter-options active" id="assignee-options">
                            <label class="filter-checkbox">
                                <input type="checkbox" value="" data-filter="assignee">
                                <span class="checkmark"></span>
                                <span class="user-icon">👤</span>
                                <span class="filter-text">Unassigned</span>
                            </label>
                            <?php
                            # Get all users who have bugs assigned
                            $t_users = array();
                            foreach( $t_bugs_by_status as $status_bugs ) {
                                foreach( $status_bugs as $bug ) {
                                    if( $bug['handler_id'] > 0 && !isset( $t_users[$bug['handler_id']] ) ) {
                                        $t_users[$bug['handler_id']] = user_get_username( $bug['handler_id'] );
                                    }
                                }
                            }
                            foreach( $t_users as $user_id => $username ) {
                                echo "<label class='filter-checkbox'>";
                                echo "<input type='checkbox' value='{$user_id}' data-filter='assignee'>";
                                echo "<span class='checkmark'></span>";
                                echo "<span class='user-avatar'>" . strtoupper(substr($username, 0, 2)) . "</span>";
                                echo "<span class='filter-text'>{$username}</span>";
                                echo "</label>";
                            }
                            ?>
                        </div>
                        
                        <!-- Parent Ticket Options -->
                        <div class="filter-options" id="parent-options">
                            <label class="filter-checkbox">
                                <input type="checkbox" value="0" data-filter="parent">
                                <span class="checkmark"></span>
                                <span class="parent-icon">📋</span>
                                <span class="filter-text">Show all tickets (no parent filter)</span>
                            </label>
                            <?php
                            foreach( $t_parent_tickets as $parent ) {
                                $parent_summary = string_display_line( $parent['summary'] );
                                if( strlen($parent_summary) > 50 ) {
                                    $parent_summary = substr($parent_summary, 0, 47) . '...';
                                }
                                echo "<label class='filter-checkbox'>";
                                echo "<input type='checkbox' value='{$parent['id']}' data-filter='parent'>";
                                echo "<span class='checkmark'></span>";
                                echo "<span class='parent-icon'>🔗</span>";
                                echo "<span class='filter-text'>#{$parent['id']}: {$parent_summary}</span>";
                                echo "</label>";
                            }
                            ?>
                        </div>
                        
                        <!-- Priority Options -->
                        <div class="filter-options" id="priority-options">
                            <?php
                            $t_priorities = array(
                                10 => array('name' => 'none', 'color' => '#8B8B8B'),
                                20 => array('name' => 'low', 'color' => '#4CAF50'), 
                                30 => array('name' => 'normal', 'color' => '#2196F3'),
                                40 => array('name' => 'high', 'color' => '#FF9800'),
                                50 => array('name' => 'urgent', 'color' => '#F44336'),
                                60 => array('name' => 'immediate', 'color' => '#9C27B0')
                            );
                            foreach( $t_priorities as $priority_id => $priority_info ) {
                                echo "<label class='filter-checkbox'>";
                                echo "<input type='checkbox' value='{$priority_id}' data-filter='priority'>";
                                echo "<span class='checkmark'></span>";
                                echo "<span class='priority-indicator' style='background-color: {$priority_info['color']}'></span>";
                                echo "<span class='filter-text'>" . ucfirst($priority_info['name']) . "</span>";
                                echo "</label>";
                            }
                            ?>
                        </div>
                        
                        <!-- Status Options -->
                        <div class="filter-options" id="status-options">
                            <?php
                            foreach( $t_status_values as $status_id => $status_name ) {
                                $status_class = 'status-' . str_replace( array(' ', '_'), '-', strtolower( $status_name ) );
                                echo "<label class='filter-checkbox'>";
                                echo "<input type='checkbox' value='{$status_id}' data-filter='status'>";
                                echo "<span class='checkmark'></span>";
                                echo "<span class='status-indicator {$status_class}'></span>";
                                echo "<span class='filter-text'>" . ucfirst(str_replace('-', ' ', $status_name)) . "</span>";
                                echo "</label>";
                            }
                            ?>
                        </div>
                        
                        <!-- Labels Options -->
                        <div class="filter-options" id="labels-options">
                            <div class="no-options">
                                <span>No labels available</span>
                            </div>
                        </div>
                        
                        <div class="filter-bottom-info">
                            <span id="selection-count">2 of 2</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Column Visibility Controls -->
    <div class="column-controls">
        <h4>
            <i class="fa fa-eye"></i> Show/Hide Status Columns
            <button class="show-all-btn" id="show-all-btn">Show All</button>
            <button class="hide-empty-btn" id="hide-empty-btn">Hide Empty</button>
        </h4>
        <div class="column-toggles">
            <?php
            # Create toggles for all possible statuses
            $t_all_statuses = array(
                10 => 'new',
                20 => 'feedback',
                30 => 'acknowledged', 
                40 => 'confirmed',
                50 => 'assigned',
                60 => 'in progress',
                70 => 'ready to test',
                75 => 'testing',
                80 => 'resolved',
                90 => 'closed'
            );
            
            foreach( $t_all_statuses as $t_toggle_status_id => $t_toggle_status_name ) {
                $t_has_bugs = isset( $t_bugs_by_status[$t_toggle_status_id] ) && !empty( $t_bugs_by_status[$t_toggle_status_id] );
                $t_bug_count = $t_has_bugs ? count( $t_bugs_by_status[$t_toggle_status_id] ) : 0;
                
                # Default visible statuses: New, Assigned, In Progress, Ready To Test, Testing, Resolved, Closed
                $t_default_visible = in_array($t_toggle_status_id, array(10, 50, 60, 70, 75, 80, 90));
                $t_checked = $t_default_visible ? 'checked' : '';
                $t_active_class = $t_checked ? 'active' : '';
            ?>
                <div class="column-toggle <?php echo $t_active_class; ?>" data-status-id="<?php echo $t_toggle_status_id; ?>">
                    <input type="checkbox" 
                           id="toggle-<?php echo $t_toggle_status_id; ?>" 
                           <?php echo $t_checked; ?>>
                    <label for="toggle-<?php echo $t_toggle_status_id; ?>">
                        <?php echo ucfirst($t_toggle_status_name); ?> (<?php echo $t_bug_count; ?>)
                    </label>
                </div>
            <?php } ?>
        </div>
    </div>

    <!-- Active Filters Display -->
    <div class="active-filters-container" id="active-filters" style="display: none;">
        <div class="active-filters-header">
            <i class="fa fa-filter"></i>
            <span>Active Filters:</span>
        </div>
        <div class="active-filters-list" id="active-filters-list">
            <!-- Filter tags will be dynamically added here -->
        </div>
        <button type="button" class="clear-all-filters" id="clear-all-filters">
            <i class="fa fa-times"></i> Clear All
        </button>
    </div>

    <div class="kanban-board">
        <?php
        # Define status columns to display
        $t_display_statuses = array();
        
        if( !empty( $t_status_values ) ) {
            # Show standard workflow statuses: New, Feedback, Acknowledged, Confirmed, Assigned, In Progress, Ready To Test, Testing, Resolved, Closed
            foreach( $t_status_values as $t_status_id => $t_status_name ) {
                $t_default_statuses = array(10, 20, 30, 40, 50, 60, 70, 75, 80, 90); 
                
                # Show if it's a default status or has bugs
                if( in_array($t_status_id, $t_default_statuses) || isset( $t_bugs_by_status[$t_status_id] ) ) {
                    $t_display_statuses[$t_status_id] = $t_status_name;
                }
            }
        }
        
        # If no display statuses found, use all configured statuses
        if( empty( $t_display_statuses ) ) {
            $t_display_statuses = array(
                10 => 'new',
                20 => 'feedback', 
                30 => 'acknowledged',
                40 => 'confirmed',
                50 => 'assigned',
                60 => 'in progress',
                70 => 'ready to test',
                75 => 'testing',
                80 => 'resolved',
                90 => 'closed'
            );
        }

        foreach( $t_display_statuses as $t_status_id => $t_status_name ) {
            $t_bug_count = isset( $t_bugs_by_status[$t_status_id] ) ? count( $t_bugs_by_status[$t_status_id] ) : 0;
            $t_status_class = 'status-' . str_replace( array(' ', '_'), '-', strtolower( $t_status_name ) );
            $t_has_bugs = $t_bug_count > 0;
        ?>
            <div class="kanban-column" 
                 data-status-id="<?php echo $t_status_id; ?>" 
                 data-status-name="<?php echo $t_status_name; ?>"
                 data-has-bugs="<?php echo $t_has_bugs ? 'true' : 'false'; ?>">
                <div class="kanban-column-header <?php echo $t_status_class; ?>">
                    <span><?php echo string_display_line( ucfirst($t_status_name) ); ?></span>
                    <span class="kanban-column-count"><?php echo $t_bug_count; ?></span>
                </div>
                <div class="kanban-column-body" data-status="<?php echo $t_status_id; ?>">
                    <?php
                    if( isset( $t_bugs_by_status[$t_status_id] ) && !empty( $t_bugs_by_status[$t_status_id] ) ) {
                        foreach( $t_bugs_by_status[$t_status_id] as $t_bug ) {
                            $t_priority_class = 'priority-normal';
                            if( $t_bug['priority'] >= 40 ) {
                                $t_priority_class = 'priority-high';
                            } else if( $t_bug['priority'] <= 20 ) {
                                $t_priority_class = 'priority-low';
                            }
                    ?>
                        <div class="kanban-card" 
                             data-bug-id="<?php echo $t_bug['id']; ?>"
                             data-priority="<?php echo $t_bug['priority']; ?>"
                             data-assignee="<?php echo $t_bug['handler_id'] ? $t_bug['handler_id'] : ''; ?>"
                             data-status="<?php echo $t_status_id; ?>">
                            <div class="kanban-card-id">#<?php echo $t_bug['id']; ?></div>
                            <div class="kanban-card-title">
                                <a href="<?php echo helper_mantis_url( 'view.php?id=' . $t_bug['id'] ); ?>" 
                                   target="_blank" 
                                   rel="noopener noreferrer" 
                                   style="text-decoration: none; color: inherit;">
                                    <?php echo string_display_line( $t_bug['summary'] ); ?>
                                </a>
                            </div>
                            <div class="kanban-card-meta">
                                <span class="kanban-card-priority <?php echo $t_priority_class; ?>">
                                    <?php echo get_enum_element( 'priority', $t_bug['priority'] ); ?>
                                </span>
                                <span class="kanban-card-assignee <?php echo $t_bug['handler_id'] ? 'assigned' : 'unassigned'; ?>">
                                    <?php 
                                    if( $t_bug['handler_id'] ) {
                                        echo '👤 ' . string_display_line( user_get_name( $t_bug['handler_id'] ) );
                                    } else {
                                        echo '👤 Unassigned';
                                    }
                                    ?>
                                </span>
                            </div>
                        </div>
                    <?php
                        }
                    } else {
                    ?>
                        <div class="kanban-empty">
                            No bugs in this status
                            <!-- Debug: Status <?php echo $t_status_id; ?> (<?php echo $t_status_name; ?>) -->
                        </div>
                    <?php
                    }
                    ?>
                </div>
            </div>
        <?php
        }
        ?>
    </div>
</div>

<!-- Drag feedback -->
<div id="drag-feedback" class="drag-feedback"></div>

<?php
# Include scripts with correct MantisBT paths and store config in data attributes
$t_plugin_current = plugin_get_current();
echo '<script src="../plugins/' . $t_plugin_current . '/js/Sortable.min.js"></script>';

# Store configuration in DOM data attributes instead of inline script
echo '<div id="kanban-config" ';
echo 'data-update-status-url="' . addslashes(plugin_page('update_status')) . '" ';
echo 'data-view-url="' . addslashes(helper_mantis_url('view.php?id=')) . '" ';
echo 'style="display: none;"></div>';

echo '<script src="../plugins/' . $t_plugin_current . '/js/kanban.js"></script>';
?>

<?php
layout_page_end();
?>