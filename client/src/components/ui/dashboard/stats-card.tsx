// client/src/components/ui/dashboard/stats-card.tsx

import { Card } from "@/components/ui/card";
import {
  ArrowDown,
  ArrowUp,
  CalendarCheck,
  CheckCircle,
  Dumbbell,
  UsersRound,
} from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  change?: {
    value: string;
    trend: "up" | "down" | "neutral";
  };
  icon: "students" | "workouts" | "sessions" | "completion";
  isLoading?: boolean;
}

export function StatsCard({
  title,
  value,
  change,
  icon,
  isLoading = false,
}: StatsCardProps) {
  const getIcon = () => {
    switch (icon) {
      case "students":
        return <UsersRound className="w-6 h-6" />;
      case "workouts":
        return <Dumbbell className="w-6 h-6" />;
      case "sessions":
        return <CalendarCheck className="w-6 h-6" />;
      case "completion":
        return <CheckCircle className="w-6 h-6" />;
      default:
        return <UsersRound className="w-6 h-6" />;
    }
  };

  const getIconBgColor = () => {
    switch (icon) {
      case "students":
        return "bg-primary/10 text-primary";
      case "workouts":
        return "bg-secondary/10 text-secondary";
      case "sessions":
        return "bg-accent/10 text-accent";
      case "completion":
        return "bg-success/10 text-success";
      default:
        return "bg-primary/10 text-primary";
    }
  };

  const getTrendColor = () => {
    if (!change) return "";
    if (change.trend === "up") return "text-success";
    if (change.trend === "down") return "text-error";
    return "text-gray-500";
  };

  const getTrendIcon = () => {
    if (!change) return null;
    if (change.trend === "up") return <ArrowUp className="w-3 h-3 mr-1" />;
    if (change.trend === "down") return <ArrowDown className="w-3 h-3 mr-1" />;
    return null;
  };

  return (
    <Card className="p-5 border border-gray-100">
      <div className="flex justify-between items-center">
        <div>
          <p className="text-gray-500 text-sm">{title}</p>
          {isLoading ? (
            <div className="h-8 w-16 bg-gray-200 animate-pulse rounded mt-1"></div>
          ) : (
            <h3 className="text-2xl font-bold mt-1">{value}</h3>
          )}
          {change && (
            <p className={`text-xs ${getTrendColor()} mt-1 flex items-center`}>
              {getTrendIcon()}
              {change.value}
            </p>
          )}
        </div>
        <div
          className={`h-12 w-12 rounded-full flex items-center justify-center ${getIconBgColor()}`}
        >
          {getIcon()}
        </div>
      </div>
    </Card>
  );
}
