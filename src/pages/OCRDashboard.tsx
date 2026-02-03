import { useState } from 'react';
import { Header } from '@/components/Header';
import { useOCRDashboard } from '@/hooks/useOCRDashboard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { 
  Eye, CheckCircle, AlertTriangle, Clock, TrendingUp, 
  Camera, Zap, Target, BarChart3 
} from 'lucide-react';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

const OCRDashboard = () => {
  const [days, setDays] = useState(30);
  const { data, isLoading, error } = useOCRDashboard(days);

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="text-destructive">Error Loading Analytics</CardTitle>
              <CardDescription>Failed to fetch OCR analytics data. Please try again later.</CardDescription>
            </CardHeader>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">OCR Analytics Dashboard</h1>
            <p className="text-muted-foreground">Monitor OCR performance, correction rates, and accuracy metrics</p>
          </div>
          <Select value={String(days)} onValueChange={(v) => setDays(Number(v))}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <SummaryCard
            title="Total Scans"
            value={data?.summary.totalScans}
            icon={<Camera className="w-4 h-4" />}
            isLoading={isLoading}
          />
          <SummaryCard
            title="VLM Success Rate"
            value={data?.summary.vlmSuccessRate}
            suffix="%"
            icon={<Eye className="w-4 h-4" />}
            isLoading={isLoading}
          />
          <SummaryCard
            title="Correction Rate"
            value={data?.summary.correctionRate}
            suffix="%"
            icon={<CheckCircle className="w-4 h-4" />}
            isLoading={isLoading}
          />
          <SummaryCard
            title="Avg Processing Time"
            value={data?.summary.avgProcessingTime}
            suffix="ms"
            icon={<Clock className="w-4 h-4" />}
            isLoading={isLoading}
          />
        </div>

        {/* Additional Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <SummaryCard
            title="Exact Match Rate"
            value={data?.summary.exactMatchRate}
            suffix="%"
            icon={<Target className="w-4 h-4" />}
            isLoading={isLoading}
          />
          <SummaryCard
            title="Avg Confidence"
            value={data?.summary.avgConfidence ? data.summary.avgConfidence * 100 : undefined}
            suffix="%"
            icon={<TrendingUp className="w-4 h-4" />}
            isLoading={isLoading}
          />
          <SummaryCard
            title="Addresses Found"
            value={data?.summary.totalAddressesFound}
            icon={<BarChart3 className="w-4 h-4" />}
            isLoading={isLoading}
          />
          <SummaryCard
            title="Validation Rate"
            value={data?.summary.validationRate}
            suffix="%"
            icon={<Zap className="w-4 h-4" />}
            isLoading={isLoading}
          />
        </div>

        {/* Charts */}
        <Tabs defaultValue="trends" className="space-y-4">
          <TabsList>
            <TabsTrigger value="trends">Trends</TabsTrigger>
            <TabsTrigger value="methods">Methods</TabsTrigger>
            <TabsTrigger value="confidence">Confidence</TabsTrigger>
            <TabsTrigger value="errors">Errors</TabsTrigger>
          </TabsList>

          <TabsContent value="trends">
            <Card>
              <CardHeader>
                <CardTitle>OCR Activity Over Time</CardTitle>
                <CardDescription>Daily scans, corrections, and success rates</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={data?.timeSeries || []}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis 
                        dataKey="date" 
                        tickFormatter={(v) => new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        className="text-muted-foreground"
                      />
                      <YAxis className="text-muted-foreground" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                        labelFormatter={(v) => new Date(v).toLocaleDateString()}
                      />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="scans" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={2}
                        name="Total Scans"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="corrections" 
                        stroke="hsl(var(--warning))" 
                        strokeWidth={2}
                        name="Corrections Applied"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="exactMatches" 
                        stroke="hsl(var(--success))" 
                        strokeWidth={2}
                        name="Exact Matches"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="methods">
            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Method Distribution</CardTitle>
                  <CardDescription>VLM vs Tesseract usage breakdown</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <Skeleton className="h-[250px] w-full" />
                  ) : (
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'VLM', value: data?.methodDistribution.vlm || 0 },
                            { name: 'Tesseract', value: data?.methodDistribution.tesseract || 0 },
                            { name: 'VLM→Tesseract', value: data?.methodDistribution.vlm_fallback_tesseract || 0 },
                          ]}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="hsl(var(--primary))"
                          dataKey="value"
                        >
                          {COLORS.map((color, index) => (
                            <Cell key={`cell-${index}`} fill={color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Method Success Rates</CardTitle>
                  <CardDescription>Success rate comparison</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isLoading ? (
                    <>
                      <Skeleton className="h-8 w-full" />
                      <Skeleton className="h-8 w-full" />
                    </>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">VLM Success Rate</span>
                          <span className="font-medium">{(data?.summary.vlmSuccessRate || 0).toFixed(1)}%</span>
                        </div>
                        <Progress value={data?.summary.vlmSuccessRate || 0} className="h-3" />
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Tesseract Success Rate</span>
                          <span className="font-medium">{(data?.summary.tesseractSuccessRate || 0).toFixed(1)}%</span>
                        </div>
                        <Progress value={data?.summary.tesseractSuccessRate || 0} className="h-3" />
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Overall Correction Rate</span>
                          <span className="font-medium">{(data?.summary.correctionRate || 0).toFixed(1)}%</span>
                        </div>
                        <Progress value={data?.summary.correctionRate || 0} className="h-3" />
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="confidence">
            <Card>
              <CardHeader>
                <CardTitle>Confidence Score Distribution</CardTitle>
                <CardDescription>How confident is the OCR in its extractions</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={data?.confidenceDistribution || []}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="range" className="text-muted-foreground" />
                      <YAxis className="text-muted-foreground" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                      <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="errors">
            <Card>
              <CardHeader>
                <CardTitle>Error Distribution</CardTitle>
                <CardDescription>Types of errors encountered during OCR</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : data?.errorTypes && data.errorTypes.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={data.errorTypes} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis type="number" className="text-muted-foreground" />
                      <YAxis dataKey="type" type="category" width={150} className="text-muted-foreground" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                      <Bar dataKey="count" fill="hsl(var(--destructive))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <CheckCircle className="w-12 h-12 mx-auto mb-2 text-success" />
                      <p>No errors recorded in this period</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Character Error Rate Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-warning" />
              OCR Quality Metrics
            </CardTitle>
            <CardDescription>Understanding the accuracy measurements</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg bg-secondary/50">
                <h4 className="font-semibold text-foreground mb-1">Character Error Rate (CER)</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  Percentage of characters that need correction. Lower is better.
                </p>
                {isLoading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <span className="text-2xl font-bold text-foreground">
                    {((data?.summary.avgCER || 0) * 100).toFixed(2)}%
                  </span>
                )}
              </div>
              <div className="p-4 rounded-lg bg-secondary/50">
                <h4 className="font-semibold text-foreground mb-1">Exact Match Rate</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  Percentage of addresses extracted perfectly without corrections.
                </p>
                {isLoading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <span className="text-2xl font-bold text-foreground">
                    {(data?.summary.exactMatchRate || 0).toFixed(1)}%
                  </span>
                )}
              </div>
              <div className="p-4 rounded-lg bg-secondary/50">
                <h4 className="font-semibold text-foreground mb-1">Validation Rate</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  Percentage of found addresses that pass blockchain validation.
                </p>
                {isLoading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <span className="text-2xl font-bold text-foreground">
                    {(data?.summary.validationRate || 0).toFixed(1)}%
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

// Summary Card Component
const SummaryCard = ({ 
  title, 
  value, 
  suffix = '', 
  icon, 
  isLoading 
}: { 
  title: string; 
  value?: number; 
  suffix?: string;
  icon: React.ReactNode;
  isLoading: boolean;
}) => (
  <Card>
    <CardContent className="pt-6">
      <div className="flex items-center justify-between">
        <div className="p-2 rounded-lg bg-primary/10 text-primary">
          {icon}
        </div>
      </div>
      <div className="mt-3">
        {isLoading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <p className="text-2xl font-bold text-foreground">
            {value !== undefined ? (typeof value === 'number' ? value.toFixed(value % 1 === 0 ? 0 : 1) : value) : '—'}
            {suffix}
          </p>
        )}
        <p className="text-sm text-muted-foreground">{title}</p>
      </div>
    </CardContent>
  </Card>
);

export default OCRDashboard;
