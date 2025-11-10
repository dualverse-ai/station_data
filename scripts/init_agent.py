#!/usr/bin/env python3
"""
Initialize agent indices for Station Viewer.
This module provides functions to generate agent indices for specific stations.

Usage:
    As a module: from init_agent import init_agent_index
    As a script: python scripts/init_agent.py <station_id>
"""

import os
import json
from datetime import datetime

import yaml


def init_agent_index(station_path):
    """Generate agent index (with summaries) for a specific station."""

    agents_path = os.path.join(station_path, 'agents')
    if not os.path.exists(agents_path):
        return []

    agent_files = []
    agent_summaries = []

    for filename in sorted(os.listdir(agents_path)):
        if not filename.endswith('.yaml'):
            continue

        agent_name = filename[:-5]

        # Skip viewer-only/system helpers and guest agents
        if filename == 'AutoArchiveEvaluator.yaml' or agent_name.startswith('Guest_'):
            continue

        summary = build_agent_summary(os.path.join(agents_path, filename), agent_name)
        if summary is None:
            continue

        agent_files.append(agent_name)
        agent_summaries.append(summary)

    index_payload = {
        'files': agent_files,
        'agent_summaries': agent_summaries,
        'generated_at': datetime.utcnow().isoformat() + 'Z',
    }

    index_path = os.path.join(agents_path, '_index.json')
    with open(index_path, 'w') as f:
        json.dump(index_payload, f, indent=2)

    return agent_files


def build_agent_summary(agent_file, agent_name):
    """Build a lightweight summary for displaying an agent in the table."""

    try:
        with open(agent_file, 'r') as f:
            data = yaml.safe_load(f) or {}
    except Exception as exc:
        print(f"  Warning: could not parse {agent_file}: {exc}")
        data = {}

    status = data.get('status')
    session_ended = data.get('session_ended')
    tick_exit = data.get('tick_exit')

    # Special handling for Reviewer entry
    is_reviewer = agent_name == 'Reviewer' or status == 'Reviewer'

    display_name = 'Reviewer' if is_reviewer else data.get('agent_name') or agent_name
    tick_birth = 'n/a' if is_reviewer else data.get('tick_birth')
    description = data.get('description')
    if is_reviewer and not description:
        description = 'Archive Evaluation Reviewer'

    tick_exit_display = compute_tick_exit_display(tick_exit, session_ended, status, is_reviewer)

    return {
        'name': agent_name,
        'display_name': display_name,
        'agent_name': data.get('agent_name'),
        'model_name': data.get('model_name'),
        'tick_birth': tick_birth,
        'tick_exit': tick_exit,
        'tick_exit_display': tick_exit_display,
        'status': status,
        'session_ended': session_ended,
        'description': description,
        'lineage': data.get('lineage'),
        'generation': data.get('generation'),
    }


def compute_tick_exit_display(tick_exit, session_ended, status, is_reviewer):
    """Mirror the frontend's exit-column logic so tables don't need YAML."""

    if is_reviewer:
        return 'n/a'
    if tick_exit not in (None, ''):
        return tick_exit
    if session_ended is True:
        return 'Ended'
    if status == 'Exited':
        return 'Exited'
    return 'Active'


def check_agent_index_exists(station_path):
    """
    Check if agent index already exists for a station.

    Args:
        station_path: Full path to the station directory

    Returns:
        True if _index.json exists in agents directory, False otherwise
    """
    index_path = os.path.join(station_path, 'agents', '_index.json')
    return os.path.exists(index_path)


def main():
    """Main function when run as a script."""
    import sys

    if len(sys.argv) < 2:
        print("Usage: python init_agent.py <station_id>")
        print("  or   python init_agent.py --all")
        sys.exit(1)

    # Get viewer directory
    script_dir = os.path.dirname(os.path.abspath(__file__))
    viewer_dir = os.path.dirname(script_dir)
    data_dir = os.path.join(viewer_dir, 'data')

    if sys.argv[1] == '--all':
        # Initialize all stations
        print("Initializing agent indices for all stations...")
        count = 0
        for folder in os.listdir(data_dir):
            folder_path = os.path.join(data_dir, folder)
            if os.path.isdir(folder_path) and len(folder) >= 36 and folder.count('-') == 4:
                if not check_agent_index_exists(folder_path):
                    agents = init_agent_index(folder_path)
                    print(f"  {folder[:8]}: {len(agents)} agents indexed")
                    count += 1
        print(f"Initialized {count} stations")
    else:
        # Initialize specific station
        station_id = sys.argv[1]

        # Handle both full and short IDs
        if len(station_id) == 8:
            # Find full ID from short ID
            found = False
            for folder in os.listdir(data_dir):
                if folder.startswith(station_id):
                    station_id = folder
                    found = True
                    break
            if not found:
                print(f"Error: Station with ID {station_id} not found")
                sys.exit(1)

        station_path = os.path.join(data_dir, station_id)
        if not os.path.exists(station_path):
            print(f"Error: Station path {station_path} does not exist")
            sys.exit(1)

        agents = init_agent_index(station_path)
        print(f"Station {station_id[:8]}: {len(agents)} agents indexed")


if __name__ == '__main__':
    main()
