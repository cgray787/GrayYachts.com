#!/usr/bin/env python3
"""Require explicit per-table grants beside each public CREATE TABLE."""
from pathlib import Path
import re
import sys


def missing_grants(directory):
    missing = []
    for path in sorted(Path(directory).glob('*.sql')):
        sql = re.sub(r'/\*.*?\*/|--[^\n]*', '', path.read_text(), flags=re.S)
        tables = re.findall(r'\bCREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?public\.([a-z_][a-z0-9_]*)', sql, re.I)
        declarations = re.findall(r'\bCREATE\s+TABLE\b', sql, re.I)
        if len(declarations) != len(tables):
            missing.append(f'{path.name}: unsupported table declaration; use public.unquoted_name or extend the guard')
        for table in tables:
            if not re.search(r'\bGRANT\s+(?:SELECT|INSERT|UPDATE|DELETE|ALL)[\w\s,]*\s+ON\s+(?:TABLE\s+)?public\.' + re.escape(table) + r'\s+TO\s+(?:anon|authenticated|service_role)\b', sql, re.I):
                missing.append(f'{path.name}: public.{table}')
    return missing


if __name__ == '__main__':
    directory = Path(__file__).resolve().parents[1] / 'supabase' / 'migrations'
    missing = missing_grants(directory)
    if missing:
        sys.exit('Missing explicit API grants: ' + ', '.join(missing))
    print('Every public CREATE TABLE has explicit API grants in its creating migration.')
