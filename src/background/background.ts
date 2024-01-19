import * as Constants from "../utils/constants";

((chrome) => {
  const {
    alarms: alarmsApi,
    storage: storageApi,
    action: actionApi,
    runtime: runtimeApi,
  } = chrome;

  const { sync: Storage } = storageApi;

  chrome.runtime.onStartup.addListener(() => {
    addLeaderboardAlarm();
    updateBadgeText();
  });

  chrome.runtime.onInstalled.addListener(() => {
    addLeaderboardAlarm();
    updateBadgeText();
    fetchLeaderboard();
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

    if (response.current_user) {
      const data = await Storage.get(["leaderboardData"]);
      const leaderboardData: RanksHistory = data.leaderboardData || {};
      const rank = response.current_user.rank;
      const username = response.current_user.user.username;

      const stats = leaderboardData[username] || [];
      let lastRank: number | null = null;

      for (let i = stats.length - 1; i >= 0; i--) {
        if (stats[i].value !== undefined && stats[i].value !== rank) {
          // lastRank can be null or number
          lastRank = stats[i].value;
          break;
        }
      }

      Storage.set({
        currentUserData: {
          ...response.current_user,
          lastRank,
        },
      });

      if (stats.length > 0) {
        const lastStat = stats[stats.length - 1];

        if (lastStat.value === rank) {
          const lastStatDate = new Date(lastStat.date);
          const currentDate = new Date();

          // If the last stat was recorded today, don't add a new one
          if (
            lastStatDate.getDate() === currentDate.getDate() &&
            lastStatDate.getMonth() === currentDate.getMonth() &&
            lastStatDate.getFullYear() === currentDate.getFullYear()
          ) {
            return;
          }
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

      updateBadgeText();
    }
  }

  async function updateBadgeText() {
    const { currentUserData } = await Storage.get(["currentUserData"]);

    if (currentUserData !== undefined) {
      if (currentUserData.rank === null) {
        actionApi.setBadgeBackgroundColor({ color: "#F44336" });
        actionApi.setBadgeText({
          text: "!",
        });
      } else {
        if (currentUserData.lastRank < currentUserData.rank) {
          actionApi.setBadgeBackgroundColor({ color: "#F44336" });
        } else {
          actionApi.setBadgeBackgroundColor({ color: "#0AD69F" });
        }

        actionApi.setBadgeText({
          text: currentUserData.rank.toString(),
        });
      }
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
    let alarm: chrome.alarms.Alarm | undefined = await alarmsApi.get(
      Constants.LEADERBOARD_ALARM_NAME
    );

    if (alarm && alarm.periodInMinutes !== Constants.LEADERBOARD_ALARM_PERIOD) {
      await alarmsApi.clear(Constants.LEADERBOARD_ALARM_NAME);
      alarm = undefined;
    }

    if (!alarm) {
      alarmsApi.create(Constants.LEADERBOARD_ALARM_NAME, {
        periodInMinutes: Constants.LEADERBOARD_ALARM_PERIOD,
      });
    }
  }

  runtimeApi.onMessage.addListener((request, sender, sendResponse) => {
    if (request.m === Constants.REQUEST_FORCE_UPDATE_LEADERBOARD) {
      fetchLeaderboard();
      sendResponse();
    }
  });
})(chrome);
