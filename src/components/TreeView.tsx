import { useCallback, useLayoutEffect, useMemo, useRef } from "react";
import * as d3 from "d3";
import { Layout, OrgChart } from "d3-org-chart";
import { PlanParser } from "../lib/planViz";

const LayoutTypes: Layout[] = ["top", "left", "bottom", "right"] as const;

const svgProgress = (value, max) => {
  const color =
    value < 0.2 * max ? "green" : value < 0.5 * max ? "yellow" : "red";
  return `<svg style="
    width: 100%;
    height: 1em;
" height="100" width="100">
<rect x="0" y="0" height="100%" width="100%" fill="gray" stroke="gray"></rect><rect x="0" y="0" height="100%" width="${(100 * value) / max}%" fill="${color}" stroke="${color}"></rect>
<text x="50%" style="
    color: white;
    font-size: 1em;
" y="10">${value.toLocaleString()}</text></svg>`;
};

function clamp(v, a, b, x, y) {
  return x + ((v - a) / (b - a)) * (y - x);
}

export const TreeView = (props) => {
  const containerRef = useRef(null);
  const chartRef = useRef<OrgChart<Record<string, any>> | null>(null);
  const chartLayoutIndex = useRef(0);
  const chartIsCompact = useRef(false);
  const flatData = useMemo(() => {
    return Array.from(PlanParser.traversePlan(props.data)).map((node) => ({
      ...node,
    }));
  }, [props.data]);
  const activeNode = useRef(flatData[0]);
  useLayoutEffect(() => {
    if (!flatData || !containerRef.current) return;
    if (!chartRef.current) chartRef.current = new OrgChart();
    const maxCost = d3.max(
      flatData,
      (d) => d.statsGroups[0].cost[1] - d.statsGroups[0].cost[0],
    );
    const maxRows = d3.max(flatData, (d) => d.statsGroups[0].rows);

    chartRef.current
      .container(containerRef.current)
      .data(flatData)
      .nodeWidth(() => 320)

      .svgHeight(window.innerHeight - 10)
      .nodeHeight(() => 140)
      .compactMarginBetween((d) => 65)
      .compactMarginPair((d) => 100)
      .neighbourMargin((a, b) => 50)
      .siblingsMargin((d) => 100)
      .layout(LayoutTypes[chartLayoutIndex.current])
      .linkUpdate(function (d) {
        d3.select(this)
          .attr(
            "stroke-width",
            Math.round(clamp(d.data.statsGroups[0].rows, 0, maxRows, 1, 30)),
            // Math.max(2, Math.min(5, (5 * d.data.statsGroups[0].rows) / maxRows)),
            // d.data.statsGroups[0].cost[1] / 100000,
          )
          .attr("stroke", "#E4E2E9");
      })
      .nodeContent((node) => {
        const { data: d } = node;
        return `<div style="height: ${node.height}px; background-color: black;border: 1px solid white; padding: 4px;"><span class="table-title">${d.name}</span>${d.table ? ` | <span>${d.table}</span>` : ""}<br/>${svgProgress(d.statsGroups[0].cost[1] - d.statsGroups[0].cost[0], maxCost)}<br/>${d.statsGroups
          .map((sg) =>
            Object.entries(sg)
              .map(
                ([key, value], i) =>
                  `<span>${key}</span>: <span>${Array.isArray(value) ? value[1] - value[0] : value}</span>${i % 2 ? "<br/>" : ""}`,
              )
              .join(" "),
          )
          .join(
            "<hr/>",
          )}<hr/>${d.source.descriptions.map((ds) => `<span>${ds.trim()}</span>`).join("<br/>")}</div>`;
      })
      .onNodeClick((d) => {
        activeNode.current = d;
        console.log(d, "Id of clicked node");
      })
      .expandAll()
      .render();
  }, [flatData, containerRef.current]);

  const onChartAction = useCallback((e) => {
    if (!chartRef.current)
      return console.error(new Error("chart not available"));
    switch (e.target.value) {
      case "expand":
        chartRef.current.setExpanded(activeNode.current.id).render();
        break;
      case "collapse":
        chartRef.current.setExpanded(activeNode.current.id, false).render();
        break;
      case "fit":
        chartRef.current.fit().render();
        break;
      case "swap":
        chartRef.current
          .layout(
            LayoutTypes[
              (chartLayoutIndex.current =
                (chartLayoutIndex.current + 1) % LayoutTypes.length)
            ],
          )
          .render()
          .fit();
        break;
      case "compact":
        chartRef.current
          .compact((chartIsCompact.current = !chartIsCompact.current))
          .render()
          .fit();
        break;
      case "center active":
        chartRef.current.setActiveNodeCentered();
        break;
      case "center selected":
        chartRef.current.setCentered(activeNode.current.id);
        break;
      case "center":
        chartRef.current.setCentered(activeNode.current.id).render();
        break;
      case "mark":
        chartRef.current.setHighlighted(activeNode.current.id).render();
        break;
      case "mark root":
        chartRef.current
          .setUpToTheRootHighlighted(activeNode.current.id)
          .render();
        break;
      case "clear mark":
        chartRef.current.clearHighlighting().render();
        break;
      case "expand all":
        chartRef.current.expandAll().render();
        break;
      case "collapse all":
        chartRef.current.collapseAll().render();
        break;
      case "fullscreen":
        chartRef.current.fullscreen(containerRef.current.parentElement);
        break;
      case "zoom -":
        chartRef.current.zoomOut();
        break;
      case "zoom +":
        chartRef.current.zoomIn();
        break;
      default:
        console.error("Invalid cchart action: " + e.target.value);
    }
  }, []);
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div>
        <div>
          <button value="expand" onClick={onChartAction}>
            expand
          </button>
          <button value="collapse" onClick={onChartAction}>
            collapse
          </button>
          <button value="fit" onClick={onChartAction}>
            fit
          </button>
          <button value="swap" onClick={onChartAction}>
            swap
          </button>
          <button value="compact" onClick={onChartAction}>
            compact
          </button>
          <button value="center active" onClick={onChartAction}>
            center active
          </button>
          <button value="center" onClick={onChartAction}>
            center
          </button>
          <button value="mark" onClick={onChartAction}>
            mark
          </button>
          <button value="mark root" onClick={onChartAction}>
            mark root
          </button>
          <button value="clear mark" onClick={onChartAction}>
            clear mark
          </button>
          <button value="expand all" onClick={onChartAction}>
            expand all
          </button>
          <button value="collapse all" onClick={onChartAction}>
            collapse all
          </button>
          <button value="fullscreen" onClick={onChartAction}>
            fullscreen
          </button>
          <button value="zoom -" onClick={onChartAction}>
            zoom -
          </button>
          <button value="zoom +" onClick={onChartAction}>
            zoom +
          </button>
        </div>
      </div>
      <div ref={containerRef} />
    </div>
  );
};
