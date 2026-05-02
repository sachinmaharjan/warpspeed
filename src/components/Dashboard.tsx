import React, { useEffect, useState, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell 
} from 'recharts';
import { Search, Activity, ChevronUp, ChevronDown, X, Plus, Minus, Menu } from 'lucide-react';
import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup } from "react-simple-maps";

const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

const COUNTRY_COORDS: Record<string, [number, number]> = {
  "USA": [-95.7129, 37.0902],
  "Kazakhstan": [66.9237, 48.0196],
  "Russia": [105.3188, 61.5240],
  "France": [-53.1258, 4.2205],
  "China": [104.1954, 35.8617],
  "India": [78.9629, 20.5937],
  "Japan": [138.2529, 36.2048],
  "New Zealand": [174.8860, -40.9006],
  "Iran": [53.6880, 32.4279],
  "Israel": [34.8516, 31.0461],
  "Kenya": [37.9062, -0.0236],
  "North Korea": [127.5101, 40.3399],
  "South Korea": [128.6925, 35.9078],
  "Australia": [133.7751, -25.2744],
  "Marshall Islands": [171.1845, 7.1315],
  "Pacific Spaceport Complex": [-152.4862, 57.4359],
  "Yellow Sea": [123.00, 35.00],
  "Barents Sea": [40.00, 75.00],
  "Pacific Ocean": [-154.0, 0.0]
};

interface Mission {
  Company: string;
  Location: string;
  Date: string;
  Detail: string;
  StatusRocket: string;
  Price: number | null;
  StatusMission: string;
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6'];

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'analytics' | 'telemetry'>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Sorting state
  const [sortConfig, setSortConfig] = useState<{ key: keyof Mission, direction: 'asc' | 'desc' } | null>(null);

