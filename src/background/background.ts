import * as Constants from "../utils/constants";

((chrome) => {
  const { alarms: alarmsApi, storage: storageApi, action: actionApi } = chrome;

  const { sync: Storage } = storageApi;

  chrome.runtime.onStartup.addListener(() => {
    addLeaderboardAlarm();
    updateBadgeText();
  });

  chrome.runtime.onInstalled.addListener(() => {
    addLeaderboardAlarm();
    updateBadgeText();
  });

  alarmsApi.onAlarm.addListener((alarm) => {
    if (alarm.name === Constants.LEADERBOARD_ALARM_NAME) {
      fetchLeaderboard();
    }
  });

  async function fetchLeaderboard() {
    const requestOptions = {
      method: "GET",
    };

    const response = await fetch(Constants.WAKATIME_LEADERS_URL, requestOptions)
      .then((r) => r.json())
      .catch((e) => {
        console.error(e);

        return undefined;
      });

    if (response.current_user?.rank) {
      const { leaderboardData = {} } = await Storage.get(["leaderboardData"]);
      const rank = response.current_user.rank;
      const username = response.current_user.user.username;

      const stats = leaderboardData[username] || [];

      Storage.set({
        currentUserData: {
          ...response.current_user,
          lastRank:
            stats.length > 0 ? stats[stats.length - 1].value : undefined,
        },
      });

      if (rank) {
        if (stats.length > 0) {
          const lastStat = stats[stats.length - 1];

          if (lastStat.value === rank) {
            return;
          }
        }

        stats.push({
          date: Date.now(),
          value: rank,
        });

        Storage.set({
          leaderboardData: {
            ...leaderboardData,
            [username]: stats,
          },
        });
      }

      updateBadgeText();
    }
  }

  async function updateBadgeText() {
    const { currentUserData } = await Storage.get(["currentUserData"]);

    if (currentUserData?.rank !== undefined) {
      if (currentUserData.lastRank < currentUserData.rank) {
        actionApi.setBadgeBackgroundColor({ color: "#F44336" });
      } else {
        actionApi.setBadgeBackgroundColor({ color: "#0AD69F" });
      }

      actionApi.setBadgeText({
        text: currentUserData.rank.toString(),
      });
    } else {
      actionApi.setBadgeText({
        text: "",
      });
    }
  }

  /**
   * Add an alarm if it doesn't exist
   */
  async function addLeaderboardAlarm() {
    const alarm = await alarmsApi.get(Constants.LEADERBOARD_ALARM_NAME);

    if (!alarm) {
      alarmsApi.create(Constants.LEADERBOARD_ALARM_NAME, {
        periodInMinutes: Constants.LEADERBOARD_ALARM_PERIOD,
      });
    }
  }
})(chrome);
