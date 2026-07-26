import React, { useState, useEffect } from "react";
import { Filter, Download, Pin, Table2 } from "lucide-react";
import { Card, Badge, Button, ConfidenceMeter } from "@/components/ui/Primitives";
import { GraphCanvas, GraphEdge, GraphNode } from "@/components/graph/GraphCanvas";
import { graphNodes as initialNodes, graphEdges as initialEdges } from "@/data/mock";
import { graphApi } from "@/services/api";

export default function NetworkGraphExplorer() {
  const [nodes, setNodes] = useState<GraphNode[]>(initialNodes);
  const [edgesList, setEdgesList] = useState<GraphEdge[]>(initialEdges);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<GraphEdge | null>(null);
  const [showContactLinked, setShowContactLinked] = useState(true);
  const [tableView, setTableView] = useState(false);

  useEffect(() => {
    graphApi.getNetwork().then((data) => {
      if (data.nodes && data.nodes.length) setNodes(data.nodes);
      if (data.edges && data.edges.length) setEdgesList(data.edges);
    });
  }, []);

  const edges = edgesList.filter((e) => showContactLinked || e.relation !== "CONTACT_LINKED");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Network Graph Explorer</h1>
          <p className="text-sm text-muted">Jurisdiction-scoped co-accused &amp; linkage analysis</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setTableView((v) => !v)}>
            <Table2 size={14} /> {tableView ? "Graph view" : "Tabular fallback"}
          </Button>
          <Button variant="secondary"><Download size={14} /> Export subgraph</Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Filter size={14} className="text-muted" />
        <FilterChip label="CO_ACCUSED_WITH" active />
        <FilterChip label="SIMILAR_TO" active />
        <button
          onClick={() => setShowContactLinked((v) => !v)}
          className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
            showContactLinked ? "border-primary/40 bg-primary/10 text-primary" : "border-line text-muted"
          }`}
        >
          CONTACT_LINKED (dashed)
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {edges.length === 0 ? (
            <Card className="flex h-[460px] items-center justify-center text-sm text-muted">
              No linked entities found for this scope.
            </Card>
          ) : tableView ? (
            <Card className="p-0">
              <table className="w-full text-sm">
                <thead className="border-b border-line bg-black/[0.015] text-left text-xs text-muted">
                  <tr><th className="px-4 py-2">Source</th><th className="px-4 py-2">Relation</th><th className="px-4 py-2">Target</th></tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {edges.map((e, i) => (
                    <tr key={i}>
                      <td className="px-4 py-2 font-mono text-xs">{String(e.source)}</td>
                      <td className="px-4 py-2"><Badge tone={e.relation === "CONTACT_LINKED" ? "warning" : "accent"}>{e.relation}</Badge></td>
                      <td className="px-4 py-2 font-mono text-xs">{String(e.target)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          ) : (
            <GraphCanvas
              nodes={nodes}
              edges={edges}
              onNodeSelect={setSelectedNode}
              onEdgeSelect={setSelectedEdge}
              height={460}
            />
          )}
        </div>

        <div className="space-y-3">
          <Card>
            <p className="mb-2 text-sm font-medium">Node / edge detail</p>
            {selectedEdge ? (
              <div className="space-y-2 text-sm">
                <Badge tone="warning">{selectedEdge.relation}</Badge>
                {selectedEdge.relation === "CONTACT_LINKED" ? (
                  <p className="text-xs text-muted">
                    Shared field: <span className="font-mono text-ink">{selectedEdge.sharedField}</span>. This shows the
                    shared field itself — never asserts a relationship — to avoid false-positive accusations.
                  </p>
                ) : selectedEdge.relation === "SIMILAR_TO" ? (
                  <ConfidenceMeter value={selectedEdge.score ?? 0.7} />
                ) : (
                  <p className="text-xs text-muted">Case-derived relationship.</p>
                )}
              </div>
            ) : selectedNode ? (
              <div className="space-y-1 text-sm">
                <p className="font-medium">{selectedNode.label}</p>
                <Badge>{selectedNode.type}</Badge>
                <button className="mt-2 flex items-center gap-1 text-xs text-primary"><Pin size={12} /> Pin node</button>
              </div>
            ) : (
              <p className="text-xs text-muted">Select a node or edge to inspect it.</p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function FilterChip({ label, active }: { label: string; active?: boolean }) {
  return (
    <button className={`rounded-full border px-3 py-1.5 text-xs font-medium ${active ? "border-primary/40 bg-primary/10 text-primary" : "border-line text-muted"}`}>
      {label}
    </button>
  );
}
