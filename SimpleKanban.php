<?php
/**
 * Simple Kanban Board Plugin for MantisBT
 * A safe, minimal implementation
 */

class SimpleKanbanPlugin extends MantisPlugin {
    
    /**
     * Plugin registration
     */
    function register() {
        $this->name = 'Simple Kanban';
        $this->description = 'A simple Kanban board for bug tracking with drag-and-drop functionality';
        $this->page = 'kanban';
        $this->version = '1.0.4';
        $this->requires = array(
            'MantisCore' => '2.0.0',
        );
        $this->author = 'Anson';
        $this->contact = 'anson@local';
        $this->url = '';
    }

    /**
     * Plugin hooks
     */
    function hooks() {
        return array(
            'EVENT_MENU_MAIN' => 'menu_main',
        );
    }
    
    /**
     * Plugin pages
     */
    function init() {
        $this->page = 'kanban';
    }

    /**
     * Menu items for main navigation (following Time Tracking pattern)
     */
    function menu_main() {
        return array(
            array(
                'title' => 'Kanban Board',
                'access_level' => config_get( 'view_bug_threshold' ),
                'url' => plugin_page( 'kanban' ),
                'icon' => 'fa-columns'
            )
        );
    }
}