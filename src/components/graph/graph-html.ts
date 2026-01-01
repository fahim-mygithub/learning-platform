/**
 * Graph HTML Template
 *
 * Generates HTML/JS for vis-network graph visualization.
 * Used inside a WebView to render interactive knowledge graphs.
 */

import type { Concept, ConceptRelationship } from '@/src/types';

/**
 * Node colors by concept tier
 */
const TIER_COLORS = {
  3: '#6366F1', // Indigo - Enduring/Core
  2: '#10B981', // Emerald - Important/Key
  1: '#9CA3AF', // Gray - Familiar
};

/**
 * Edge colors by relationship type
 */
const EDGE_COLORS: Record<string, string> = {
  prerequisite: '#EF4444',    // Red
  elaboration_of: '#3B82F6',  // Blue
  example_of: '#F59E0B',      // Amber
  evidence_for: '#8B5CF6',    // Purple
  definition_of: '#06B6D4',   // Cyan
  causal: '#EC4899',          // Pink
  taxonomic: '#14B8A6',       // Teal
  temporal: '#F97316',        // Orange
  contrasts_with: '#6B7280',  // Gray
};

/**
 * Convert concepts to vis.js nodes
 */
function conceptsToNodes(concepts: Concept[]): object[] {
  return concepts.map((concept) => ({
    id: concept.id,
    label: concept.name,
    title: `${concept.name}\n${concept.definition.substring(0, 100)}...`,
    color: {
      background: TIER_COLORS[concept.tier ?? 1],
      border: TIER_COLORS[concept.tier ?? 1],
      highlight: {
        background: TIER_COLORS[concept.tier ?? 1],
        border: '#1F2937',
      },
    },
    font: {
      color: '#FFFFFF',
      size: 14,
      face: 'system-ui, -apple-system, sans-serif',
    },
    shape: 'box',
    borderWidth: 2,
    borderWidthSelected: 3,
    margin: 10,
  }));
}

/**
 * Convert relationships to vis.js edges
 */
function relationshipsToEdges(relationships: ConceptRelationship[]): object[] {
  return relationships.map((rel) => ({
    from: rel.from_concept_id,
    to: rel.to_concept_id,
    label: rel.relationship_type.replace(/_/g, ' '),
    color: {
      color: EDGE_COLORS[rel.relationship_type] ?? '#6B7280',
      highlight: '#1F2937',
    },
    arrows: {
      to: {
        enabled: true,
        scaleFactor: 0.8,
      },
    },
    font: {
      size: 10,
      color: '#6B7280',
      strokeWidth: 2,
      strokeColor: '#FFFFFF',
    },
    smooth: {
      type: 'curvedCW',
      roundness: 0.2,
    },
    width: Math.max(1, (rel.strength ?? 0.5) * 3),
  }));
}

/**
 * Generate the complete HTML for the graph WebView
 */
export function generateGraphHTML(
  concepts: Concept[],
  relationships: ConceptRelationship[]
): string {
  const nodes = conceptsToNodes(concepts);
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
      bottom: 10px;
      left: 10px;
      background: rgba(255, 255, 255, 0.95);
      padding: 8px 12px;
      border-radius: 8px;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 11px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .legend-title {
      font-weight: 600;
      margin-bottom: 6px;
      color: #374151;
    }
    .legend-item {
      display: flex;
      align-items: center;
      margin-bottom: 4px;
    }
    .legend-color {
      width: 12px;
      height: 12px;
      border-radius: 3px;
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
    <div class="legend-title">Concept Tiers</div>
    <div class="legend-item">
      <div class="legend-color" style="background: #6366F1;"></div>
      <span class="legend-label">Core (Tier 3)</span>
    </div>
    <div class="legend-item">
      <div class="legend-color" style="background: #10B981;"></div>
      <span class="legend-label">Key (Tier 2)</span>
    </div>
    <div class="legend-item">
      <div class="legend-color" style="background: #9CA3AF;"></div>
      <span class="legend-label">Familiar (Tier 1)</span>
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
        hierarchical: {
          enabled: false,
        },
      },
      physics: {
        enabled: true,
        solver: 'forceAtlas2Based',
        forceAtlas2Based: {
          gravitationalConstant: -50,
          centralGravity: 0.01,
          springLength: 150,
          springConstant: 0.08,
          damping: 0.4,
        },
        stabilization: {
          enabled: true,
          iterations: 200,
          updateInterval: 25,
        },
      },
      interaction: {
        dragNodes: true,
        dragView: true,
        zoomView: true,
        hover: true,
        tooltipDelay: 200,
        multiselect: false,
      },
      nodes: {
        shape: 'box',
        margin: 10,
        widthConstraint: {
          minimum: 80,
          maximum: 150,
        },
      },
      edges: {
        smooth: {
          type: 'curvedCW',
          roundness: 0.2,
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
        // Try React Native WebView first, then parent window (iframe)
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(message);
        } else if (window.parent !== window) {
          window.parent.postMessage(message, '*');
        }
      }
    });

    // Fit graph after stabilization
    network.on('stabilizationIterationsDone', function() {
      network.fit({
        animation: {
          duration: 500,
          easingFunction: 'easeInOutQuad',
        },
      });
    });
  </script>
</body>
</html>
  `.trim();
}
