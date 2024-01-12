/**
 * Return true if provided data is: {[key: string]: { "date": number, "value": number|null }[]}
 * @param data - data to check
 * @returns A boolean indicating whether the data is a valid leaderboard JSON.
 */
export function isValidLeaderboardJson(data: any): boolean {
  if (typeof data !== "object") return false;

  try {
    for (const key in data) {
      if (typeof data[key] !== "object") return false;

      for (const item of data[key]) {
        if (typeof item !== "object") return false;
        if (typeof item.date !== "number") return false;
        if (typeof item.value !== "number" && item.value !== null) return false;
      }
    }
  } catch (error) {
    console.log(error);
    return false;
  }

  return true;
}
