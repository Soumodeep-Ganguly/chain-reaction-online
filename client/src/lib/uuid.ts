// UUID management - generates and stores a persistent UUID in localStorage
const UUID_KEY = "chain_reaction_player_uuid";

export function getPlayerUuid(): string {
  let uuid = localStorage.getItem(UUID_KEY);
  if (!uuid) {
    uuid = crypto.randomUUID();
    localStorage.setItem(UUID_KEY, uuid);
  }
  return uuid;
}

export function clearPlayerUuid(): void {
  localStorage.removeItem(UUID_KEY);
}
