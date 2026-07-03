import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";

import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
  Panel,
} from "@xyflow/react";

import type {
  Edge,
  Node,
  ReactFlowInstance,
} from "@xyflow/react";

import "@xyflow/react/dist/style.css";
import type {
  DependencyGraphNode,
  DependencyGraphEdge,
  DependencyGraphResponse,
} from "../../services/migrationService";
import { GraphNode } from "./GraphNode";
import { GraphLegend } from "./GraphLegend";
import { GraphToolbar } from "./GraphToolbar";
import { CircularDependencyPanel } from "./CircularDependencyPanel";

export interface DependencyGraphProps {
  graphData: DependencyGraphResponse;
  onClose?: () => void;
}

// Register custom node type
const nodeTypes = {
  customClassNode: GraphNode,
};

// Layered Layout Algorithm
function applyLayeredLayout(nodes: DependencyGraphNode[], edges: DependencyGraphEdge[]) {
  const X_SPACING = 280;
  const Y_SPACING = 240;

  // Group nodes by class type
  const controllers: DependencyGraphNode[] = [];
  const services: DependencyGraphNode[] = [];
  const repositories: DependencyGraphNode[] = [];
  const entities: DependencyGraphNode[] = [];
  const configs: DependencyGraphNode[] = [];
  const utils: DependencyGraphNode[] = [];
  const interfaces: DependencyGraphNode[] = [];
  const others: DependencyGraphNode[] = [];

  nodes.forEach((node) => {
    const type = node.type.toLowerCase();
    if (type === "controller") controllers.push(node);
    else if (type === "service") services.push(node);
    else if (type === "repository") repositories.push(node);
    else if (type === "entity") entities.push(node);
    else if (type === "configuration") configs.push(node);
    else if (type === "utility") utils.push(node);
    else if (type === "interface") interfaces.push(node);
    else others.push(node);
  });

  // Layer order: Controllers (0) -> Services (1) -> Repositories (2) -> Entities (3)
  // Configurations, Utilities, Interfaces, and Others go to a side column (Layer 4)
  const layers = [
    controllers,
    services,
    repositories,
    entities,
    [...configs, ...utils, ...interfaces, ...others]
  ];

  return nodes.map((node) => {
    let layerIndex = -1;
    let indexInLayer = -1;

    for (let l = 0; l < layers.length; l++) {
      const idx = layers[l].findIndex((n) => n.id === node.id);
      if (idx !== -1) {
        layerIndex = l;
        indexInLayer = idx;
        break;
      }
    }

    if (layerIndex === -1) {
      layerIndex = 4;
      indexInLayer = 0;
    }

    // Grid formatting for very wide layers
    const maxCols = 6;
    const row = Math.floor(indexInLayer / maxCols);
    const col = indexInLayer % maxCols;

    const layerNodes = layers[layerIndex];
    const nodesInThisRow = Math.min(layerNodes.length - row * maxCols, maxCols);

    let x = (col - (nodesInThisRow - 1) / 2) * X_SPACING;
    let y = layerIndex * Y_SPACING + row * 130;

    // Place configuration and others in a side column on the right
    if (layerIndex === 4) {
      const sideCols = 2;
      const sideRow = Math.floor(indexInLayer / sideCols);
      const sideCol = indexInLayer % sideCols;
      x = 900 + sideCol * X_SPACING;
      y = sideRow * 140;
    }

    return {
      id: node.id,
      type: "customClassNode",
      position: { x, y },
      data: {
        label: node.label,
        type: node.type,
        package: node.package,
      },
    };
  });
}

