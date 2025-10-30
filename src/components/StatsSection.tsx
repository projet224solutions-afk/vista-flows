import { useNavigate } from "react-router-dom";
import { useHomeStats } from "@/hooks/useHomeStats";

export default function StatsSection() {
  const navigate = useNavigate();
  const { stats, loading } = useHomeStats();

  const statsData = [
    {
      label: "Produits",
      value: `${stats.totalProducts}+`,
      path: "/marketplace"
    },
    {
      label: "Vendeurs",
      value: `${stats.totalVendors}+`,
      path: "/marketplace?filter=vendors"
    },
    {
      label: "Services",
      value: `${stats.totalServices}+`,
      path: "/services-proximite"
    },
    {
      label: "Clients",
      value: `${stats.totalClients}+`,
      path: "/auth"
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
      {statsData.map((stat, index) => (
        <button
          key={index}
          onClick={() => navigate(stat.path)}
          className="text-center transition-transform hover:scale-105 cursor-pointer"
        >
          <div className="text-3xl font-bold">
            {loading ? '...' : stat.value}
          </div>
          <div className="text-sm opacity-80">{stat.label}</div>
        </button>
      ))}
    </div>
  );
}
