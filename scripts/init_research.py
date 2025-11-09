#!/usr/bin/env python3
"""
Initialize research evaluation indices for Station Viewer.
This module provides functions to generate research indices with metadata and breakthrough calculation.

Usage:
    As a module: from init_research import init_research_index
    As a script: python scripts/init_research.py <station_id>
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


def get_score_from_version(evaluation, version_notified):
    """
    Extract the score from the specified version of an evaluation.

    Args:
        evaluation: The evaluation dictionary
        version_notified: The version to extract the score from

    Returns:
        Float score value or 'n.a.' if not available
    """
    if not version_notified:
        return 'n.a.'

    # Handle original submission
    if version_notified == 'original':
        if 'original_submission' in evaluation:
            result = evaluation['original_submission'].get('evaluation_result', {})
            score = result.get('score', 'n.a.')
            # Convert to float if it's a number
            if score != 'n.a.' and score is not None:
                try:
                    return float(score)
                except (ValueError, TypeError):
                    return 'n.a.'
            return score

    # Handle versioned submissions (v2, v3, etc.)
    elif 'versions' in evaluation and version_notified in evaluation['versions']:
        version_data = evaluation['versions'][version_notified]
        result = version_data.get('evaluation_result', {})
        score = result.get('score', 'n.a.')
        # Convert to float if it's a number
        if score != 'n.a.' and score is not None:
            try:
                return float(score)
            except (ValueError, TypeError):
                return 'n.a.'
        return score

    return 'n.a.'


def init_research_index(station_path):
    """
    Generate _index.json with metadata for research evaluations directory.

    Args:
        station_path: Full path to the station directory

    Returns:
        List of evaluation metadata dicts
    """
    evaluations_path = os.path.join(station_path, 'evaluations')
    if not os.path.exists(evaluations_path):
        return []

    evaluations = []

    # Process each evaluation JSON file
    for filename in os.listdir(evaluations_path):
        if filename.startswith('evaluation_') and filename.endswith('.json'):
            filepath = os.path.join(evaluations_path, filename)
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    data = json.load(f)

                # Get the version that was notified to the user
                version_notified = data.get('notification', {}).get('version_notified', 'original')

                # Get the score from the notified version
                score = get_score_from_version(data, version_notified)

                # Extract metadata
                eval_id = data.get('id', filename.replace('evaluation_', '').replace('.json', ''))
                author_name = data.get('author', 'Unknown')

                metadata = {
                    'id': eval_id,
                    'name': data.get('title', 'Untitled'),
                    'author': author_name,
                    'author_model': get_author_model(station_path, author_name),
                    'submitted_tick': data.get('submitted_tick', 0),
                    'score': score,
                    'version_notified': version_notified,
                    'breakthrough': False  # Will be updated after all evaluations are loaded
                }

                evaluations.append(metadata)

            except Exception as e:
                print(f"  Warning: Could not process {filename}: {e}")
                continue

    # Sort by submitted tick (ascending) for breakthrough calculation
    evaluations.sort(key=lambda x: (x['submitted_tick'], int(x['id']) if x['id'].isdigit() else 0))

    # Calculate breakthroughs
    max_score = -1
    for eval_item in evaluations:
        score = eval_item['score']
        # Only numeric scores can be breakthroughs
        if isinstance(score, (int, float)) and score != 'n.a.':
            if score > max_score:
                max_score = score
                eval_item['breakthrough'] = True

    # Write index file
    index_path = os.path.join(evaluations_path, '_index.json')
    with open(index_path, 'w') as f:
        json.dump({'evaluations': evaluations}, f, indent=2)

    return evaluations


def main():
    """Main function when run as a script."""
    import sys

    if len(sys.argv) < 2:
        print("Usage: python init_research.py <station_id>")
        print("  or   python init_research.py --all")
        sys.exit(1)

    # Get viewer directory
    script_dir = os.path.dirname(os.path.abspath(__file__))
    viewer_dir = os.path.dirname(script_dir)
    data_dir = os.path.join(viewer_dir, 'data')

    if sys.argv[1] == '--all':
        # Initialize all stations
        print("Initializing research indices for all stations...")
        count = 0
        for folder in os.listdir(data_dir):
            folder_path = os.path.join(data_dir, folder)
            if os.path.isdir(folder_path) and len(folder) >= 36 and folder.count('-') == 4:
                evaluations = init_research_index(folder_path)
                if evaluations:
                    breakthroughs = sum(1 for e in evaluations if e['breakthrough'])
                    print(f"  {folder[:8]}: {len(evaluations)} evaluations ({breakthroughs} breakthroughs)")
                    count += 1
        print(f"Initialized research for {count} stations")
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

        evaluations = init_research_index(station_path)
        if evaluations:
            breakthroughs = sum(1 for e in evaluations if e['breakthrough'])
            print(f"Station {station_id[:8]}: {len(evaluations)} evaluations ({breakthroughs} breakthroughs)")
        else:
            print(f"Station {station_id[:8]}: No evaluations found")


if __name__ == '__main__':
    main()