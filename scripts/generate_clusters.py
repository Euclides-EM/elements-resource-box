#!/usr/bin/env python3

import csv
import random
import string
import unicodedata
from collections import defaultdict

def load_csv(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        return list(reader)

def normalize_title(title):
    if not title:
        return ""

    title = title.lower()

    normalized = unicodedata.normalize('NFD', title)
    ascii_title = ''.join(c for c in normalized if unicodedata.category(c) != 'Mn')

    ligature_map = {
        'æ': 'ae',
        'œ': 'oe',
        'ß': 'ss',
        'ø': 'o',
        'đ': 'd',
        'ħ': 'h',
        'ł': 'l',
        'ñ': 'n',
        'þ': 'th',
        'ð': 'd'
    }

    for ligature, replacement in ligature_map.items():
        ascii_title = ascii_title.replace(ligature, replacement)

    return ascii_title

def get_title_for_comparison(row, paratexts_dict):
    if row['short_title'] and row['short_title'].strip():
        return normalize_title(row['short_title'].strip()), False
    elif row['key'] in paratexts_dict:
        return normalize_title(paratexts_dict[row['key']]['title']), True
    return "", False

def calculate_similarity(title1, title2, using_full_title=False):
    if not title1 or not title2:
        return False

    len1, len2 = len(title1), len(title2)
    min_len = min(len1, len2)
    max_len = max(len1, len2)

    distance = abs(len1 - len2)

    for i in range(min_len):
        if title1[i] != title2[i]:
            distance += 1

    threshold = 20 if using_full_title else 10
    return distance <= threshold

def find_root(parent, node):
    if parent[node] != node:
        parent[node] = find_root(parent, parent[node])
    return parent[node]

def union(parent, rank, x, y):
    root_x = find_root(parent, x)
    root_y = find_root(parent, y)

    if root_x != root_y:
        if rank[root_x] < rank[root_y]:
            parent[root_x] = root_y
        elif rank[root_x] > rank[root_y]:
            parent[root_y] = root_x
        else:
            parent[root_y] = root_x
            rank[root_x] += 1

def generate_random_key():
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))

def main():
    items = load_csv('../public/docs/items_print.csv')
    paratexts = load_csv('../public/docs/paratext_transcriptions.csv')

    paratexts_dict = {row['key']: row for row in paratexts}

    parent = {}
    rank = {}

    for item in items:
        key = item['key']
        parent[key] = key
        rank[key] = 0

    for i, item1 in enumerate(items):
        for j, item2 in enumerate(items):
            if i >= j:
                continue

            if (item1['author_or_editor'] == item2['author_or_editor'] and
                item1['language'] == item2['language']):

                title1, using_full_title1 = get_title_for_comparison(item1, paratexts_dict)
                title2, using_full_title2 = get_title_for_comparison(item2, paratexts_dict)

                using_full_title = using_full_title1 or using_full_title2
                if calculate_similarity(title1, title2, using_full_title):
                    union(parent, rank, item1['key'], item2['key'])

    clusters = defaultdict(list)
    for item in items:
        root = find_root(parent, item['key'])
        clusters[root].append(item['key'])

    clusters = {k: v for k, v in clusters.items() if len(v) > 1}

    cluster_key_mapping = {}
    for cluster_root in clusters:
        cluster_key_mapping[cluster_root] = generate_random_key()

    with open('../public/docs/clusters.csv', 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(['key', 'type'])

        for cluster_root in clusters:
            cluster_key = cluster_key_mapping[cluster_root]
            writer.writerow([cluster_key, 'reprint'])

    with open('../public/docs/cluster_items.csv', 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(['cluster_key', 'item_key'])

        for cluster_root, item_keys in clusters.items():
            cluster_key = cluster_key_mapping[cluster_root]
            for item_key in item_keys:
                writer.writerow([cluster_key, item_key])

if __name__ == '__main__':
    main()