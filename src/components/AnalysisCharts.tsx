import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer,
  LineChart,
  Line,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';
import { AnalysisResult } from '@/lib/api';

interface AnalysisChartsProps {
  analysisResults?: AnalysisResult | null;
}

export const AnalysisCharts: React.FC<AnalysisChartsProps> = ({ analysisResults }) => {
  // Debug logging
  console.log('AnalysisCharts received data:', analysisResults);
  
  // Use real data if available, otherwise use default values
  const issueData = [
    { 
      name: 'Critical', 
      value: analysisResults?.summary.severity_breakdown.critical ?? 3, 
      color: '#EF4444' 
    },
    { 
      name: 'High', 
      value: analysisResults?.summary.severity_breakdown.high ?? 8, 
      color: '#F59E0B' 
    },
    { 
      name: 'Medium', 
      value: analysisResults?.summary.severity_breakdown.medium ?? 15, 
      color: '#3B82F6' 
    },
    { 
      name: 'Low', 
      value: analysisResults?.summary.severity_breakdown.low ?? 22, 
      color: '#10B981' 
    }
  ];
  
  console.log('Issue data for charts:', issueData);

  const metricsData = [
    { name: 'Security', value: Math.round(analysisResults?.metrics.security_score ?? 87) },
    { name: 'Performance', value: Math.round(analysisResults?.metrics.performance_score ?? 92) },
    { name: 'Quality', value: Math.round(analysisResults?.metrics.code_quality_score ?? 78) },
    { name: 'Documentation', value: Math.round(analysisResults?.metrics.documentation_score ?? 65) },
    { name: 'Testing', value: 73 }, // Default for now
    { name: 'Maintainability', value: 81 } // Default for now
  ];

  // Generate agent breakdown chart data
  const agentData = analysisResults ? Object.entries(analysisResults.summary.agent_breakdown).map(([agent, count]) => ({
    name: agent.charAt(0).toUpperCase() + agent.slice(1),
    value: count
  })) : [
    { name: 'Security', value: 15 },
    { name: 'Performance', value: 8 },
    { name: 'Complexity', value: 12 },
    { name: 'Documentation', value: 13 }
  ];

  const trendData = [
    { month: 'Jan', security: 82, performance: 88, quality: 75 },
    { month: 'Feb', security: 85, performance: 90, quality: 77 },
    { month: 'Mar', security: 87, performance: 92, quality: 78 },
    { month: 'Apr', security: 86, performance: 91, quality: 76 },
    { month: 'May', security: 89, performance: 93, quality: 80 },
    { month: 'Jun', security: 87, performance: 92, quality: 78 }
  ];

  const complexityData = [
    { name: 'Files', A: 120, B: 110, fullMark: 150 },
    { name: 'Functions', A: 98, B: 130, fullMark: 150 },
    { name: 'Classes', A: 86, B: 130, fullMark: 150 },
    { name: 'Complexity', A: 99, B: 100, fullMark: 150 },
    { name: 'Coupling', A: 85, B: 90, fullMark: 150 },
    { name: 'Cohesion', A: 65, B: 85, fullMark: 150 }
  ];

  const RADIAN = Math.PI / 180;
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        className="text-xs font-medium"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <div className="space-y-6">
      {/* Issue Distribution Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Issue Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={issueData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={renderCustomizedLabel}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {issueData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          
          <div className="grid grid-cols-2 gap-2 mt-4">
            {issueData.map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: item.color }}
                ></div>
                <span className="text-sm">{item.name}: {item.value}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Code Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Code Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={metricsData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
              <Bar 
                dataKey="value" 
                fill="hsl(var(--primary))"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Trend Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Quality Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
              <Line 
                type="monotone" 
                dataKey="security" 
                stroke="#EF4444" 
                strokeWidth={2}
                dot={{ fill: '#EF4444', strokeWidth: 2, r: 4 }}
                name="Security"
              />
              <Line 
                type="monotone" 
                dataKey="performance" 
                stroke="#F59E0B" 
                strokeWidth={2}
                dot={{ fill: '#F59E0B', strokeWidth: 2, r: 4 }}
                name="Performance"
              />
              <Line 
                type="monotone" 
                dataKey="quality" 
                stroke="#3B82F6" 
                strokeWidth={2}
                dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                name="Quality"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Complexity Radar */}
      <Card>
        <CardHeader>
          <CardTitle>Complexity Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <RadarChart data={complexityData}>
              <PolarGrid gridType="polygon" />
              <PolarAngleAxis 
                dataKey="name" 
                tick={{ fontSize: 12 }}
              />
              <PolarRadiusAxis 
                angle={90} 
                domain={[0, 150]} 
                tick={false}
              />
              <Radar
                name="Current"
                dataKey="A"
                stroke="hsl(var(--primary))"
                fill="hsl(var(--primary))"
                fillOpacity={0.3}
                strokeWidth={2}
              />
              <Radar
                name="Target"
                dataKey="B"
                stroke="hsl(var(--success))"
                fill="hsl(var(--success))"
                fillOpacity={0.1}
                strokeWidth={2}
                strokeDasharray="5 5"
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Agent Breakdown Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Issues by Agent</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={agentData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 12 }}
                angle={0}
                textAnchor="middle"
                height={40}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
              <Bar 
                dataKey="value" 
                fill="hsl(var(--secondary))"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};