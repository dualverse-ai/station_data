#!/usr/bin/env python3
"""
Initialize archive indices for Station Viewer.
This module provides functions to generate archive indices with metadata.

Usage:
    As a module: from init_archive import init_archive_index
    As a script: python scripts/init_archive.py <station_id>
"""

import os
import json
import yaml
import re
from pathlib import Path


def extract_reviewer_score(messages):
    """
    Extract reviewer score from archive messages.

    Args:
        messages: List of message objects from archive capsule

    Returns:
        Score string (e.g., "9/10") or "n.a." if not found
    """
    for msg in messages:
        if msg.get('author_name') == 'Archive Review System':
            content = msg.get('content', '')
            # Look for pattern **Score:** X/10
            match = re.search(r'\*\*Score:\*\*\s*(\d+)/10', content)
            if match:
                return f"{match.group(1)}/10"
    return "n.a."


def get_author_model(station_path, author_name):
    """
    Get the model name for an author from their agent data.

    Args:
        station_path: Full path to the station directory
        author_name: Name of the author

    Returns:
        Model name string or "Unknown" if not found
    """
    # Try to load the agent data
    agent_path = os.path.join(station_path, 'agents', f'{author_name}.yaml')
    if os.path.exists(agent_path):
        try:
            with open(agent_path, 'r', encoding='utf-8') as f:
                agent_data = yaml.safe_load(f)
                return agent_data.get('model_name', 'Unknown')
        except:
            pass

    # Special case for system authors
    if author_name == 'Archive Review System':
        return 'System'

    return 'Unknown'


def init_archive_index(station_path):
    """
    Generate _index.json with metadata for archive directory of a specific station.

    Args:
        station_path: Full path to the station directory

    Returns:
        List of archive metadata dicts, or empty list if no archive directory
    """
    archive_path = os.path.join(station_path, 'capsules', 'archive')
    if not os.path.exists(archive_path):
        return []

    archives = []

    # Process each archive yaml file
    for filename in os.listdir(archive_path):
        if filename.endswith('.yaml'):
            filepath = os.path.join(archive_path, filename)
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    data = yaml.safe_load(f)

                # Skip deleted capsules
                if data.get('is_deleted', False):
                    continue

                # Extract metadata
                archive_id = filename[:-5]  # Remove .yaml extension

                # Extract all required fields
                author_name = data.get('author_name', 'Unknown')
                metadata = {
                    'id': data.get('capsule_id', archive_id),
                    'name': data.get('title', 'Untitled'),
                    'author': author_name,
                    'author_model': get_author_model(station_path, author_name),
                    'creation_tick': data.get('created_at_tick', 0),
                    'last_update_tick': data.get('last_updated_at_tick', 0),
                    'num_responses': len(data.get('messages', [])),
                    'word_count': data.get('word_count_total', 0),
                    'reviewer_score': extract_reviewer_score(data.get('messages', []))
                }

                archives.append(metadata)

            except Exception as e:
                print(f"  Warning: Could not process {filename}: {e}")
                continue

    # Sort by creation tick (ascending)
    archives.sort(key=lambda x: x['creation_tick'])

    # Write index file
    index_path = os.path.join(archive_path, '_index.json')
    with open(index_path, 'w') as f:
        json.dump({'archives': archives}, f, indent=2)

    return archives


def check_archive_index_exists(station_path):
    """
    Check if archive index already exists for a station.

    Args:
        station_path: Full path to the station directory

    Returns:
        True if _index.json exists in archive directory, False otherwise
    """
    index_path = os.path.join(station_path, 'capsules', 'archive', '_index.json')
    return os.path.exists(index_path)


def main():
    """Main function when run as a script."""
    import sys

    if len(sys.argv) < 2:
        print("Usage: python init_archive.py <station_id>")
        print("  or   python init_archive.py --all")
        sys.exit(1)

    # Get viewer directory
    script_dir = os.path.dirname(os.path.abspath(__file__))
    viewer_dir = os.path.dirname(script_dir)
    data_dir = os.path.join(viewer_dir, 'data')

    if sys.argv[1] == '--all':
        # Initialize all stations
        print("Initializing archive indices for all stations...")
        count = 0
        for folder in os.listdir(data_dir):
            folder_path = os.path.join(data_dir, folder)
            if os.path.isdir(folder_path) and len(folder) >= 36 and folder.count('-') == 4:
                archives = init_archive_index(folder_path)
                if archives:
                    print(f"  {folder[:8]}: {len(archives)} archives indexed")
                    count += 1
        print(f"Initialized archives for {count} stations")
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

        archives = init_archive_index(station_path)
        if archives:
            print(f"Station {station_id[:8]}: {len(archives)} archives indexed")
        else:
            print(f"Station {station_id[:8]}: No archives found")


if __name__ == '__main__':
    main()