#!/usr/bin/env python3
"""
Initialize mail capsule indices for Station Viewer.
This module provides functions to generate mail indices with metadata.
Based on init_memory.py but adapted for mail capsules with recipients.

Usage:
    As a module: from init_mail import init_mail_index
    As a script: python scripts/init_mail.py <station_id>
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


def extract_recipients(messages, original_author):
    """
    Extract all unique recipients from a mail thread.
    Recipients are all authors who participated except the original author.

    Args:
        messages: List of message objects from mail capsule
        original_author: The original author who created the mail

    Returns:
        Comma-separated string of recipient names
    """
    recipients = set()
    for msg in messages:
        if not msg.get('is_deleted', False):
            author = msg.get('author_name')
            if author and author != original_author:
                recipients.add(author)

    return ', '.join(sorted(recipients)) if recipients else 'None'


def init_mail_index(station_path):
    """
    Generate _index.json with metadata for mail directory.

    Args:
        station_path: Full path to the station directory

    Returns:
        List of mail metadata dicts, or empty list if no mail
    """
    mail_path = os.path.join(station_path, 'capsules', 'mail')
    if not os.path.exists(mail_path):
        return []

    mails = []

    # Process each mail yaml file
    for filename in os.listdir(mail_path):
        if filename.endswith('.yaml'):
            filepath = os.path.join(mail_path, filename)
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    data = yaml.safe_load(f)

                # Skip deleted capsules
                if data.get('is_deleted', False):
                    continue

                # Extract metadata
                mail_id = filename[:-5]  # Remove .yaml extension

                # Extract all required fields
                author_name = data.get('author_name', 'Unknown')
                messages = data.get('messages', [])

                # Extract recipients (all other participants in the thread)
                recipients = extract_recipients(messages, author_name)

                metadata = {
                    'id': data.get('capsule_id', mail_id),
                    'name': data.get('title', 'Untitled'),
                    'author': author_name,
                    'author_model': get_author_model(station_path, author_name),
                    'recipients': recipients,
                    'creation_tick': data.get('created_at_tick', 0),
                    'last_update_tick': data.get('last_updated_at_tick', 0),
                    'num_messages': len(messages),
                    'word_count': data.get('word_count_total', 0)
                }

                mails.append(metadata)

            except Exception as e:
                print(f"  Warning: Could not process {filename}: {e}")
                continue

    # Sort by creation tick (ascending)
    mails.sort(key=lambda x: x['creation_tick'])

    # Write index file
    index_path = os.path.join(mail_path, '_index.json')
    with open(index_path, 'w') as f:
        json.dump({'mails': mails}, f, indent=2)

    return mails


def main():
    """Main function when run as a script."""
    import sys

    if len(sys.argv) < 2:
        print("Usage: python init_mail.py <station_id>")
        print("  or   python init_mail.py --all")
        sys.exit(1)

    # Get viewer directory
    script_dir = os.path.dirname(os.path.abspath(__file__))
    viewer_dir = os.path.dirname(script_dir)
    data_dir = os.path.join(viewer_dir, 'data')

    if sys.argv[1] == '--all':
        # Initialize all stations
        print("Initializing mail indices for all stations...")
        count = 0
        for folder in os.listdir(data_dir):
            folder_path = os.path.join(data_dir, folder)
            if os.path.isdir(folder_path) and len(folder) >= 36 and folder.count('-') == 4:
                mails = init_mail_index(folder_path)
                if mails:
                    print(f"  {folder[:8]}: {len(mails)} mail threads indexed")
                    count += 1
        print(f"Initialized mail for {count} stations")
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

        mails = init_mail_index(station_path)
        if mails:
            print(f"Station {station_id[:8]}: {len(mails)} mail threads indexed")
        else:
            print(f"Station {station_id[:8]}: No mail threads found")


if __name__ == '__main__':
    main()