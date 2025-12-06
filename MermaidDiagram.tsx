import React, { useEffect, useRef, useState } from 'react';

// Using global mermaid for simplicity as importing directly in React 18 
// sometimes causes hydration issues without a specific wrapper library.
// We assume <script> tag in index.html loaded it.
declare global {
  interface Window {
    mermaid: any;
  }
}

interface MermaidDiagramProps {
  chart: string;
}

const MermaidDiagram: React.FC<MermaidDiagramProps> = ({ chart }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>('');

  useEffect(() => {
    if (window.mermaid) {
      window.mermaid.initialize({ 
        startOnLoad: true, 
        theme: 'default',
        securityLevel: 'loose',
        fontFamily: 'Inter'
      });
    }
  }, []);

  useEffect(() => {
    const renderChart = async () => {
      if (!containerRef.current || !window.mermaid) return;
      
      try {
        const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
        const { svg } = await window.mermaid.render(id, chart);
        setSvg(svg);
      } catch (error) {
        console.error("Mermaid render error:", error);
        setSvg('<div class="text-red-500 text-sm">Failed to render diagram</div>');
      }
    };

    renderChart();
  }, [chart]);

  return (
    <div 
      className="my-4 p-4 bg-white rounded-lg border border-slate-200 shadow-sm overflow-x-auto flex justify-center"
      dangerouslySetInnerHTML={{ __html: svg }} 
    />
  );
};

export default MermaidDiagram;
