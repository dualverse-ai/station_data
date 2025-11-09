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
from pathlib import Path


def init_agent_index(station_path):
    """
    Generate _index.json for agents directory of a specific station.

    Args:
        station_path: Full path to the station directory

    Returns:
        List of agent names found, or empty list if no agents directory
    """
    agents_path = os.path.join(station_path, 'agents')
    if not os.path.exists(agents_path):
        return []

    # Get all .yaml files except AutoArchiveEvaluator and Guest agents
    agent_files = []
    for f in os.listdir(agents_path):
        if f.endswith('.yaml'):
            # Skip system agents and guest agents
            if f not in ['AutoArchiveEvaluator.yaml', 'Reviewer.yaml'] and not f.startswith('Guest_'):
                # Remove .yaml extension
                agent_name = f[:-5]
                agent_files.append(agent_name)

    # Sort the list
    agent_files.sort()

    # Always check for special agents separately
    # Reviewer should be included if it exists
    if os.path.exists(os.path.join(agents_path, 'Reviewer.yaml')):
        agent_files.append('Reviewer')

    # Write index file
    index_path = os.path.join(agents_path, '_index.json')
    with open(index_path, 'w') as f:
        json.dump({'files': agent_files}, f, indent=2)

    return agent_files


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