export default function DependencyGraph({ graphData, onClose }: DependencyGraphProps) {
const [nodes, setNodes] = useState<any[]>([]);
const [edges, setEdges] = useState<any[]>([]);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);

  // Filter & Search states
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedCycleIndex, setSelectedCycleIndex] = useState<number | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // Available node types in the current graph
  const availableTypes = useMemo(() => {
    const types = new Set<string>();
    graphData.nodes.forEach((n) => {
      if (n.type) types.add(n.type.toLowerCase());
    });
    return Array.from(types);
  }, [graphData]);

  // Set initial layout
  useEffect(() => {
    if (graphData) {
      const positionedNodes = applyLayeredLayout(graphData.nodes, graphData.edges);
      
      const formattedEdges = graphData.edges.map((edge) => ({
        id: `e-${edge.source}-${edge.target}`,
        source: edge.source,
        target: edge.target,
        type: "smoothstep",
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: "#94a3b8",
        },
        style: { stroke: "#94a3b8", strokeWidth: 1.5 },
      }));

      setNodes(positionedNodes);
      setEdges(formattedEdges);

      // Reset selection states
      setSelectedCycleIndex(null);
      setSelectedNodeId(null);
    }
  }, [graphData, setNodes, setEdges]);

  // Sync highlighting of nodes and edges
  useEffect(() => {
    const activeCycle = selectedCycleIndex !== null ? graphData.cycles[selectedCycleIndex] : null;
    const activeCycleNodes = activeCycle ? new Set(activeCycle) : null;
    
    // Find immediate neighbors if a node is clicked
    let neighbors = new Set<string>();
    if (selectedNodeId) {
      neighbors.add(selectedNodeId);
      graphData.edges.forEach((edge) => {
        if (edge.source === selectedNodeId) neighbors.add(edge.target);
        if (edge.target === selectedNodeId) neighbors.add(edge.source);
      });
    }

    // Determine nodes in any cycle
    const allCycleNodes = new Set<string>();
    graphData.cycles.forEach((c) => c.forEach((nodeId) => allCycleNodes.add(nodeId)));

    setNodes((prevNodes) =>
      prevNodes.map((node) => {
        const isMatchedSearch = searchTerm === "" || node.data.label.toLowerCase().includes(searchTerm.toLowerCase());
        const isMatchedType = selectedTypes.length === 0 || selectedTypes.includes(node.data.type.toLowerCase());
        const isVisible = isMatchedSearch && isMatchedType;

        // Visual dimming
        let opacity = "1";
        if (!isVisible) {
          opacity = "0.1";
        } else if (activeCycleNodes && !activeCycleNodes.has(node.id)) {
          opacity = "0.2";
        } else if (selectedNodeId && !neighbors.has(node.id)) {
          opacity = "0.25";
        }

        return {
          ...node,
          style: { opacity, transition: "opacity 0.2s ease-in-out" },
          data: {
            ...node.data,
            isHighlighted: selectedNodeId === node.id || (selectedNodeId && neighbors.has(node.id) && node.id !== selectedNodeId),
            isInCycle: allCycleNodes.has(node.id),
            isCycleSelected: activeCycleNodes ? activeCycleNodes.has(node.id) : false,
          },
        };
      })
    );

    setEdges((prevEdges) =>
      prevEdges.map((edge) => {
        const isSourceVisible = (searchTerm === "" || edge.source.toLowerCase().includes(searchTerm.toLowerCase())) &&
          (selectedTypes.length === 0 || selectedTypes.includes(nodes.find((n) => n.id === edge.source)?.data.type.toLowerCase() || ""));
        const isTargetVisible = (searchTerm === "" || edge.target.toLowerCase().includes(searchTerm.toLowerCase())) &&
          (selectedTypes.length === 0 || selectedTypes.includes(nodes.find((n) => n.id === edge.target)?.data.type.toLowerCase() || ""));

        let opacity = "1";
        let color = "#94a3b8";
        let width = 1.5;
        let animated = false;

        // Is this edge part of the selected cycle?
        let isEdgeInSelectedCycle = false;
        if (activeCycle) {
          for (let i = 0; i < activeCycle.length - 1; i++) {
            if (activeCycle[i] === edge.source && activeCycle[i + 1] === edge.target) {
              isEdgeInSelectedCycle = true;
              break;
            }
          }
        }

        if (isEdgeInSelectedCycle) {
          color = "#ef4444"; // highlighted red
          width = 3.0;
          animated = true;
          opacity = "1";
        } else if (activeCycleNodes) {
          opacity = "0.08";
        } else if (selectedNodeId) {
          const isConnectedToSelected = edge.source === selectedNodeId || edge.target === selectedNodeId;
          if (isConnectedToSelected) {
            color = edge.source === selectedNodeId ? "#2563eb" : "#475569"; // blue for outgoing, gray for incoming
            width = 2.5;
            opacity = "1";
          } else {
            opacity = "0.1";
          }
        } else if (!isSourceVisible || !isTargetVisible) {
          opacity = "0.1";
        }

        return {
          ...edge,
          animated,
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color,
          },
          style: { stroke: color, strokeWidth: width, opacity, transition: "all 0.2s ease-in-out" },
        };
      })
    );
  }, [searchTerm, selectedTypes, selectedCycleIndex, selectedNodeId, nodes.length, setNodes, setEdges, graphData]);

  // Focus layout on selected cycle
  useEffect(() => {
    if (selectedCycleIndex !== null && reactFlowInstance && graphData.cycles[selectedCycleIndex]) {
      const activeCycle = graphData.cycles[selectedCycleIndex];
      
      // Filter corresponding flow nodes
      const cycleNodes = nodes.filter((node) => activeCycle.includes(node.id));
      if (cycleNodes.length > 0) {
        reactFlowInstance.fitView({
          nodes: cycleNodes,
          padding: 0.4,
          duration: 800,
        });
      }
    }
  }, [selectedCycleIndex, reactFlowInstance, nodes]);

  // Click handler on nodes
  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNodeId((prev) => (prev === node.id ? null : node.id));
    setSelectedCycleIndex(null); // clear cycle highlight when focusing single node
  }, []);

  // Click handler on background pane
  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
    setSelectedCycleIndex(null);
  }, []);

  // Filter toolbar triggers
  const handleTypeToggle = (type: string) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const handleClearFilters = () => {
    setSearchTerm("");
    setSelectedTypes([]);
    setSelectedNodeId(null);
    setSelectedCycleIndex(null);
  };

  const handleFullScreenToggle = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => {
        setIsFullScreen(true);
      });
    } else {
      document.exitFullscreen();
      setIsFullScreen(false);
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullScreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        display: "flex",
        flexDirection: "column",
        height: isFullScreen ? "100vh" : "600px",
        backgroundColor: "#f8fafc",
        border: isFullScreen ? "none" : "1px solid #e2e8f0",
        borderRadius: isFullScreen ? "0" : "12px",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* Header section (Toolbar & Title) */}
      <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: "10px", zIndex: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#0f172a", margin: 0 }}>
              Dependency Graph Visualization
            </h3>
            <span style={{ fontSize: "11px", color: "#64748b" }}>
              Showing {graphData.nodes.length} classes and {graphData.edges.length} dependency relations
            </span>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              style={{
                background: "#f1f5f9",
                border: "none",
                borderRadius: "6px",
                padding: "6px 12px",
                fontSize: "12px",
                fontWeight: 600,
                color: "#475569",
                cursor: "pointer",
                transition: "background 0.2s",
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = "#e2e8f0"}
              onMouseLeave={(e) => e.currentTarget.style.background = "#f1f5f9"}
            >
              Close Visualizer
            </button>
          )}
        </div>

        <GraphToolbar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          selectedTypes={selectedTypes}
          onTypeToggle={handleTypeToggle}
          onClearFilters={handleClearFilters}
          isFullScreen={isFullScreen}
          onFullScreenToggle={handleFullScreenToggle}
          availableTypes={availableTypes}
        />
      </div>

      {/* Main Flow Rendering canvas */}
      <div style={{ flex: 1, position: "relative" }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          onInit={setReactFlowInstance}
          fitView
          fitViewOptions={{ padding: 0.15 }}
          minZoom={0.05}
          maxZoom={2}
        >
          <Background color="#cbd5e1" gap={16} size={1} />
          <Controls style={{ pointerEvents: "auto" }} />
          <MiniMap 
            nodeColor={(node) => {
              const colors: Record<string, string> = {
                controller: "#2563eb",
                service: "#059669",
                repository: "#7c3aed",
                entity: "#d97706",
                configuration: "#db2777",
                utility: "#0d9488",
                interface: "#4b5563",
              };
              return colors[node.data.type?.toLowerCase()] || "#64748b";
            }}
            style={{ pointerEvents: "auto" }}
            zoomable
            pannable
          />
          <Panel position="top-right" style={{ pointerEvents: "none" }}>
            <GraphLegend />
          </Panel>
        </ReactFlow>
      </div>

      {/* Footer Cycles Panel */}
      <div style={{ padding: "0 16px 16px 16px", zIndex: 10, backgroundColor: "#fff", borderTop: "1px solid #e2e8f0" }}>
        <CircularDependencyPanel
          cycles={graphData.cycles}
          selectedCycleIndex={selectedCycleIndex}
          onSelectCycle={setSelectedCycleIndex}
        />
      </div>
    </div>
  );
}
