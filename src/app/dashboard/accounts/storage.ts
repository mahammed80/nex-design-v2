export function getAccountStorage(): Storage {
  return window.localStorage
}

export function readAccountValue(key: string): string | null {
  return getAccountStorage().getItem(key)
}

export function writeAccountValue(key: string, value: string): void {
  getAccountStorage().setItem(key, value)
}

export function removeAccountValue(key: string): void {
  getAccountStorage().removeItem(key)
}
