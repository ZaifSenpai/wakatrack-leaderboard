import React, { useEffect } from "react";
import { createRoot } from "react-dom/client";
import "./popup.css";
import * as am5 from "@amcharts/amcharts5";
import * as am5xy from "@amcharts/amcharts5/xy";
import am5themes_Animated from "@amcharts/amcharts5/themes/Animated";
import { Box, Container, Grid, Link, Typography } from "@mui/material";
import * as Constants from "../utils/constants";

const Popup: React.FC<{}> = () => {
  const { storage: storageApi, runtime: runtimeApi, tabs: tabsApi } = chrome;

  const { sync: Storage } = storageApi;

  const [initialized, setInitialized] = React.useState<boolean>(false);
  const [userData, setUserData] = React.useState<undefined | UserData>(
    undefined
  );
  const [leaderboardData, setLeaderboardData] = React.useState<RanksHistory>(
    {}
  );

  useEffect(() => {
    if (!userData) {
      Storage.get(["currentUserData", "leaderboardData"]).then((data) => {
        setUserData(data.currentUserData);
        setLeaderboardData(data.leaderboardData || {});
        setInitialized(true);
      });
    }
  }, []);

  useEffect(() => {
    let chartData =
      leaderboardData && userData
        ? leaderboardData[userData.user.username]
        : undefined;

    if (chartData) {
      // Create root and chart
      const root = am5.Root.new("chartdiv");

      root.setThemes([am5themes_Animated.new(root)]);

      const chart = root.container.children.push(
        am5xy.XYChart.new(root, {
          panY: false,
          wheelY: "zoomX",
          layout: root.verticalLayout,
        })
      );

      // Create Y-axis
      const yAxis = chart.yAxes.push(
        am5xy.ValueAxis.new(root, {
          renderer: am5xy.AxisRendererY.new(root, {
            inversed: true,
          }),
        })
      );

      // Create X-Axis
      const xAxis = chart.xAxes.push(
        am5xy.DateAxis.new(root, {
          groupData: true,
          baseInterval: { timeUnit: "day", count: 1 },
          renderer: am5xy.AxisRendererX.new(root, {
            minGridDistance: 30,
          }),
        })
      );

      const f1 = xAxis.get("dateFormats");
      const f2 = xAxis.get("periodChangeDateFormats");

      if (f1) {
        f1["day"] = "MM/dd";
      }

      if (f2) {
        f2["day"] = "MMMM";
      }

      // Create series
      function createSeries(name: any, field: any) {
        const series = chart.series.push(
          am5xy.LineSeries.new(root, {
            name: name,
            xAxis: xAxis,
            yAxis: yAxis,
            valueYField: field,
            valueXField: "date",
            tooltip: am5.Tooltip.new(root, {}),
            connect: true,
          })
        );

        series.strokes.template.set("strokeWidth", 2);

        series.bullets.push(() => {
          return am5.Bullet.new(root, {
            sprite: am5.Circle.new(root, {
              radius: 5,
              fill: series.get("fill"),
            }),
          });
        });

        const tooltip = series.get("tooltip");
        tooltip?.label.set("text", "{valueX.formatDate()}: [bold]{valueY}");

        chartData = (chartData || []).map((item: any) => {
          if (item.value === null) {
            delete item.value;
          }

          return item;
        });

        series.data.setAll(chartData);

        return series;
      }

      const series = createSeries("Rank", "value");

      // Add cursor
      chart.set(
        "cursor",
        am5xy.XYCursor.new(root, {
          behavior: "zoomXY",
          xAxis: xAxis,
        })
      );

      xAxis.set(
        "tooltip",
        am5.Tooltip.new(root, {
          themeTags: ["axis"],
        })
      );

      yAxis.set(
        "tooltip",
        am5.Tooltip.new(root, {
          themeTags: ["axis"],
        })
      );

      chart.set(
        "scrollbarX",
        am5.Scrollbar.new(root, {
          orientation: "horizontal",
        })
      );

      // Make stuff animate on load
      // https://www.amcharts.com/docs/v5/concepts/animations/
      series.appear(1000);
      chart.appear(1000, 100);

      return () => {
        root.dispose();
      };
    }
  }, [leaderboardData]);

  function openLeaderboard() {
    tabsApi.create({
      url: Constants.WAKATIME_LEADERS + (userData?.page ? userData.page : ""),
    });
  }

  return (
    <Container>
      <Box
        sx={{
          display: "flex",
          pt: 2,
          justifyContent: "space-between",
        }}
      >
        <Typography variant="h6">{runtimeApi.getManifest().name}</Typography>
        <Box
          sx={{
            display: "flex",
            gap: "4px",
            alignItems: "center",
          }}
        >
          {userData ? (
            <Typography
              sx={{
                fontSize: "0.8rem",
                color: "#666",
              }}
            >
              Rank: {userData?.rank || "None"}
            </Typography>
          ) : (
            initialized && (
              <Link href={Constants.WAKATIME_LOGIN} target="_blank">
                Login
              </Link>
            )
          )}
          <Typography sx={{ color: "#999" }}>|</Typography>
          <Link component="button" onClick={openLeaderboard}>
            Open Leaderboard
          </Link>
        </Box>
      </Box>

      <Typography
        sx={{
          color: "#555",
          fontSize: "12px",
          textAlign: "end",
        }}
      >
        Leaderboard rank could take upto a week to update.
      </Typography>

      <Box
        id="chartdiv"
        sx={{
          width: "600px",
          height: userData ? "400px" : "auto",
          marginLeft: "-23px",
          marginRight: "-25px",
        }}
      >
        {initialized && !userData && (
          <Box
            sx={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "left",
              flexDirection: "column",
              padding: "10px 20px",
            }}
          >
            <Typography
              sx={{
                alignSelf: "center",
              }}
            >
              No Data Found
            </Typography>
            <Typography
              sx={{
                color: "#666",
                fontSize: "0.8rem",
              }}
            >
              Possible issues:
            </Typography>
            <Typography
              sx={{
                color: "#666",
                fontSize: "0.8rem",
              }}
            >
              - You are not logged in to WakaTime.
            </Typography>
            <Typography
              sx={{
                color: "#666",
                fontSize: "0.8rem",
              }}
            >
              - You are not on the leaderboard. Please open the leaderboard and
              find your name.
            </Typography>
          </Box>
        )}
      </Box>
    </Container>
  );
};

const container = document.createElement("div");
document.body.appendChild(container);
createRoot(container).render(<Popup />);
