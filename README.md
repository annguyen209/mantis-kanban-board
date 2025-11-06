# Simple Kanban Board Plugin for MantisBT

A modern, feature-rich Kanban board plugin for MantisBT that provides a visual overview of bugs and tickets with drag-and-drop functionality, advanced filtering, and parent-child ticket support.

![Kanban Board Screenshot](https://via.placeholder.com/800x400?text=Kanban+Board+Screenshot)

## Features

### 🎯 Core Functionality
- **Visual Kanban Board**: Clean, modern interface inspired by Jira
- **Drag & Drop**: Move tickets between status columns with visual feedback
- **Real-time Updates**: Status changes are saved immediately
- **Auto-assignment**: Automatic ticket assignment when moving to certain statuses

### 🔍 Advanced Filtering
- **Jira-style Filter Panel**: Two-panel filter system with categories and options
- **Multiple Filter Types**:
  - **Assignee**: Filter by user assignments (including unassigned)
  - **Priority**: Filter by ticket priority levels
  - **Status**: Filter by ticket status
  - **Parent Ticket**: Show only child tickets of specific parent tickets
  - **Search**: Real-time text search across ticket content
- **Active Filters Display**: Visual tags showing currently applied filters
- **Filter Management**: Remove individual filters or clear all at once

### 👨‍👩‍👧‍👦 Parent-Child Relationships
- **Parent Ticket Selection**: Choose parent tickets to view only their children
- **Hierarchical View**: Focus on specific ticket relationships
- **Seamless Integration**: Parent filtering integrated into the main filter system

### 🎨 User Interface
- **Modern Design**: Clean, professional interface matching Jira aesthetics
- **Responsive Layout**: Works on desktop and mobile devices
- **Visual Feedback**: Loading states, success messages, and error handling
- **Accessibility**: Keyboard navigation and screen reader support

### ⚙️ Technical Features
- **Performance Optimized**: Efficient database queries and DOM manipulation
- **Security**: Proper permission checks and data validation
- **Extensible**: Well-structured code for easy customization
- **MantisBT Integration**: Seamless integration with existing MantisBT workflows

## Installation

### Requirements
- MantisBT 2.x or higher
- PHP 7.4 or higher
- Modern web browser with JavaScript enabled

### Install Steps

1. **Download the Plugin**
   ```bash
   cd /path/to/mantisbt/plugins/
   git clone [repository-url] SimpleKanban
   ```

2. **Install via MantisBT Admin Panel**
   - Login as administrator
   - Go to `Manage → Manage Plugins`
   - Find "Simple Kanban Board" in the available plugins list
   - Click "Install"

3. **Configure Plugin (Optional)**
   - Access plugin configuration in `Manage → Manage Plugins`
   - Adjust settings as needed

## Usage

### Accessing the Kanban Board

1. **Main Navigation**: Go to `View Issues → Kanban Board` from the main menu
2. **Project Context**: The board automatically shows tickets for the current project
3. **All Projects**: Select "All Projects" to view tickets across all accessible projects

### Moving Tickets

1. **Drag & Drop**: Click and drag any ticket card to a different status column
2. **Visual Feedback**: Cards show loading state during status updates
3. **Success Confirmation**: Green success message confirms the change
4. **Auto-assignment**: Tickets may be automatically assigned based on workflow rules

### Using Filters

#### Opening the Filter Panel
- Click the **Filter** button in the top-right corner
- The filter panel will slide out from the right side

#### Filter Categories
1. **Assignee**
   - View unassigned tickets
   - Filter by specific team members
   - Search through assignee list

2. **Parent Ticket**
   - Show all tickets (default)
   - Select specific parent tickets to view only their children
   - Useful for epic/story relationships

3. **Priority**
   - Filter by priority levels (None, Low, Normal, High, Urgent)
   - Visual priority indicators

4. **Status**
   - Filter by any status in your workflow
   - Supports custom status configurations

#### Search Functionality
- Use the main search box for real-time text filtering
- Search within filter categories using the category search boxes
- Search terms are highlighted in results

#### Managing Active Filters
- **View Active Filters**: Blue filter tags appear above the board
- **Remove Individual Filters**: Click the × on any filter tag
- **Clear All Filters**: Use the "Clear All" button
- **Filter Persistence**: Filters remain active during navigation

### Parent-Child Workflows

#### Viewing Child Tickets
1. Select **Parent Ticket** from the filter categories
2. Choose a parent ticket from the list
3. The board will show only child tickets of that parent
4. The header will update to show the current parent context

#### Working with Hierarchies
- Use parent filtering to focus on specific epics or features
- Move child tickets through your workflow independently
- Return to "Show all tickets" to see the full project view

## Configuration

### Status Configuration
The plugin automatically adapts to your MantisBT status configuration:
- Reads status values from `$g_status_enum_string`
- Supports custom status names and workflows
- Handles missing or custom statuses gracefully

### Auto-assignment Rules
Configure automatic assignment behavior in your MantisBT workflow:
- Set up status transition rules
- Define assignment policies for specific statuses
- The plugin respects existing MantisBT assignment logic

### Permissions
The plugin respects all MantisBT permission levels:
- **View Access**: Users can only see tickets they have permission to view
- **Update Access**: Users can only move tickets they have permission to update
- **Project Access**: Filtering respects project-level permissions

## Customization

### Custom Status Colors
Add custom status colors in your `config_inc.php`:
```php
$g_status_colors['custom_status'] = '#FF5722';
```

### Custom CSS
Override default styles by adding custom CSS:
```css
/* Custom ticket card styling */
.kanban-card {
    border-left: 4px solid #your-color;
}

/* Custom column styling */
.kanban-column[data-status="your-status"] {
    background: #your-background;
}
```

### JavaScript Extensions
Extend functionality by adding custom JavaScript:
```javascript
// Custom drag behavior
document.addEventListener('DOMContentLoaded', function() {
    // Your custom code here
});
```

## Troubleshooting

### Common Issues

**Board Not Loading**
- Check database connectivity
- Verify plugin installation
- Check browser console for JavaScript errors

**Drag & Drop Not Working**
- Ensure JavaScript is enabled
- Check for browser compatibility
- Verify user permissions for ticket updates

**Filters Not Applying**
- Clear browser cache
- Check for JavaScript errors
- Verify database queries in MantisBT logs

**Performance Issues**
- Check database indexes on bug table
- Monitor PHP memory usage
- Consider project-based filtering for large datasets

### Debug Mode
Enable debug logging in your `config_inc.php`:
```php
$g_log_level = LOG_PLUGIN;
$g_log_destination = 'file:/path/to/mantisbt.log';
```

## File Structure

```
plugins/SimpleKanban/
├── README.md                     # This file
├── SimpleKanban.php             # Main plugin file
├── pages/
│   └── kanban.php              # Main Kanban board page
├── css/
│   └── kanban.css              # Stylesheet
├── js/
│   └── kanban.js               # JavaScript functionality
└── lang/
    └── strings_english.txt     # Language strings
```

## Contributing

### Development Setup
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

### Code Standards
- Follow MantisBT coding standards
- Use meaningful variable names
- Comment complex logic
- Test across different browsers

### Testing
- Test with different MantisBT versions
- Verify across different project configurations
- Test permission levels and user roles
- Validate mobile responsiveness

## Changelog

### Version 1.0.4
- Added parent-child ticket filtering
- Implemented active filters display
- Enhanced search functionality
- Improved visual feedback

### Version 1.0.3
- Added Jira-style filter panel
- Implemented two-panel filter system
- Added real-time search
- Fixed CSS positioning issues

### Version 1.0.2
- Added drag & drop functionality
- Implemented auto-assignment
- Added visual feedback system
- Enhanced error handling

### Version 1.0.1
- Initial release
- Basic Kanban board layout
- Status column organization
- MantisBT integration

## License

This plugin is released under the same license as MantisBT.

## Support

- **Issues**: Report bugs and feature requests via the issue tracker
- **Documentation**: Check the MantisBT plugin documentation
- **Community**: Join the MantisBT community forums

## Credits

Developed for MantisBT with inspiration from modern project management tools like Jira and Trello.

---

*Made with ❤️ for the MantisBT community*