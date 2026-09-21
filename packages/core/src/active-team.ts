/** Persist the active Appwrite team id per project (client-only). */

const keyFor = (project: string) => `authui:active-team:${project}`;

export function getStoredActiveTeamId(project: string): string | null {
  if (typeof localStorage === "undefined" || !project) return null;
  try {
    return localStorage.getItem(keyFor(project));
  } catch {
    return null;
  }
}

export function setStoredActiveTeamId(project: string, teamId: string | null): void {
  if (typeof localStorage === "undefined" || !project) return;
  try {
    if (!teamId) localStorage.removeItem(keyFor(project));
    else localStorage.setItem(keyFor(project), teamId);
  } catch {
    /* private mode / quota */
  }
}
