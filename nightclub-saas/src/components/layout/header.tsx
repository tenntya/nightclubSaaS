"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Moon, Sun, LogOut, User, Bell } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { fmtDate } from "@/lib/format";

export function Header() {
  const [isDark, setIsDark] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date().toISOString());

  // 時計の更新
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toISOString());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle("dark");
  };

  return (
    <header className="h-16 border-b border-border bg-card px-6 flex items-center justify-between">
      {/* 左側：時刻表示 */}
      <div className="flex items-center space-x-4">
        <div className="text-sm text-muted-foreground">
          {fmtDate(currentTime)}
        </div>
        <Badge variant="secondary" className="bg-brand-accent/10 text-brand-accent">
          営業中
        </Badge>
      </div>

      {/* 右側：ユーザーメニュー */}
      <div className="flex items-center space-x-4">
        {/* 通知 */}
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <span className="absolute -top-1 -right-1 h-3 w-3 bg-brand-accent rounded-full" />
        </Button>

        {/* テーマ切り替え */}
        <Button variant="ghost" size="icon" onClick={toggleTheme}>
          {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>

        {/* ユーザーメニュー */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 w-10 rounded-full">
              <Avatar className="h-10 w-10">
                <AvatarImage src="/avatars/01.png" alt="@user" />
                <AvatarFallback className="bg-brand-primary text-white">
                  AD
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">管理者</p>
                <p className="text-xs leading-none text-muted-foreground">
                  admin@nightclub.com
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" />
              <span>プロフィール</span>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <LogOut className="mr-2 h-4 w-4" />
              <span>ログアウト</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}