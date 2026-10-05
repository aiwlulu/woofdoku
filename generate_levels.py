"""Generate connected-region puzzles and prove every puzzle has one solution."""
import json, random, itertools
from collections import Counter
from functools import lru_cache
from pathlib import Path

def solve(grid, limit=2):
    n = len(grid)
    solutions = []
    def visit(row, cols, regions, path):
        if len(solutions) >= limit: return
        if row == n:
            solutions.append(path)
            return
        for col in range(n):
            region = grid[row][col]
            if col in cols or region in regions or (path and abs(path[-1]-col) <= 1): continue
            visit(row+1, cols | {col}, regions | {region}, path + [col])
    visit(0, set(), set(), [])
    return solutions

@lru_cache(None)
def valid_permutations(n):
    return [p for p in itertools.permutations(range(n)) if all(abs(p[r]-p[r-1]) > 1 for r in range(1,n))]

def singleton_count(regions):
    return sum(count == 1 for count in Counter(regions).values())

def generate(n, seed):
    rng = random.Random(seed)
    permutations = valid_permutations(n)
    for attempt in range(200000):
        solution = rng.choice(permutations)
        growth = [rng.uniform(.15,1)**2 for _ in range(n)]
        grid = [[-1]*n for _ in range(n)]
        for row,col in enumerate(solution): grid[row][col] = row
        order = list(range(n))
        rng.shuffle(order)
        # Give regions a second cell first, rather than relying on accidental
        # singleton regions to make the puzzle uniquely solvable.
        for region in order[:-1]:
            r,c = region,solution[region]
            candidates=[(rr,cc) for rr,cc in [(r-1,c),(r+1,c),(r,c-1),(r,c+1)] if 0<=rr<n and 0<=cc<n and grid[rr][cc]<0]
            if candidates:
                rr,cc=rng.choice(candidates)
                grid[rr][cc]=region
        while any(-1 in row for row in grid):
            options = []
            for r in range(n):
                for c in range(n):
                    if grid[r][c] != -1: continue
                    neighbors = {grid[rr][cc] for rr,cc in [(r-1,c),(r+1,c),(r,c-1),(r,c+1)] if 0<=rr<n and 0<=cc<n and grid[rr][cc]>=0}
                    for region in neighbors: options.append((r,c,region))
            r,c,region = rng.choices(options, weights=[growth[v[2]] for v in options], k=1)[0]
            grid[r][c] = region
        if singleton_count(sum(grid,[]))<=1 and len(solve(grid)) == 1:
            return {'size':n,'regions':sum(grid,[]),'solution':[r*n+c for r,c in enumerate(solution)]}
    raise RuntimeError(f'Unable to generate {n}, {seed}')

if __name__ == '__main__':
    path=Path('dist/levels.json')
    existing=json.loads(path.read_text()) if path.exists() else []
    levels=[]
    for i in range(60):
        n = 5 if i<15 else 6 if i<30 else 7 if i<45 else 8
        previous=existing[i] if i<len(existing) else None
        if previous and previous['size']==n and singleton_count(previous['regions'])<=1:
            level=previous
            level.setdefault('revision',1)
        else:
            level=generate(n, 4102026+i*173)
            level['revision']=2
        level['id']=i+1
        levels.append(level)
        print(f"Level {i+1}: {n}x{n}, singletons={singleton_count(level['regions'])}",flush=True)
    path.write_text(json.dumps(levels,separators=(',',':')))
    print(f'Generated {len(levels)} uniquely solvable puzzles, at most one singleton per board.')
