const lab = new URLSearchParams(location.search).get("lab");
if (lab === "ay38606" || lab === "ay38500") {
  void import("./chip/workbench").then(({ openWorkbench }) =>
    openWorkbench(lab),
  );
} else {
  void import("./main");
}