  useEffect(() => {
    fetch('/api/missions')
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch data');
        return res.json();
      })
      .then(data => {
        setMissions(data);
        console.log('[Observability] [INFO] Dashboard data loaded', data.length);
      })
      .catch(err => {
        setError(err.message);
        console.error('[Observability] [ERROR] Dashboard failed to load data', err);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSort = (key: keyof Mission) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
    console.log(`[Observability] [INFO] Sorted table by ${key} ${direction}`);
  };

  const filteredMissions = useMemo(() => {
    let result = missions;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(m => 
        m.Company.toLowerCase().includes(q) || 
        m.Detail.toLowerCase().includes(q) ||
        m.Location.toLowerCase().includes(q)
      );
    }
    
    if (statusFilter) {
      result = result.filter(m => m.StatusMission === statusFilter);
    }

    if (startDate) {
      const start = new Date(startDate);
      if (!isNaN(start.getTime())) {
        result = result.filter(m => new Date(m.Date) >= start);
      }
    }

    if (endDate) {
      const end = new Date(endDate);
      if (!isNaN(end.getTime())) {
        result = result.filter(m => new Date(m.Date) <= end);
      }
    }
    
    if (sortConfig !== null) {
      result.sort((a, b) => {
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];
        
        if (aVal === bVal) return 0;
        
        if (aVal === null) return 1;
        if (bVal === null) return -1;
        
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    
    return result;
  }, [missions, search, sortConfig, statusFilter, startDate, endDate]);

  // Derived stats
  const totalMissions = missions.length;
  const successfulMissions = missions.filter(m => m.StatusMission.toLowerCase().includes('success')).length;
  const successRate = totalMissions > 0 ? ((successfulMissions / totalMissions) * 100).toFixed(1) : 0;
  
  const yearsWithData = Array.from(new Set(missions.map(m => new Date(m.Date).getFullYear()))).filter(y => !isNaN(y as number));
  const activeYears = yearsWithData.length;

  const topCompanies = useMemo(() => {
    const counts: Record<string, number> = {};
    missions.forEach(m => counts[m.Company] = (counts[m.Company] || 0) + 1);
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [missions]);

  const yearlyTrends = useMemo(() => {
    const counts: Record<string, { year: number, success: number, failure: number }> = {};
    missions.forEach(m => {
      const y = new Date(m.Date).getFullYear();
      if (isNaN(y)) return;
      if (!counts[y]) counts[y] = { year: y, success: 0, failure: 0 };
      if (m.StatusMission.toLowerCase().includes('success')) counts[y].success++;
      else counts[y].failure++;
    });
    return Object.values(counts).sort((a, b) => a.year - b.year);
  }, [missions]);

  const statusData = useMemo(() => {
    const counts: Record<string, number> = {};
    missions.forEach(m => counts[m.StatusMission] = (counts[m.StatusMission] || 0) + 1);
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [missions]);

  const rocketStatusData = useMemo(() => {
    const counts: Record<string, number> = {};
    missions.forEach(m => {
        const status = m.StatusRocket || "Unknown";
        counts[status] = (counts[status] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [missions]);

  const mapData = useMemo(() => {
    const locations: Record<string, { 
      country: string; 
      total: number; 
      success: number; 
      failure: number;
      facilities: Record<string, { total: number; success: number; failure: number }>;
    }> = {};
    
    missions.forEach(m => {
        const parts = m.Location.split(',').map(s => s.trim());
        let country = parts.pop() || "Unknown";
        if (country.includes('Russia')) country = 'Russia';
        if (country.includes('USA')) country = 'USA';
        
        // Facility is all other parts joined, forming the specific launch site name
        let facility = parts.length > 0 ? parts.join(', ') : "Unknown Facility";
        
        if (!locations[country]) locations[country] = { country, total: 0, success: 0, failure: 0, facilities: {} };
        locations[country].total++;
        if (!locations[country].facilities[facility]) {
            locations[country].facilities[facility] = { total: 0, success: 0, failure: 0 };
        }
        locations[country].facilities[facility].total++;

        if (m.StatusMission.toLowerCase().includes('success')) {
            locations[country].success++;
            locations[country].facilities[facility].success++;
        } else {
            locations[country].failure++;
            locations[country].facilities[facility].failure++;
        }
    });

    return Object.values(locations).map(loc => {
        const coord = COUNTRY_COORDS[loc.country] || [0, 0] as [number, number];
        return { ...loc, coord };
    }).filter(loc => loc.coord[0] !== 0 || loc.coord[1] !== 0);
  }, [missions]);

  const [hoveredMapLocation, setHoveredMapLocation] = useState<typeof mapData[0] | null>(null);
  const [selectedMapLocation, setSelectedMapLocation] = useState<typeof mapData[0] | null>(null);
  const [mapPosition, setMapPosition] = useState({ coordinates: [0, 20] as [number, number], zoom: 1 });

  const handleZoomIn = () => {
    if (mapPosition.zoom >= 8) return;
    setMapPosition((pos) => ({ ...pos, zoom: pos.zoom * 2 }));
  };

  const handleZoomOut = () => {
    if (mapPosition.zoom <= 1) return;
    setMapPosition((pos) => ({ ...pos, zoom: pos.zoom / 2 }));
  };

  const handleMoveEnd = (position: { coordinates: [number, number]; zoom: number }) => {
    setMapPosition(position);
  };

  if (loading) return <div className="flex items-center justify-center h-screen text-slate-500 bg-slate-50 font-sans">Loading WarpSpeed Dashboard...</div>;
  if (error) return <div className="flex items-center justify-center h-screen text-rose-500 bg-slate-50 font-sans">Error: {error}</div>;

  return (
    <div className="h-screen bg-slate-50 font-sans flex text-slate-900 overflow-hidden">
      {/* Mobile menu overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-slate-900/50 z-20 lg:hidden" onClick={() => setIsMobileMenuOpen(false)} />
      )}

      {/* Sidebar Navigation */}
      <aside className={`fixed lg:static inset-y-0 left-0 w-64 bg-slate-900 flex flex-col border-r border-slate-800 shrink-0 h-full overflow-y-auto transform transition-transform duration-200 ease-in-out z-30 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="p-6 flex items-center justify-between lg:justify-start gap-3">
          <div className="flex items-center gap-3">
            <div className="relative w-8 h-8">
              <div className="absolute top-0 left-0 w-5 h-5 rounded-full border-2 border-indigo-400 opacity-80"></div>
              <div className="absolute top-0 right-0 w-5 h-5 rounded-full border-2 border-blue-400 opacity-80"></div>
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full border-2 border-sky-400 opacity-80"></div>
            </div>
            <span className="font-bold text-white tracking-tight text-xl">WARPSPEED</span>
          </div>
          <button className="lg:hidden text-slate-400 hover:text-white" onClick={() => setIsMobileMenuOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <nav 
          className="mt-4 flex-1 bg-cover bg-center bg-no-repeat border-t border-slate-800/50 relative"
          style={{ 
            backgroundImage: 'linear-gradient(rgba(15, 23, 42, 0.85), rgba(15, 23, 42, 0.95)), url("/spaceship-warp-bg.png")',
          }}
        >
          <div className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-widest">Mission Control</div>
          <button onClick={() => { setActiveTab('dashboard'); setIsMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 px-6 py-3 ${activeTab === 'dashboard' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800 transition-colors'}`}>
            <div className={`w-4 h-4 rounded transition-colors ${activeTab === 'dashboard' ? 'bg-white/20' : 'border border-slate-600'}`}></div>
            <span className="text-sm font-medium">Global Dashboard</span>
          </button>
          <button onClick={() => { setActiveTab('analytics'); setIsMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 px-6 py-3 ${activeTab === 'analytics' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800 transition-colors'}`}>
            <div className={`w-4 h-4 rounded transition-colors ${activeTab === 'analytics' ? 'bg-white/20' : 'border border-slate-600'}`}></div>
            <span className="text-sm font-medium">Payload Analytics</span>
          </button>
          <button onClick={() => { setActiveTab('telemetry'); setIsMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 px-6 py-3 ${activeTab === 'telemetry' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800 transition-colors'}`}>
            <div className={`w-4 h-4 rounded transition-colors ${activeTab === 'telemetry' ? 'bg-white/20' : 'border border-slate-600'}`}></div>
            <span className="text-sm font-medium">Telemetry Stream</span>
          </button>
          
          <div className="px-6 py-8 mt-4">
            <div className="p-4 bg-slate-800 rounded-lg border border-slate-700">
              <p className="text-xs text-slate-400 mb-2 uppercase font-bold">System Status</p>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="text-xs text-white">Agents Operational (8/8)</span>
              </div>
            </div>
          </div>
        </nav>
        
        <div className="p-6 border-t border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-xs font-bold text-white italic">SM</div>
            <div className="text-xs">
              <p className="text-white font-medium">Sachin Maharjan</p>
              <p className="text-slate-500 italic">Senior Architect</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col relative h-full overflow-hidden w-full lg:w-auto">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-8 flex items-center justify-between shadow-sm z-10 shrink-0">
          <div className="flex items-center gap-3 sm:gap-4">
            <button className="lg:hidden p-2 -ml-2 text-slate-500 hover:text-slate-800" onClick={() => setIsMobileMenuOpen(true)}>
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-sm sm:text-lg font-semibold text-slate-800">Space Missions Dashboard</h1>
            <span className="hidden sm:inline-block px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] rounded border border-slate-200 font-mono font-bold uppercase tracking-wider">v2.4.0-PROD</span>
          </div>
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="text-right hidden sm:block">
              <p className="text-[10px] uppercase text-slate-400 font-bold">Total Processed</p>
              <p className="text-xs font-mono text-slate-600">{totalMissions}</p>
            </div>
            <button className="px-3 sm:px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded hover:bg-slate-800 transition-colors shadow-sm whitespace-nowrap">Export Data</button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto pb-12">
          {activeTab === 'dashboard' && (
          <main className="p-8 flex flex-col gap-6 max-w-[1600px] mx-auto">
            
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <KpiCard title="Total Missions" value={totalMissions} />
              <KpiCard title="Overall Success Rate" value={`${successRate}%`} />
              <KpiCard title="Active Companies" value={topCompanies.length > 0 ? Object.keys(missions.reduce((acc, m) => ({...acc, [m.Company]: 1}), {})).length : 0} />
              <KpiCard title="Years Recorded" value={activeYears} />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm col-span-2">
                <h2 className="font-bold text-slate-800 text-sm mb-4 uppercase tracking-wider">Mission Success over Time</h2>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={yearlyTrends} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#64748b'}} />
                      <YAxis axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#64748b'}} />
                      <RechartsTooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)' }} itemStyle={{fontSize: '12px', fontWeight: 600}} labelStyle={{fontSize: '12px', color: '#64748b', fontWeight: 600, marginBottom: '4px'}} />
                      <Line type="monotone" dataKey="success" stroke="#4f46e5" strokeWidth={3} dot={false} activeDot={{r: 6}} />
                      <Line type="monotone" dataKey="failure" stroke="#cbd5e1" strokeWidth={3} dot={false} activeDot={{r: 6}} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-xs text-slate-400 mt-4 text-center">Rationale: Line charts clearly show trends over time, highlighting improvement in rocket reliability.</p>
              </div>

              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h2 className="font-bold text-slate-800 text-sm mb-4 uppercase tracking-wider">Mission Status Distribution</h2>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={statusData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                        {statusData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                      </Pie>
                      <RechartsTooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)' }} itemStyle={{fontSize: '12px', fontWeight: 600}} />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                 <p className="text-xs text-slate-400 mt-4 text-center">Rationale: Donut chart effectively shows the vast proportion of successful vs other anomalies.</p>
              </div>
            </div>

            {/* Global Launch Map */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative">
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Global Spaceports</h2>
                <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-lg border border-slate-200">
                  <button onClick={handleZoomOut} className="p-1 rounded bg-white text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 shadow-sm border border-slate-200 transition-colors">
                    <Minus className="w-4 h-4" />
                  </button>
                  <button onClick={handleZoomIn} className="p-1 rounded bg-white text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 shadow-sm border border-slate-200 transition-colors">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <div className="h-[400px] w-full bg-[#f8fafc] rounded-lg border border-slate-100 overflow-hidden relative group">
                {hoveredMapLocation && (
                  <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm border border-slate-200 p-4 rounded-lg shadow-xl z-10 pointer-events-none min-w-[200px]">
                    <h3 className="font-bold text-slate-900 mb-2 pb-2 border-b border-slate-100">{hoveredMapLocation.country}</h3>
                    <div className="flex justify-between items-center text-sm mb-1">
                      <span className="text-slate-500">Total Launches</span>
                      <span className="font-bold text-slate-800">{hoveredMapLocation.total}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm mb-1">
                      <span className="text-emerald-600">Success</span>
                      <span className="font-bold text-emerald-700">{hoveredMapLocation.success}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-rose-600">Failure</span>
                      <span className="font-bold text-rose-700">{hoveredMapLocation.failure}</span>
                    </div>
                  </div>
                )}
                
                <ComposableMap projection="geoMercator" projectionConfig={{ scale: 120 }}>
                  <ZoomableGroup 
                    zoom={mapPosition.zoom} 
                    center={mapPosition.coordinates} 
                    onMoveEnd={handleMoveEnd}
                    minZoom={1} 
                    maxZoom={8}
                  >
                    <Geographies geography={geoUrl}>
                      {({ geographies }) =>
                        geographies.map((geo) => (
                          <Geography 
                            key={geo.rsmKey} 
                            geography={geo} 
                            fill="#f1f5f9" 
                            stroke="#cbd5e1" 
                            strokeWidth={0.5} 
                            style={{ 
                              default: { outline: "none" }, 
                              hover: { fill: "#f1f5f9", outline: "none" }, 
                              pressed: { outline: "none" } 
                            }} 
                          />
                        ))
                      }
                    </Geographies>
                    {mapData.map((marker) => {
                      const radius = Math.max(4, Math.min(24, Math.sqrt(marker.total) * 1.5));
                      return (
                        <Marker 
                          key={marker.country} 
                          coordinates={marker.coord}
                          onMouseEnter={() => setHoveredMapLocation(marker)}
                          onMouseLeave={() => setHoveredMapLocation(null)}
                          onClick={() => setSelectedMapLocation(marker)}
                        >
                          <circle 
                            r={radius} 
                            fill="#6366f1" 
                            fillOpacity={0.6} 
                            stroke="#4f46e5" 
                            strokeWidth={2} 
                            className="cursor-pointer transition-all duration-300 hover:fillOpacity-100"
                          />
                          <text 
                            textAnchor="middle" 
                            y={-radius - 4} 
                            style={{ fontFamily: "Inter, sans-serif", fontSize: "10px", fontWeight: "600", fill: "#475569" }}
                            className="pointer-events-none"
                          >
                            {marker.country} ({marker.total})
                          </text>
                        </Marker>
                      );
                    })}
                  </ZoomableGroup>
                </ComposableMap>

                {selectedMapLocation && (
                  <div className="absolute inset-0 bg-white/95 backdrop-blur-md p-6 z-20 flex flex-col animation-fade-in transition-all">
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-xl font-bold text-slate-800 tracking-tight">{selectedMapLocation.country} - Launch Facilities</h3>
                      <button onClick={() => setSelectedMapLocation(null)} className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors">
                         <X className="w-5 h-5" />
                      </button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto">
                      <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-500 uppercase bg-slate-50 sticky top-0 shadow-sm">
                          <tr>
                            <th className="px-4 py-3 font-semibold rounded-tl-lg">Facility</th>
                            <th className="px-4 py-3 font-semibold text-right">Total</th>
                            <th className="px-4 py-3 font-semibold text-right text-emerald-600">Success</th>
                            <th className="px-4 py-3 font-semibold text-right text-rose-600 rounded-tr-lg">Failure</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(selectedMapLocation.facilities).sort((a,b) => b[1].total - a[1].total).map(([facility, stats], idx) => (
                            <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                              <td className="px-4 py-3 font-medium text-slate-700">{facility}</td>
                              <td className="px-4 py-3 text-right text-slate-600 font-mono">{stats.total}</td>
                              <td className="px-4 py-3 text-right font-medium text-emerald-600 font-mono">{stats.success}</td>
                              <td className="px-4 py-3 text-right font-medium text-rose-600 font-mono">{stats.failure}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>

              {/* Data Table */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
                <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row gap-4 sm:justify-between sm:items-center bg-white z-10">
                  <h2 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Mission Ledger</h2>
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="relative">
                      <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                      <input 
                        type="text" 
                        placeholder="Search missions..." 
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-64 transition-all placeholder:text-slate-400"
                      />
                    </div>
                    <select 
                      value={statusFilter} 
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="px-3 py-2 bg-slate-50 border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700"
                    >
                      <option value="">All Statuses</option>
                      {Array.from(new Set(missions.map(m => m.StatusMission))).map(status => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                    <div className="flex items-center gap-2">
                      <input 
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="px-3 py-2 bg-slate-50 border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700"
                        title="Start Date"
                      />
                      <span className="text-slate-500 text-sm">to</span>
                      <input 
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="px-3 py-2 bg-slate-50 border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700"
                        title="End Date"
                      />
                    </div>
                    <span className="text-xs font-mono bg-slate-100 text-slate-500 px-2 py-1 rounded font-bold whitespace-nowrap">Showing {Math.min(filteredMissions.length, 100)} logs</span>
                  </div>
                </div>
                
                <div className="overflow-x-auto overflow-y-auto max-h-[300px] flex-1">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 sticky top-0 text-[11px] text-slate-500 uppercase tracking-wider font-bold z-10 shadow-sm shadow-slate-100">
                      <tr>
                        <SortableHeader label="Company" field="Company" currentSort={sortConfig} onSort={handleSort} />
                        <SortableHeader label="Date" field="Date" currentSort={sortConfig} onSort={handleSort} />
                        <SortableHeader label="Mission" field="Detail" currentSort={sortConfig} onSort={handleSort} />
                        <SortableHeader label="Location" field="Location" currentSort={sortConfig} onSort={handleSort} />
                        <SortableHeader label="Status" field="StatusMission" currentSort={sortConfig} onSort={handleSort} />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {filteredMissions.slice(0, 100).map((m, i) => (
                        <tr key={i} className="hover:bg-slate-50 transition-colors">
                          <td className="p-4 font-semibold text-slate-900">{m.Company}</td>
                          <td className="p-4 text-slate-500 font-mono text-[11px]">{new Date(m.Date).toLocaleDateString()}</td>
                          <td className="p-4 text-slate-700 truncate max-w-[200px]" title={m.Detail}>{m.Detail}</td>
                          <td className="p-4 text-slate-500 truncate max-w-[150px] text-xs" title={m.Location}>{m.Location}</td>
                          <td className="p-4">
                            <span className={`px-2 py-1 object-center rounded text-[10px] font-mono font-bold uppercase tracking-wider border ${
                              m.StatusMission.toLowerCase().includes('success') 
                                ? 'bg-emerald-50 text-emerald-600 border-emerald-200' 
                                : 'bg-rose-50 text-rose-600 border-rose-200'
                            }`}>
                              {m.StatusMission}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {filteredMissions.length > 100 && (
                  <div className="p-3 text-center bg-slate-50 border-t border-slate-200 text-xs text-slate-500 font-medium">
                    Displaying exactly 100 records for performance. Use filters to narrow down.
                  </div>
                )}
              </div>

               <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h2 className="font-bold text-slate-800 text-sm mb-4 uppercase tracking-wider">Top 5 Companies by Launches</h2>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topCompanies} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                      <XAxis type="number" axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#64748b'}} />
                      <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#64748b', fontWeight: 600}} width={80} />
                      <RechartsTooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)' }} itemStyle={{fontSize: '12px', fontWeight: 600}} labelStyle={{fontSize: '12px', color: '#64748b', fontWeight: 600, marginBottom: '4px'}} />
                      <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                 <p className="text-xs text-slate-400 mt-4 text-center">Rationale: Horizontal bar chart is optimal for comparing categorical data with long labels.</p>
              </div>

          </main>
          )}

          {activeTab === 'analytics' && (
            <main className="p-8 flex flex-col gap-6 max-w-[1600px] mx-auto pt-8">
              <div className="flex items-center gap-3 mb-4">
                <Activity className="w-8 h-8 text-indigo-500" />
                <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Payload Analytics</h2>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Yearly Trends Area Chart */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col h-96">
                  <h2 className="font-bold text-slate-800 text-sm mb-4 uppercase tracking-wider">Mission Success vs Failure by Year</h2>
                  <div className="flex-1 min-h-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={yearlyTrends} margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#64748b'}} />
                        <YAxis axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#64748b'}} />
                        <RechartsTooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)' }} itemStyle={{fontSize: '12px', fontWeight: 600}} labelStyle={{fontSize: '12px', color: '#64748b', fontWeight: 600, marginBottom: '4px'}} />
                        <Legend iconType="circle" wrapperStyle={{fontSize: '12px', paddingTop: '20px'}} />
                        <Line type="monotone" dataKey="success" name="Success" stroke="#10b981" strokeWidth={3} dot={false} activeDot={{r: 6}} />
                        <Line type="monotone" dataKey="failure" name="Failure" stroke="#f43f5e" strokeWidth={3} dot={false} activeDot={{r: 6}} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Rocket Status Pie Chart */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col h-96">
                  <h2 className="font-bold text-slate-800 text-sm mb-4 uppercase tracking-wider">Active vs Retired Rockets</h2>
                  <div className="flex-1 min-h-0 flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={rocketStatusData}
                          cx="50%"
                          cy="50%"
                          innerRadius={80}
                          outerRadius={120}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {rocketStatusData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <RechartsTooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)' }} itemStyle={{fontSize: '12px', fontWeight: 600}} />
                        <Legend iconType="circle" wrapperStyle={{fontSize: '12px', paddingTop: '20px'}} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

              </div>
            </main>
          )}

          {activeTab === 'telemetry' && (
            <main className="p-8 flex flex-col gap-6 max-w-[1600px] mx-auto pt-8">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Activity className="w-8 h-8 text-emerald-500" />
                  <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Telemetry Stream</h2>
                </div>
                <div className="flex items-center gap-2 text-emerald-600 text-sm font-semibold bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                  LIVE FEED
                </div>
              </div>

              <div className="bg-slate-900 rounded-xl border border-slate-800 shadow-xl overflow-hidden flex flex-col h-[600px]">
                <div className="bg-slate-950 px-4 py-3 flex items-center justify-between font-mono text-xs text-slate-400 border-b border-slate-800">
                  <span>TERMINAL // {new Date().toISOString()}</span>
                  <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-rose-500"></div>
                    <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                    <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                  </div>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 font-mono text-sm space-y-2">
                  {missions.slice(0, 50).reverse().map((m, idx) => {
                    const isSuccess = m.StatusMission.toLowerCase().includes('success');
                    const ts = new Date(m.Date).toISOString();
                    return (
                      <div key={idx} className="border-l-2 border-slate-700 pl-3 py-1 opacity-90 hover:opacity-100">
                         <span className="text-slate-500 mr-3">[{ts}]</span>
                         <span className="text-indigo-400 font-bold mr-3">{m.Company.padEnd(20, ' ').substring(0, 20)}</span>
                         <span className={isSuccess ? "text-emerald-400" : "text-rose-400"}>
                           {m.StatusMission.toUpperCase().padEnd(10, ' ')}
                         </span>
                         <span className="text-slate-300 ml-2">{m.Detail}</span>
                         <span className="text-amber-300 ml-2 text-xs">({m.Location})</span>
                      </div>
                    )
                  })}
                  <div className="animate-pulse text-emerald-500 mt-4">_</div>
                </div>
              </div>
            </main>
          )}
          
          {/* Status Bar */}
          <footer className="h-8 bg-white border-t border-slate-200 px-8 flex items-center justify-between text-[10px] font-bold text-slate-500 w-full mt-4 absolute bottom-0">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                SUPABASE CONNECTED
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                ELASTIC SEARCH ACTIVE
              </div>
            </div>
            <div className="flex items-center gap-4 hidden md:flex">
              <span>ENV: PRODUCTION</span>
              <span>CPU: {Math.floor(Math.random() * 10) + 5}.4%</span>
              <span>RAM: 1.2GB</span>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ title, value }: { title: string, value: string | number }) {
  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm transition-shadow">
      <p className="text-xs text-slate-500 font-bold uppercase mb-1 tracking-wider">{title}</p>
      <div className="flex items-end gap-2 mt-2">
        <p className="text-3xl font-bold text-slate-900">{value}</p>
      </div>
    </div>
  );
}

function SortableHeader({ label, field, currentSort, onSort }: { label: string, field: keyof Mission, currentSort: { key: keyof Mission, direction: 'asc' | 'desc' } | null, onSort: (field: keyof Mission) => void }) {
  return (
    <th className="p-4 font-bold cursor-pointer hover:bg-slate-100 transition-colors whitespace-nowrap" onClick={() => onSort(field)}>
      <div className="flex items-center gap-1">
        {label}
        {currentSort?.key === field && (
          currentSort.direction === 'asc' ? <ChevronUp className="w-3 h-3 text-indigo-500" /> : <ChevronDown className="w-3 h-3 text-indigo-500" />
        )}
      </div>
    </th>
  );
}
