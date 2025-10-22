"use client";
import { CartesianGrid, Line, LineChart, XAxis } from "recharts";
import { useMemo, useState } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Button } from "@/components/ui/button";
import { useLocale, useTranslations } from "next-intl";

const weekSource = [
  { key: "mon", tasks: 5 },
  { key: "tue", tasks: 8 },
  { key: "wed", tasks: 12 },
  { key: "thu", tasks: 7 },
  { key: "fri", tasks: 10 },
  { key: "sat", tasks: 3 },
  { key: "sun", tasks: 2 },
] as const;

const monthSource = [
  { key: "week1", tasks: 30 },
  { key: "week2", tasks: 45 },
  { key: "week3", tasks: 38 },
  { key: "week4", tasks: 50 },
] as const;

export function ActivityChart() {
  const [view, setView] = useState<"week" | "month">("week");
  const t = useTranslations("dashboard.chart");
  const locale = useLocale();

  const chartConfig = useMemo(
    () =>
      ({
        tasks: {
          label: t("seriesLabel"),
          color: "#5030e5",
        },
      }) satisfies ChartConfig,
    [t]
  );

  const weekData = useMemo(
    () =>
      weekSource.map((entry) => ({
        ...entry,
        day: t(`weekdays.${entry.key}`),
      })),
    [t]
  );

  const monthData = useMemo(
    () =>
      monthSource.map((entry) => ({
        ...entry,
        week: t(`weeks.${entry.key}`),
      })),
    [t]
  );

  const chartData = view === "week" ? weekData : monthData;
  const xAxisKey = view === "week" ? "day" : "week";

  const toggleView = () => setView((prev) => (prev === "week" ? "month" : "week"));

  return (
    <Card className="h-50">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>
            {view === "week" ? t("descriptionWeek") : t("descriptionMonth")}
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={toggleView} dir={locale === "fa" ? "rtl" : "ltr"}>
          {view === "week" ? t("toggleToMonth") : t("toggleToWeek")}
        </Button>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-40 w-full">
          <LineChart
            accessibilityLayer
            data={chartData}
            margin={{
              left: 12,
              right: 12,
              top: 12,
              bottom: 12,
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis dataKey={xAxisKey} tickLine={false} axisLine={false} tickMargin={8} />
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <Line dataKey="tasks" type="natural" stroke="#5030e5" strokeWidth={2} dot={false} />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

