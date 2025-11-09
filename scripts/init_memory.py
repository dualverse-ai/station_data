#!/usr/bin/env python3
"""
Initialize memory capsule indices for Station Viewer.
This module provides functions to generate memory indices with metadata.

Usage:
    As a module: from init_memory import init_public_memory, init_private_memory
    As a script: python scripts/init_memory.py <station_id>
"""

import os
import json
import yaml
from pathlib import Path


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

    return 'Unknown'


def init_public_memory(station_path):
    """
    Generate _index.json with metadata for public memory directory.

    Args:
        station_path: Full path to the station directory

    Returns:
        List of public memory metadata dicts, or empty list if no public memory
    """
    public_path = os.path.join(station_path, 'capsules', 'public')
    if not os.path.exists(public_path):
        return []

    memories = []

    # Process each public memory yaml file
    for filename in os.listdir(public_path):
        if filename.endswith('.yaml'):
            filepath = os.path.join(public_path, filename)
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    data = yaml.safe_load(f)

                # Skip deleted capsules
                if data.get('is_deleted', False):
                    continue

                # Extract metadata
                memory_id = filename[:-5]  # Remove .yaml extension

                # Extract all required fields
                author_name = data.get('author_name', 'Unknown')
                metadata = {
                    'id': data.get('capsule_id', memory_id),
                    'name': data.get('title', 'Untitled'),
                    'author': author_name,
                    'author_model': get_author_model(station_path, author_name),
                    'creation_tick': data.get('created_at_tick', 0),
                    'last_update_tick': data.get('last_updated_at_tick', 0),
                    'num_messages': len(data.get('messages', [])),
                    'word_count': data.get('word_count_total', 0)
                }

                memories.append(metadata)

            except Exception as e:
                print(f"  Warning: Could not process {filename}: {e}")
                continue

    # Sort by creation tick (ascending)
    memories.sort(key=lambda x: x['creation_tick'])

    # Write index file
    index_path = os.path.join(public_path, '_index.json')
    with open(index_path, 'w') as f:
        json.dump({'memories': memories}, f, indent=2)

    return memories


def init_private_memory(station_path):
    """
    Generate _index.json with metadata for each lineage in private memory.

    Args:
        station_path: Full path to the station directory

    Returns:
        Dict mapping lineage names to lists of memory metadata
    """
    private_path = os.path.join(station_path, 'capsules', 'private')
    if not os.path.exists(private_path):
        return {}

    all_lineages = {}

    # Process each lineage directory
    for lineage_dir in os.listdir(private_path):
        if not lineage_dir.startswith('lineage_'):
            continue

        lineage_name = lineage_dir.replace('lineage_', '')
        lineage_path = os.path.join(private_path, lineage_dir)

        if not os.path.isdir(lineage_path):
            continue

        memories = []

        # Process each private memory yaml file in this lineage
        for filename in os.listdir(lineage_path):
            if filename.endswith('.yaml'):
                filepath = os.path.join(lineage_path, filename)
                try:
                    with open(filepath, 'r', encoding='utf-8') as f:
                        data = yaml.safe_load(f)

                    # Skip deleted capsules
                    if data.get('is_deleted', False):
                        continue

                    # Extract metadata
                    memory_id = filename[:-5]  # Remove .yaml extension

                    # Extract all required fields
                    author_name = data.get('author_name', 'Unknown')
                    metadata = {
                        'id': data.get('capsule_id', memory_id),
                        'name': data.get('title', 'Untitled'),
                        'author': author_name,
                        'author_model': get_author_model(station_path, author_name),
                        'creation_tick': data.get('created_at_tick', 0),
                        'last_update_tick': data.get('last_updated_at_tick', 0),
                        'num_messages': len(data.get('messages', [])),
                        'word_count': data.get('word_count_total', 0),
                        'lineage': lineage_name
                    }

                    memories.append(metadata)

                except Exception as e:
                    print(f"    Warning: Could not process {lineage_name}/{filename}: {e}")
                    continue

        if memories:
            # Sort by creation tick (ascending)
            memories.sort(key=lambda x: x['creation_tick'])

            # Write index file for this lineage
            index_path = os.path.join(lineage_path, '_index.json')
            with open(index_path, 'w') as f:
                json.dump({'memories': memories}, f, indent=2)

            all_lineages[lineage_name] = memories

    # Also create a combined index at the private directory level
    combined_memories = []
    for lineage, memories in all_lineages.items():
        combined_memories.extend(memories)

    # Sort combined list by creation tick
    combined_memories.sort(key=lambda x: x['creation_tick'])

    # Write combined index
    combined_index_path = os.path.join(private_path, '_index.json')
    with open(combined_index_path, 'w') as f:
        json.dump({'memories': combined_memories, 'lineages': list(all_lineages.keys())}, f, indent=2)

    return all_lineages


def main():
    """Main function when run as a script."""
    import sys

    if len(sys.argv) < 2:
        print("Usage: python init_memory.py <station_id>")
        print("  or   python init_memory.py --all")
        sys.exit(1)

    # Get viewer directory
    script_dir = os.path.dirname(os.path.abspath(__file__))
    viewer_dir = os.path.dirname(script_dir)
    data_dir = os.path.join(viewer_dir, 'data')

    if sys.argv[1] == '--all':
        # Initialize all stations
        print("Initializing memory capsule indices for all stations...")
        count = 0
        for folder in os.listdir(data_dir):
            folder_path = os.path.join(data_dir, folder)
            if os.path.isdir(folder_path) and len(folder) >= 36 and folder.count('-') == 4:
                public_memories = init_public_memory(folder_path)
                private_lineages = init_private_memory(folder_path)

                print(f"  {folder[:8]}:")
                if public_memories:
                    print(f"    Public: {len(public_memories)} memories")
                if private_lineages:
                    total_private = sum(len(mems) for mems in private_lineages.values())
                    print(f"    Private: {total_private} memories across {len(private_lineages)} lineages")

                if public_memories or private_lineages:
                    count += 1
        print(f"Initialized memory capsules for {count} stations")
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

        public_memories = init_public_memory(station_path)
        private_lineages = init_private_memory(station_path)

        print(f"Station {station_id[:8]}:")
        if public_memories:
            print(f"  Public Memory: {len(public_memories)} capsules indexed")
        else:
            print(f"  Public Memory: No capsules found")

        if private_lineages:
            total_private = sum(len(mems) for mems in private_lineages.values())
            print(f"  Private Memory: {total_private} capsules across {len(private_lineages)} lineages")
        else:
            print(f"  Private Memory: No lineages found")


if __name__ == '__main__':
    main()