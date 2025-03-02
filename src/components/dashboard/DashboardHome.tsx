import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: number;
}

const StatCard = ({ title, value, icon, trend }: StatCardProps) => (
  <div className="flex flex-col rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
    <div className="flex items-center justify-between">
      <h3 className="text-sm font-medium text-gray-500">{title}</h3>
      <div className="rounded-full bg-blue-100 p-2 text-blue-600">{icon}</div>
    </div>
    <div className="mt-4">
      <span className="text-3xl font-bold">{value}</span>
      {trend !== undefined && (
        <span className={`ml-2 text-sm ${trend >= 0 ? 'text-green-500' : 'text-red-500'}`}>
          {trend >= 0 ? '+' : ''}{trend}%
        </span>
      )}
    </div>
  </div>
);

interface DataItem {
  id: number;
  name: string;
  value: number;
  [key: string]: any;
}

const DashboardHome = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeProjects: 0,
    completedTasks: 0,
    revenue: 0,
  });
  const [chartData, setChartData] = useState<DataItem[]>([]);
  const [loading, setLoading] = useState(true);

  console.log('DashboardHome: Component mounted');

  useEffect(() => {
    console.log('DashboardHome: Fetching stats...');
    const fetchStats = async () => {
      try {
        // Mock data for demonstration
        setTimeout(() => {
          console.log('DashboardHome: Setting mock data');
          setStats({
            totalUsers: 1247,
            activeProjects: 23,
            completedTasks: 156,
            revenue: 34500,
          });
          
          setChartData([
            { id: 1, name: 'Jan', value: 4000 },
            { id: 2, name: 'Feb', value: 3000 },
            { id: 3, name: 'Mar', value: 5000 },
            { id: 4, name: 'Apr', value: 2780 },
            { id: 5, name: 'May', value: 1890 },
            { id: 6, name: 'Jun', value: 2390 },
          ]);
          
          setLoading(false);
        }, 1000);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard Overview</h1>
      
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          title="Total Users" 
          value={stats.totalUsers} 
          icon={<span>👥</span>} 
          trend={12.5} 
        />
        <StatCard 
          title="Active Projects" 
          value={stats.activeProjects} 
          icon={<span>📊</span>} 
          trend={5.2} 
        />
        <StatCard 
          title="Completed Tasks" 
          value={stats.completedTasks} 
          icon={<span>✅</span>} 
          trend={-2.4} 
        />
        <StatCard 
          title="Revenue" 
          value={`$${stats.revenue.toLocaleString()}`} 
          icon={<span>💰</span>} 
          trend={8.1} 
        />
      </div>
      
      <div className="mt-8">
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-medium">Monthly Revenue</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#4f46e5" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardHome;