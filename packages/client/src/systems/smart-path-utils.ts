/**
 * Small path helpers adapted from qiao/PathFinding.js Util.js (MIT).
 * Only the path-length helper is needed by the idle controller; Kaetram keeps
 * its native grid/A* implementation for actual movement.
 */
export function pathLength(path: number[][]): number {
    let sum = 0;
    for (let i = 1; i < path.length; i++) {
        const a = path[i - 1];
        const b = path[i];
        const dx = a[0] - b[0];
        const dy = a[1] - b[1];
        sum += Math.sqrt(dx * dx + dy * dy);
    }
    return sum;
}
