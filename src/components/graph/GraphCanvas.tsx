import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";

export interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  label: string;
  type: "ACCUSED" | "VICTIM" | "CASE" | "UNIT";
}
export interface GraphEdge {
  source: string;
  target: string;
  relation: "CO_ACCUSED_WITH" | "VICTIM_OF" | "FILED_IN" | "SIMILAR_TO" | "CONTACT_LINKED";
  score?: number;
  sharedField?: string;
}

const NODE_COLOR: Record<GraphNode["type"], string> = {
  ACCUSED: "#EF4444",
  VICTIM: "#2563EB",
  CASE: "#06B6D4",
  UNIT: "#C9A227",
};

export function GraphCanvas({
  nodes,
  edges,
  reasoningPathEdges = [],
  onNodeSelect,
  onEdgeSelect,
  height = 460,
}: {
  nodes: GraphNode[];
  edges: GraphEdge[];
  reasoningPathEdges?: number[]; // indices into `edges`, in traversal order
  onNodeSelect?: (n: GraphNode) => void;
  onEdgeSelect?: (e: GraphEdge) => void;
  height?: number;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dims, setDims] = useState({ w: 800, h: height });

  useEffect(() => {
    const handle = () => {
      if (svgRef.current?.parentElement) {
        setDims({ w: svgRef.current.parentElement.clientWidth, h: height });
      }
    };
    handle();
    window.addEventListener("resize", handle);
    return () => window.removeEventListener("resize", handle);
  }, [height]);

  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const nodeCopy = nodes.map((n) => ({ ...n }));
    const linkCopy = edges.map((e) => ({ ...e })) as (GraphEdge & d3.SimulationLinkDatum<GraphNode>)[];

    const sim = d3
      .forceSimulation(nodeCopy as any)
      .force("link", d3.forceLink(linkCopy as any).id((d: any) => d.id).distance(110).strength(0.6))
      .force("charge", d3.forceManyBody().strength(-260))
      .force("center", d3.forceCenter(dims.w / 2, dims.h / 2))
      .force("collide", d3.forceCollide(34));

    const g = svg.append("g");

    svg.call(
      d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.4, 2.5])
        .on("zoom", (event) => g.attr("transform", event.transform)) as any
    );

    const link = g
      .selectAll("line")
      .data(linkCopy)
      .join("line")
      .attr("stroke", (d) => (d.relation === "CONTACT_LINKED" ? "#98A2B8" : "#2563EB"))
      .attr("stroke-width", (d) => (d.relation === "SIMILAR_TO" ? 1 + (d.score ?? 0.5) * 2.5 : 1.6))
      .attr("stroke-dasharray", (d) => (d.relation === "CONTACT_LINKED" ? "4 3" : "0"))
      .attr("stroke-opacity", (_, i) => (reasoningPathEdges.length && !reasoningPathEdges.includes(i) ? 0.15 : 0.55))
      .style("cursor", "pointer")
      .on("click", (_, d) => onEdgeSelect?.(d as unknown as GraphEdge));

    // Reasoning path overlay — animated cyan highlight in traversal order (FR-38)
    if (reasoningPathEdges.length) {
      reasoningPathEdges.forEach((idx, order) => {
        g.append("line")
          .datum(linkCopy[idx])
          .attr("stroke", "#06B6D4")
          .attr("stroke-width", 3)
          .attr("stroke-opacity", 0)
          .transition()
          .delay(order * 220)
          .duration(260)
          .attr("stroke-opacity", 0.9);
      });
    }

    const node = g
      .selectAll("g.node")
      .data(nodeCopy)
      .join("g")
      .attr("class", "node")
      .style("cursor", "pointer")
      .call(
        d3.drag<any, any>()
          .on("start", (event, d) => { if (!event.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
          .on("drag", (event, d) => { d.fx = event.x; d.fy = event.y; })
          .on("end", (event, d) => { if (!event.active) sim.alphaTarget(0); d.fx = null; d.fy = null; }) as any
      )
      .on("click", (_, d) => onNodeSelect?.(d as unknown as GraphNode));

    node
      .append("circle")
      .attr("r", (d: any) => (d.type === "CASE" ? 16 : 12))
      .attr("fill", (d: any) => NODE_COLOR[d.type as GraphNode["type"]])
      .attr("fill-opacity", 0.15)
      .attr("stroke", (d: any) => NODE_COLOR[d.type as GraphNode["type"]])
      .attr("stroke-width", 2);

    node
      .append("text")
      .text((d: any) => d.label)
      .attr("dy", 26)
      .attr("text-anchor", "middle")
      .attr("font-size", 11)
      .attr("fill", "#111827")
      .attr("font-family", "Inter, sans-serif");

    sim.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);
      node.attr("transform", (d: any) => `translate(${d.x},${d.y})`);
    });

    return () => { sim.stop(); };
  }, [nodes, edges, dims, reasoningPathEdges]);

  return (
    <svg
      ref={svgRef}
      width="100%"
      height={height}
      role="img"
      aria-label="Network graph of linked persons and cases"
      className="rounded-xl2 border border-line bg-white"
    />
  );
}
