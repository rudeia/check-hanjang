"""Regenerate offline/print charts from docs/economy-data.js using matplotlib."""
import argparse
import json
from pathlib import Path
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.font_manager import FontProperties

parser = argparse.ArgumentParser()
parser.add_argument("--font", required=True, help="Path to a Korean font available on this machine")
parser.add_argument("--only", nargs="*", help="Generate only these chart IDs")
args = parser.parse_args()
root = Path(__file__).resolve().parents[1]
text = (root / "docs/economy-data.js").read_text()
data = json.loads(text.split("const ECONOMY_DATA = ", 1)[1].rsplit(";", 1)[0])
font = FontProperties(fname=args.font, size=12)
colors = ["#006653", "#516ba4", "#a66313"]
plt.rcParams.update({"svg.fonttype": "path", "svg.hashsalt": "check-hanjang-economy-v1", "axes.unicode_minus": False})
for key, chart in data["charts"].items():
    if args.only and key not in args.only:
        continue
    fig, ax = plt.subplots(figsize=(7, 3.6), layout="constrained")
    x = list(range(len(chart["labels"])))
    width = 0.7 / len(chart["series"])
    values = [v for series in chart["series"] for v in series["values"]]
    maximum = max(values)
    minimum = min(0, min(values))
    for index, series in enumerate(chart["series"]):
        offset = (index - (len(chart["series"]) - 1) / 2) * width
        bars = ax.bar([v + offset for v in x], series["values"], width=width,
                      label=series["name"], color=colors[index], zorder=3)
        labels = [f"{value:,.2f}".rstrip("0").rstrip(".") if value % 1 else f"{value:,.0f}"
                  for value in series["values"]]
        ax.bar_label(bars, labels=labels, padding=4, fontproperties=font)
    ax.set_xticks(x, chart["labels"], fontproperties=font)
    ax.set_ylabel(chart["unit"], fontproperties=font)
    ax.set_ylim(minimum * 1.3, maximum * 1.24)
    if minimum < 0:
        ax.axhline(0, color="#50615d", linewidth=0.8)
    ax.ticklabel_format(axis="y", style="plain")
    ax.yaxis.set_major_formatter(matplotlib.ticker.FuncFormatter(lambda value, _: f"{value:,.1f}".rstrip("0").rstrip(".")))
    for label in ax.get_yticklabels():
        label.set_fontproperties(font)
    ax.grid(axis="y", alpha=0.18, zorder=0)
    ax.spines[["top", "right"]].set_visible(False)
    ax.spines[["left", "bottom"]].set_color("#b9c9c3")
    ax.legend(prop=font, loc="upper center", ncol=2, frameon=False, bbox_to_anchor=(.5, 1.12))
    path = root / "docs/assets/economy" / (key + ".svg")
    path.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(path, metadata={"Date": None, "Description": chart["title"] + " · " + chart["sourceTitle"]})
    path.write_text("\n".join(line.rstrip() for line in path.read_text().splitlines()) + "\n")
    plt.close(fig)
    print(path.name)
