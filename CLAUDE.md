# CLAUDE.md - Station Viewer

This file provides guidance to Claude Code when working with the static station viewer in the `viewer/` directory.

## Project Overview

The Station Viewer is a **static website** for browsing frozen station data. It requires no backend server and can be hosted on GitHub Pages or any static hosting service.

## Important Rules

1. **Self-contained**: The viewer must be completely independent from the main station code. All functionality must exist within the `viewer/` folder.

2. **Static-only**: No server-side code, no API calls. All data is read from static files in `viewer/data/`.

3. **Station ID shortening**: Full station IDs like "c5022a04-4077-4fe5-8eb1-7b7e395b5bf9" are shortened to first 8 characters (e.g., "c5022a04") for URLs and display.

4. **Data format preservation**: Data files are direct copies from `station_data/` and maintain the same YAML/JSON structure.

## Architecture

### Technology Stack
- **HTML/CSS/JS only** - No build tools or frameworks
- **js-yaml** - For parsing YAML files
- **marked.js** - For markdown rendering (reused from main station)
- **Hash-based routing** - For single-page application navigation

### File Structure
```
viewer/
├── index.html              # Main entry point
├── CLAUDE.md              # This file
├── css/
│   ├── style.css          # Adapted from web_interface/static/css/style.css
│   └── viewer.css         # Additional viewer-specific styles
├── js/
│   ├── main.js            # App initialization and orchestration
│   ├── router.js          # SPA routing system
│   ├── data-loader.js     # YAML/JSON parsing and caching
│   └── components/        # Page components
│       ├── dashboard.js   # Station selection page
│       ├── agents.js      # Agent list and detail views
│       ├── evaluations.js # Research submissions
│       ├── archive.js     # Published papers
│       ├── mail.js        # Mail conversations
│       └── memory.js      # Public/private memory capsules
├── lib/
│   ├── js-yaml.min.js    # YAML parser library
│   └── marked.min.js     # Markdown renderer
├── images/
│   └── logo.png           # Station logo (copied from figure/logo.png)
└── data/
    └── {station-id}/      # Copied station data folders
        ├── station_config.yaml
        ├── agents/
        ├── capsules/
        └── evaluations/
```

### Data Structure

Each station folder contains:
- **station_config.yaml** - Station metadata (name, tick, status)
- **agents/** - Agent YAML files and chat history
  - `{agent_name}.yaml` - Agent metadata
  - `{agent_name}/llm_chat_history.yamll` - Chat history in YAML Lines format
- **capsules/** - Memory and communication data
  - `archive/` - Published papers
  - `mail/` - Mail threads
  - `public/` - Public memory
  - `private/` - Private memory (per lineage)
- **evaluations/** - Research submission results
  - `evaluation_{id}.json` - Individual evaluation data

### Routing Patterns

The viewer uses hash-based routing:
- `#/` - Dashboard/station selection
- `#/{station_id}/agents` - Agent list
- `#/{station_id}/agents/{name}` - Agent detail with chat history
- `#/{station_id}/evaluations` - Research submissions list
- `#/{station_id}/evaluations/{id}` - Evaluation detail
- `#/{station_id}/archive` - Archive list
- `#/{station_id}/archive/{id}` - Archive capsule detail
- `#/{station_id}/mail` - Mail list
- `#/{station_id}/mail/{id}` - Mail thread detail
- `#/{station_id}/memory/public` - Public memory list
- `#/{station_id}/memory/public/{id}` - Public memory detail
- `#/{station_id}/memory/private` - Private memory list
- `#/{station_id}/memory/private/{id}` - Private memory detail

## Key Components

### DataLoader (data-loader.js)
Handles all file loading and caching:
- Loads YAML files using js-yaml
- Parses YAMLL (YAML Lines) format for chat histories
- Caches parsed data in memory
- Provides directory listing via pre-generated index files

### Router (router.js)
Simple hash-based SPA router:
- Listens to hashchange events
- Matches URL patterns to components
- Passes parameters to page handlers

### Table Management
All list views use sortable tables:
- Click column headers to sort
- Default sorts defined per page
- Filter controls where applicable
- Consistent styling from main station

### Markdown Rendering
Uses marked.js with same configuration as main station:
- GitHub Flavored Markdown enabled
- Line breaks preserved
- Code blocks with syntax highlighting (if available)
- Same CSS classes for consistent styling

## Page Implementations

### 1. Dashboard (Station Selection)
- Shows large station logo
- Grid of station cards with names from station_config.yaml
- Click to enter station viewer

### 2. Agent Dialogue
**List View:**
- Table columns: Agent Name, Model Name, Tick of Birth, Tick of Death, Description
- Default sort: Ascending by tick of birth
- Special handling for "Reviewer" agent (no birth/death ticks)
- Excludes guest agents

**Detail View:**
- Agent metadata display (lineage, generation, status)
- Full chat history with markdown rendering
- Chat bubbles styled like main station (user vs agent)
- Thinking content in collapsible sections
- Back button to list

### 3. Research Submissions
**List View:**
- Table/cards showing: ID, Title, Author, Score, Status
- Default sort: Descending by ID (newest first)
- Color-coded scores

**Detail View:**
- Full submission code
- Evaluation logs
- Score and verification details

### 4. Archive
**List View:**
- Published papers with titles and authors
- Scores and publication dates

**Detail View:**
- Full capsule content
- Message thread with markdown

### 5. Memory (Public/Private)
**List View:**
- Capsule titles and creators
- Tags and timestamps

**Detail View:**
- Full message threads
- Markdown content

### 6. Mail
**List View:**
- Mail threads by subject
- Participants and last activity

**Detail View:**
- Complete conversation thread
- Sender/recipient information

## Styling Guidelines

1. **Reuse existing CSS** from `web_interface/static/css/style.css`:
   - Keep all color variables
   - Preserve markdown styling
   - Maintain chat bubble styles
   - Use same table formatting

2. **Viewer-specific styles** in `viewer.css`:
   - Station selection grid
   - Navigation adjustments
   - Remove interactive elements (buttons, forms)
   - Add sorting indicators

3. **Responsive design**:
   - Mobile-friendly tables
   - Collapsible navigation on small screens
   - Readable font sizes

## Performance Considerations

1. **Caching**: Cache parsed YAML/JSON data in memory
2. **Lazy loading**: Load chat histories only when needed
3. **Pagination**: For large lists (>100 items)
4. **Index files**: Pre-generate file listings for each directory

## Development Workflow

When modifying the viewer:

1. **Test locally**: Open `index.html` directly in browser or use a simple HTTP server
2. **Check data paths**: Ensure all file paths are relative
3. **Verify markdown**: Test various markdown formats render correctly
4. **Test navigation**: Ensure all routing patterns work
5. **Check responsive**: Test on different screen sizes

## Data Preparation

To prepare station data for the viewer:
```bash
# Copy station data (example)
cp -r station_data viewer/data/c5022a04-4077-4fe5-8eb1-7b7e395b5bf9

# Generate index files (if needed)
python scripts/generate_viewer_indices.py
```

## Browser Compatibility

Target modern browsers with:
- ES6 support (const, let, arrow functions, template literals)
- Fetch API
- CSS Grid and Flexbox
- No IE11 support required

## Future Enhancements

Potential additions (not yet implemented):
- Search functionality across all content
- Data export features (CSV, JSON)
- Visualization charts for statistics
- Comparison views between agents
- Timeline view of station events