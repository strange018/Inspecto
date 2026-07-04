import { ImageTemplate } from "./types";

// Base64 encoded SVGs that visually represent safety hazard states for Gemini analysis
export const MOCK_PHOTO_TEMPLATES: ImageTemplate[] = [
  {
    id: "exposed_wiring",
    name: "Exposed Electrical Wiring",
    description: "Naked conductors protruding from a distribution board without insulation, showing sparked contacts.",
    mimeType: "image/svg+xml",
    url: `data:image/svg+xml;base64,${btoa(`
      <svg width="400" height="300" viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#1e293b"/>
        <!-- Background Grid -->
        <path d="M 0 50 L 400 50 M 0 100 L 400 100 M 0 150 L 400 150 M 0 200 L 400 200 M 0 250 L 400 250" stroke="#334155" stroke-width="0.5"/>
        <path d="M 50 0 L 50 300 M 100 0 L 100 300 M 150 0 L 150 300 M 200 0 L 200 300 M 250 0 L 250 300 M 300 0 L 300 300 M 350 0 L 350 300" stroke="#334155" stroke-width="0.5"/>
        
        <!-- Electric DB panel -->
        <rect x="120" y="40" width="160" height="220" fill="#475569" rx="8" stroke="#94a3b8" stroke-width="3"/>
        <rect x="140" y="60" width="120" height="80" fill="#0f172a" rx="4"/>
        
        <!-- Hanging naked wires -->
        <path d="M 170 120 Q 150 180 160 250" fill="none" stroke="#ef4444" stroke-width="5" stroke-linecap="round"/>
        <path d="M 190 120 Q 210 170 180 240" fill="none" stroke="#f59e0b" stroke-width="5" stroke-linecap="round"/>
        <path d="M 210 120 Q 240 190 220 260" fill="none" stroke="#3b82f6" stroke-width="5" stroke-linecap="round"/>
        
        <!-- Spark indications -->
        <path d="M 160 250 L 150 245 L 163 241 L 155 255 Z" fill="#f59e0b"/>
        <path d="M 180 240 L 175 230 L 188 232 L 183 245 Z" fill="#f59e0b"/>
        
        <!-- Hazard Sign -->
        <polygon points="200,65 235,120 165,120" fill="#fbbf24" stroke="#000" stroke-width="2"/>
        <path d="M 200 80 L 200 100" stroke="#000" stroke-width="4" stroke-linecap="round"/>
        <circle cx="200" cy="110" r="2.5" fill="#000"/>
        
        <text x="200" y="280" font-family="sans-serif" font-size="14" font-weight="bold" fill="#ef4444" text-anchor="middle">WARNING: EXPOSED NAKED WIRE ELECTRICAL HAZARD</text>
      </svg>
    `)}`
  },
  {
    id: "blocked_exit",
    name: "Blocked Emergency Fire Exit",
    description: "Piles of heavy wooden boxes and chemical drums obstructing the designated Fire Emergency Exit escape door.",
    mimeType: "image/svg+xml",
    url: `data:image/svg+xml;base64,${btoa(`
      <svg width="400" height="300" viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#1e293b"/>
        <!-- Background Grid -->
        <path d="M 0 50 L 400 50 M 0 100 L 400 100 M 0 150 L 400 150 M 0 200 L 400 200 M 0 250 L 400 250" stroke="#334155" stroke-width="0.5"/>
        
        <!-- Exit Door -->
        <rect x="150" y="40" width="100" height="200" fill="#10b981" rx="2" stroke="#34d399" stroke-width="4"/>
        <rect x="230" y="130" width="8" height="20" fill="#fbbf24" rx="2"/>
        
        <!-- EXIT Sign above -->
        <rect x="160" y="15" width="80" height="20" fill="#047857" rx="3" stroke="#34d399" stroke-width="2"/>
        <text x="200" y="29" font-family="sans-serif" font-size="12" font-weight="bold" fill="#fff" text-anchor="middle">FIRE EXIT</text>
        
        <!-- Piles of boxes blocking the door -->
        <rect x="100" y="140" width="80" height="80" fill="#b45309" stroke="#78350f" stroke-width="3" rx="4"/>
        <line x1="100" y1="140" x2="180" y2="220" stroke="#78350f" stroke-width="2"/>
        <line x1="180" y1="140" x2="100" y2="220" stroke="#78350f" stroke-width="2"/>
        
        <rect x="160" y="160" width="90" height="80" fill="#d97706" stroke="#92400e" stroke-width="3" rx="4"/>
        <line x1="160" y1="160" x2="250" y2="240" stroke="#92400e" stroke-width="2"/>
        
        <!-- Barrel drum blocking right side -->
        <rect x="220" y="120" width="60" height="120" fill="#475569" stroke="#334155" stroke-width="3" rx="10"/>
        <line x1="220" y1="150" x2="280" y2="150" stroke="#334155" stroke-width="3"/>
        <line x1="220" y1="180" x2="280" y2="180" stroke="#334155" stroke-width="3"/>
        
        <!-- Red Danger Cross -->
        <path d="M 120 80 L 280 220 M 280 80 L 120 220" stroke="#ef4444" stroke-width="12" stroke-linecap="round" opacity="0.9"/>
        
        <text x="200" y="280" font-family="sans-serif" font-size="14" font-weight="bold" fill="#ef4444" text-anchor="middle">VIOLATION: EMERGENCY EXIT ROUTE BLOCKED</text>
      </svg>
    `)}`
  },
  {
    id: "clean_safe_space",
    name: "Safe Compliant Workspace",
    description: "An exemplary office and warehouse setup with clean gangways, glowing green exit route indicators, and marked floor boundaries.",
    mimeType: "image/svg+xml",
    url: `data:image/svg+xml;base64,${btoa(`
      <svg width="400" height="300" viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#1e293b"/>
        <!-- Background Grid -->
        <path d="M 0 50 L 400 50 M 0 100 L 400 100 M 0 150 L 400 150 M 0 200 L 400 200 M 0 250 L 400 250" stroke="#334155" stroke-width="0.5"/>
        
        <!-- Clean walkway floor markings -->
        <polygon points="120,300 160,120 240,120 280,300" fill="#334155"/>
        <line x1="120" y1="300" x2="160" y2="120" stroke="#fbbf24" stroke-width="4" stroke-dasharray="10,10"/>
        <line x1="280" y1="300" x2="240" y2="120" stroke="#fbbf24" stroke-width="4" stroke-dasharray="10,10"/>
        
        <!-- Standard Exit Door free of blockage -->
        <rect x="180" y="60" width="40" height="60" fill="#047857" stroke="#34d399" stroke-width="2"/>
        <circle cx="212" cy="90" r="2" fill="#fbbf24"/>
        
        <!-- Safety poster on wall -->
        <rect x="60" y="50" width="60" height="80" fill="#fff" rx="2" stroke="#1e3a8a" stroke-width="2"/>
        <text x="90" y="65" font-family="sans-serif" font-size="8" font-weight="bold" fill="#1e3a8a" text-anchor="middle">THINK</text>
        <rect x="70" y="75" width="40" height="30" fill="#3b82f6" rx="1"/>
        <text x="90" y="93" font-family="sans-serif" font-size="7" font-weight="bold" fill="#fff" text-anchor="middle">SAFETY FIRST</text>
        
        <!-- Fire Extinguisher Mounted on wall on a designated red zone -->
        <rect x="320" y="100" width="14" height="40" fill="#ef4444" rx="2"/>
        <rect x="323" y="92" width="8" height="8" fill="#94a3b8"/>
        <circle cx="327" cy="110" r="3" fill="#fff"/>
        <rect x="310" y="145" width="34" height="20" fill="#fee2e2" rx="2" stroke="#ef4444" stroke-width="1"/>
        <text x="327" y="157" font-family="sans-serif" font-size="7" font-weight="bold" fill="#b91c1c" text-anchor="middle">FIRE EXT.</text>
        
        <text x="200" y="280" font-family="sans-serif" font-size="14" font-weight="bold" fill="#10b981" text-anchor="middle">COMPLIANT: PATHWAYS CLEAR & SIGNED</text>
      </svg>
    `)}`
  }
];
