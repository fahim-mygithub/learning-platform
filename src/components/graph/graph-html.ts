/**
 * Graph HTML Template (Obsidian-inspired)
 *
 * Generates HTML/JS for vis-network graph visualization.
 * Features minimalist floating aesthetic with:
 * - Dynamic node sizing based on connections
 * - Visible node and edge labels
 * - Gentle floating physics
 * - Clean, light theme matching app aesthetic
 */

import type { Concept, ConceptRelationship } from '@/src/types';

/**
 * Node colors by concept tier (matching app theme)
 */
const TIER_COLORS = {
  3: '#6366F1', // Indigo - Core concepts
  2: '#10B981', // Emerald - Key concepts
  1: '#9CA3AF', // Gray - Familiar concepts
};

/**
 * Calculate node size based on connection count
 * More connections = larger node (8px to 24px range)
 */
function calculateNodeSize(conceptId: string, relationships: ConceptRelationship[]): number {
  const connectionCount = relationships.filter(
    (r) => r.from_concept_id === conceptId || r.to_concept_id === conceptId
  ).length;

  // Base size 8, max size 24, scales with sqrt for diminishing returns
  const baseSize = 8;
  const maxSize = 24;
  const scaledSize = baseSize + Math.sqrt(connectionCount) * 4;

  return Math.min(maxSize, scaledSize);
}

/**
 * Convert concepts to vis.js nodes (Obsidian-style circles)
 */
function conceptsToNodes(concepts: Concept[], relationships: ConceptRelationship[]): object[] {
  return concepts.map((concept) => {
    const size = calculateNodeSize(concept.id, relationships);
    const tierColor = TIER_COLORS[concept.tier ?? 1];

    return {
      id: concept.id,
      label: concept.name,
      title: `${concept.name}\n${concept.definition?.substring(0, 100) || ''}...`,
      size,
      color: {
        background: tierColor,
        border: tierColor,
        highlight: {
          background: tierColor,
          border: '#1F2937',
        },
        hover: {
          background: tierColor,
          border: '#1F2937',
        },
      },
      font: {
        color: '#374151',
        size: 11,
        face: 'system-ui, -apple-system, sans-serif',
        strokeWidth: 3,
        strokeColor: '#FFFFFF',
      },
      shape: 'dot',
      borderWidth: 0,
      borderWidthSelected: 2,
      shadow: {
        enabled: true,
        color: 'rgba(0,0,0,0.1)',
        size: 8,
        x: 0,
        y: 2,
      },
    };
  });
}

/**
 * Convert relationships to vis.js edges (minimal lines)
 */
function relationshipsToEdges(relationships: ConceptRelationship[]): object[] {
  return relationships.map((rel) => ({
    from: rel.from_concept_id,
    to: rel.to_concept_id,
    label: rel.relationship_type.replace(/_/g, ' '),
    color: {
      color: '#D1D5DB',
      highlight: '#6B7280',
      hover: '#6B7280',
    },
    font: {
      size: 9,
      color: '#9CA3AF',
      strokeWidth: 2,
      strokeColor: '#FFFFFF',
      align: 'middle',
    },
    width: 1,
    smooth: {
      type: 'continuous',
      roundness: 0.5,
    },
    hoverWidth: 0.5,
    selectionWidth: 0.5,
  }));
}

/**
 * Generate the complete HTML for the graph WebView (Obsidian-inspired)
 */
export function generateGraphHTML(
  concepts: Concept[],
  relationships: ConceptRelationship[]
): string {
  const nodes = conceptsToNodes(concepts, relationships);
  const edges = relationshipsToEdges(relationships);

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
  <title>Knowledge Graph</title>
  <script src="https://unpkg.com/vis-network@9.1.6/standalone/umd/vis-network.min.js"></script>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    html, body {
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: #F9FAFB;
    }
    #graph {
      width: 100%;
      height: 100%;
    }
    .legend {
      position: absolute;
      bottom: 12px;
      left: 12px;
      background: rgba(255, 255, 255, 0.9);
      padding: 10px 14px;
      border-radius: 8px;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 11px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }
    .legend-title {
      font-weight: 600;
      margin-bottom: 8px;
      color: #374151;
    }
    .legend-item {
      display: flex;
      align-items: center;
      margin-bottom: 5px;
    }
    .legend-item:last-child {
      margin-bottom: 0;
    }
    .legend-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      margin-right: 8px;
    }
    .legend-label {
      color: #6B7280;
    }
  </style>
</head>
<body>
  <div id="graph"></div>
  <div class="legend">
    <div class="legend-title">Concepts</div>
    <div class="legend-item">
      <div class="legend-dot" style="background: #6366F1;"></div>
      <span class="legend-label">Core</span>
    </div>
    <div class="legend-item">
      <div class="legend-dot" style="background: #10B981;"></div>
      <span class="legend-label">Key</span>
    </div>
    <div class="legend-item">
      <div class="legend-dot" style="background: #9CA3AF;"></div>
      <span class="legend-label">Familiar</span>
    </div>
  </div>
  <script>
    const nodes = new vis.DataSet(${JSON.stringify(nodes)});
    const edges = new vis.DataSet(${JSON.stringify(edges)});

    const container = document.getElementById('graph');
    const data = { nodes, edges };

    const options = {
      layout: {
        improvedLayout: true,
        randomSeed: 42,
      },
      physics: {
        enabled: true,
        solver: 'forceAtlas2Based',
        forceAtlas2Based: {
          gravitationalConstant: -30,
          centralGravity: 0.005,
          springLength: 120,
          springConstant: 0.05,
          damping: 0.8,
          avoidOverlap: 0.5,
        },
        stabilization: {
          enabled: true,
          iterations: 150,
          updateInterval: 25,
        },
        minVelocity: 0.5,
        maxVelocity: 15,
      },
      interaction: {
        dragNodes: true,
        dragView: true,
        zoomView: true,
        hover: true,
        tooltipDelay: 0,
        hideEdgesOnDrag: false,
        hideEdgesOnZoom: false,
      },
      nodes: {
        shape: 'dot',
        scaling: {
          min: 8,
          max: 24,
        },
      },
      edges: {
        smooth: {
          type: 'continuous',
          roundness: 0.5,
        },
        arrows: {
          to: { enabled: false },
          from: { enabled: false },
        },
      },
    };

    const network = new vis.Network(container, data, options);

    // Send selected node back to React Native / parent window
    network.on('selectNode', function(params) {
      if (params.nodes.length > 0) {
        const message = JSON.stringify({
          type: 'nodeSelect',
          nodeId: params.nodes[0],
        });
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(message);
        } else if (window.parent !== window) {
          window.parent.postMessage(message, '*');
        }
      }
    });

    // Fit graph after stabilization with padding
    network.on('stabilizationIterationsDone', function() {
      network.fit({
        padding: 40,
        animation: {
          duration: 400,
          easingFunction: 'easeOutQuad',
        },
      });
    });
  </script>
</body>
</html>
  `.trim();
}
