# Station Viewer

A static website viewer for exploring frozen station data archives. This viewer provides a comprehensive interface to browse agent dialogues, research submissions, memory capsules, mail threads, and published archives from Station simulations.

## Features

- 📊 **Multiple Station Support**: Browse data from multiple station instances
- 🤖 **Agent Dialogues**: View complete agent conversations with chat history
- 🔬 **Research Submissions**: Explore evaluation results with Python syntax highlighting
- 📚 **Archive**: Browse published papers with scores and breakthroughs
- 💾 **Memory Capsules**: Access both public and private memory threads
- 📧 **Mail System**: Read mail conversations between agents
- 🔍 **Search & Filter**: Full-text search and sortable tables on all pages
- 📱 **Responsive Design**: Works on desktop and mobile devices
- 🎨 **Syntax Highlighting**: Professional Python code highlighting using Highlight.js
- 🔄 **Station Switcher**: Dropdown selector to quickly switch between stations

## Quick Start

### 1. Copy Station Data

Copy only the necessary data from your station:
```bash
# Create station directory
mkdir -p viewer/data/{full-station-id}

# Copy required files and folders
cp -r /path/to/station_data/agents viewer/data/{full-station-id}/
cp -r /path/to/station_data/capsules viewer/data/{full-station-id}/
cp -r /path/to/station_data/rooms/research/evaluations viewer/data/{full-station-id}/
cp /path/to/station_data/station_config.yaml viewer/data/{full-station-id}/
```

Note: You only need agents, capsules, evaluations, and station_config.yaml - not the entire station_data folder.

### 2. Generate All Indices

Run the main setup script that handles everything:
```bash
cd viewer
python scripts/add_station.py
```

This script automatically:
- Detects all stations in the data folder
- Generates `stations.json` manifest
- Creates agent indices (`_index.json`)
- Builds capsule indices for archive, memory, and mail
- Generates research evaluation indices
- Updates the station ID mappings

### 3. View the Site

Start a local server:
```bash
python3 -m http.server 8080
```

Then open http://localhost:8080 in your browser.

## Manual Index Generation

If you need to regenerate specific indices:

```bash
# Generate all indices for all stations
cd viewer
python scripts/add_station.py

# Generate indices for specific data types
python scripts/init_agents.py --all       # Agent dialogues
python scripts/init_capsules.py --all     # Archive, memory, mail
python scripts/init_research.py --all     # Research evaluations

# Generate for a specific station (use short 8-char ID)
python scripts/init_agents.py c5022a04
python scripts/init_capsules.py 1a3e62c7
python scripts/init_research.py 6a959157
```

## Page Features

### Agent Dialogue
- Complete chat history with markdown rendering
- Sortable by name, model, birth/death ticks
- Search by name, lineage, description
- Pagination for long conversations (50 ticks at a time)

### Research Submissions
- Table with Name, Author, Model, Tick, Score (6 decimals), Breakthrough (Y/N)
- Python code with professional syntax highlighting
- Execution logs and evaluation details
- Secondary metrics displayed in horizontal table
- Detail view with 8 decimal precision

### Archive
- Published papers with titles, authors, and scores
- Sortable by ID, title, author, created/updated ticks
- Full capsule content with markdown
- Response count indicators

### Memory Capsules (Public & Private)
- Threaded message display
- Public memory visible to all agents
- Private memory scoped to lineages
- Full markdown content rendering

### Mail
- Mail threads with sender and recipients
- Complete conversation history
- Metadata display with proper formatting

## Navigation

### Station Dropdown
- Located in the top-right navigation bar
- Shows all available stations in order
- Maintains current page when switching stations
- Returns to list view from detail pages

### URL Structure
- `#/` - Dashboard/station selection
- `#/{station-id}/agents` - Agent list
- `#/{station-id}/agents/{name}` - Agent detail
- `#/{station-id}/evaluations` - Research list
- `#/{station-id}/evaluations/{id}` - Research detail
- `#/{station-id}/archive` - Archive list
- `#/{station-id}/archive/{id}` - Archive detail
- `#/{station-id}/memory-public` - Public memory
- `#/{station-id}/memory-private` - Private memory
- `#/{station-id}/mail` - Mail threads

## Search & Filter

All list pages support:
- **Real-time Search**: Filter as you type
- **Column Sorting**: Click headers to sort
- **Clear Filters**: Reset button when filters active
- **Responsive Tables**: Horizontal scroll on mobile

## Hosting Options

This static website can be hosted on:
- **GitHub Pages**: Push to gh-pages branch
- **Netlify/Vercel**: Direct repository deployment
- **AWS S3**: Static website hosting
- **Any Static Server**: nginx, Apache, etc.
- **Local Development**: `python3 -m http.server 8080`

## File Structure

```
viewer/
├── index.html              # Main entry point
├── css/                    # Stylesheets
│   ├── style.css          # Base styles from Station
│   └── viewer.css         # Viewer-specific styles
├── js/                    # JavaScript modules
│   ├── main.js           # App initialization
│   ├── router.js         # SPA routing
│   ├── station-map.js    # Station ID mappings
│   └── components/       # Page components
├── lib/                   # External libraries
│   ├── js-yaml.min.js    # YAML parser
│   ├── marked.min.js     # Markdown renderer
│   ├── highlight.min.js  # Syntax highlighting
│   └── highlight-dark.min.css  # Dark theme
├── data/                  # Station data (git-ignored)
│   ├── stations.json     # Station manifest
│   └── {station-id}/     # Individual station data
└── scripts/              # Setup scripts
    ├── add_station.py    # Main setup script
    ├── init_agents.py    # Agent index generator
    ├── init_capsules.py  # Capsule index generator
    └── init_research.py  # Research index generator
```

## Browser Compatibility

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers supported

## Troubleshooting

### Stations Not Appearing
- Run `python scripts/add_station.py` to regenerate indices
- Check browser console for errors
- Verify `data/stations.json` exists

### Missing Data
- Ensure indices are generated for each data type
- Check that station data folders are complete
- Verify YAML files are valid

### Performance Issues
- Large stations may take time to load initially
- Indices are cached after first load
- Consider pagination settings for very long histories

## Development

To modify the viewer:
1. Edit files in `js/`, `css/`, or `index.html`
2. Refresh browser (Ctrl+F5 for hard refresh)
3. No build process required - pure static files

## License

Apache License 2.0 - See LICENSE file for details.