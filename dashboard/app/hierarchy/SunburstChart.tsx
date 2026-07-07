"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useRef } from "react";
import * as d3 from "d3";

export function SunburstChart({ data }: { data: any }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !data) return;

    // Clear previous
    d3.select(containerRef.current).selectAll("*").remove();

    const width = 600;
    const height = 600;
    const radius = width / 6;

    // Default color scale
    const color = d3.scaleOrdinal(d3.quantize(d3.interpolateRainbow, data.children?.length + 1 || 2));

    const hierarchy = d3.hierarchy(data)
      .sum((d: any) => d.value)
      .sort((a: any, b: any) => b.value - a.value);

    // If we only have 1 level (no children or children don't have children), it still works
    const root = d3.partition().size([2 * Math.PI, hierarchy.height + 1])(hierarchy);
    root.each((d: any) => d.current = d);

    const arc = d3.arc<any>()
      .startAngle((d: any) => d.x0)
      .endAngle((d: any) => d.x1)
      .padAngle((d: any) => Math.min((d.x1 - d.x0) / 2, 0.005))
      .padRadius(radius * 1.5)
      .innerRadius((d: any) => d.y0 * radius)
      .outerRadius((d: any) => Math.max(d.y0 * radius, d.y1 * radius - 1));

    const svg = d3.select(containerRef.current)
      .append("svg")
      .attr("viewBox", [-width / 2, -height / 2, width, height])
      .style("font", "10px sans-serif")
      .style("max-width", "100%")
      .style("height", "auto");

    const format = d3.format(",d");

    const path = svg.append("g")
      .selectAll("path")
      .data(root.descendants().slice(1)) // remove center root for drawing
      .join("path")
      .attr("fill", (d: any) => {
        let node = d;
        while (node.depth > 1) node = node.parent;
        return color(node.data.name);
      })
      .attr("fill-opacity", (d: any) => arcVisible(d.current) ? (d.children ? 0.6 : 0.4) : 0)
      .attr("pointer-events", (d: any) => arcVisible(d.current) ? "auto" : "none")
      .attr("d", (d: any) => arc(d.current) || "");

    path.filter((d: any) => d.children)
      .style("cursor", "pointer")
      .on("click", clicked);

    path.append("title")
      .text((d: any) => `${d.ancestors().map((node: any) => node.data.name).reverse().join("/")}\n${format(d.value)} min`);

    const label = svg.append("g")
      .attr("pointer-events", "none")
      .attr("text-anchor", "middle")
      .style("user-select", "none")
      .selectAll("text")
      .data(root.descendants().slice(1))
      .join("text")
      .attr("dy", "0.35em")
      .attr("fill-opacity", (d: any) => +labelVisible(d.current))
      .attr("transform", (d: any) => labelTransform(d.current))
      .text((d: any) => {
        // truncate label if too long
        const text = d.data.name;
        return text.length > 15 ? text.substring(0, 15) + '...' : text;
      });

    const parent = svg.append("circle")
      .datum(root)
      .attr("r", radius)
      .attr("fill", "none")
      .attr("pointer-events", "all")
      .on("click", clicked);

    function clicked(event: any, p: any) {
      parent.datum(p.parent || root);

      root.each((d: any) => d.target = {
        x0: Math.max(0, Math.min(1, (d.x0 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI,
        x1: Math.max(0, Math.min(1, (d.x1 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI,
        y0: Math.max(0, d.y0 - p.depth),
        y1: Math.max(0, d.y1 - p.depth)
      });

      const t = svg.transition().duration(750);

      path.transition(t as any)
        .tween("data", (d: any) => {
          const i = d3.interpolate(d.current, d.target);
          return (time: number) => d.current = i(time);
        })
        .filter(function (this: any, d: any) {
          return Boolean(+this.getAttribute("fill-opacity") || arcVisible(d.target));
        })
        .attr("fill-opacity", (d: any) => arcVisible(d.target) ? (d.children ? 0.6 : 0.4) : 0)
        .attr("pointer-events", (d: any) => arcVisible(d.target) ? "auto" : "none")
        .attrTween("d", (d: any) => () => arc(d.current) || "");

      label.filter(function(this: any, d: any) {
          return Boolean(+this.getAttribute("fill-opacity") || labelVisible(d.target));
        }).transition(t as any)
        .attr("fill-opacity", (d: any) => +labelVisible(d.target))
        .attrTween("transform", (d: any) => () => labelTransform(d.current));
    }

    function arcVisible(d: any) {
      return d.y1 <= 3 && d.y0 >= 1 && d.x1 > d.x0;
    }

    function labelVisible(d: any) {
      return d.y1 <= 3 && d.y0 >= 1 && (d.x1 - d.x0) > 0.03;
    }

    function labelTransform(d: any) {
      const x = (d.x0 + d.x1) / 2 * 180 / Math.PI;
      const y = (d.y0 + d.y1) / 2 * radius;
      return `rotate(${x - 90}) translate(${y},0) rotate(${x < 180 ? 0 : 180})`;
    }

  }, [data]);

  return <div ref={containerRef} className="w-full flex justify-center items-center overflow-hidden" />;
}
