"""Bounded event windows; all calendar entries must be rechecked against sources."""
import datetime as dt

TOPICS = [
 'Selling a boat: valuation, records, listing preparation and seller questions',
 'Featured and emerging boat brands: current manufacturer news and ownership questions',
 'International yacht shows: verified news and practical buyer/seller relevance',
 'Buying and comparing boats, layouts and documented condition',
 'Marine equipment, refit and ownership developments from primary sources',
 'Pacific Northwest boating and brokerage questions',
]

def show_context(shows, today):
    windows=[]
    for show in shows:
        if show.get('verification') != 'official_source':
            continue
        try:
            start=dt.date.fromisoformat(show['start']); end=dt.date.fromisoformat(show['end'])
        except (ValueError, TypeError, KeyError):
            continue
        if start>end:
            continue
        if start<=today<=end: phase='live'
        elif 0<(start-today).days<=14: phase='preview'
        elif 0<(today-end).days<=3: phase='recap'
        else: continue
        windows.append({**show,'phase':phase,'daysToStart':(start-today).days})
    windows.sort(key=lambda s: ({'live':0,'preview':1,'recap':2}[s['phase']],0 if s.get('priority')=='high' else 1,abs(s['daysToStart']),s['id']))
    return windows

def due_date(today, start, hour, windows):
    days=(today-start).days
    return days>=0 and hour>=9 and (days%2==0 or any(s['phase']=='live' for s in windows))
