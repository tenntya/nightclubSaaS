"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Receipt,
  Users,
  Settings,
  Wine,
  Moon,
  Sun,
  Menu,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useState } from "react";

const menuItems = [
  {
    href: "/dashboard",
    label: "ダッシュボード",
    icon: LayoutDashboard,
  },
  {
    href: "/attendance",
    label: "来店管理",
    icon: Users,
  },
  {
    href: "/staff-attendance",
    label: "勤怠管理（スタッフ）",
    icon: Clock,
  },
  {
    href: "/receipts",
    label: "伝票管理",
    icon: Receipt,
  },
  {
    href: "/settings/menu",
    label: "メニュー管理",
    icon: Menu,
  },
  {
    href: "/settings",
    label: "設定",
    icon: Settings,
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "h-screen bg-card border-r border-border transition-all duration-300",
        collapsed ? "w-[80px]" : "w-[260px]"
      )}
    >
      {/* ロゴ/ブランド */}
      <div className="p-6">
        <Link href="/" className="flex items-center space-x-3">
          <Wine className="h-8 w-8 text-brand-accent" />
          {!collapsed && (
            <div>
              <h1 className="text-xl font-bold text-brand-accent">
                Club Manager
              </h1>
              <p className="text-xs text-muted-foreground">
                ナイトクラブ管理システム
              </p>
            </div>
          )}
        </Link>
      </div>

      <Separator />

      {/* ナビゲーションメニュー */}
      <nav className="p-4 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors",
                "hover:bg-accent hover:text-accent-foreground",
                isActive && "bg-primary text-primary-foreground"
              )}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* 折りたたみボタン */}
      <div className="absolute bottom-4 left-0 right-0 px-4">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-center"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? "→" : "←"}
        </Button>
      </div>
    </aside>
  );
}