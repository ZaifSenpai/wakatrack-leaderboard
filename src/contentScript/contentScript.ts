((context) => {
  const { document, window, chrome } = context;

  const currentRank = document.querySelector(".current-user[class^='rank-']");

  console.log("currentRank", currentRank);

  currentRank?.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
})(window);
