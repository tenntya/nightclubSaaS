"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Store, 
  CreditCard, 
  Users, 
  Palette, 
  Clock,
  Save,
  AlertCircle
} from "lucide-react";
import { mockSettings } from "@/lib/mock";

export default function SettingsPage() {
  const [settings, setSettings] = useState(mockSettings);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    // TODO: Server Actionで保存
    console.log("設定を保存:", settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-brand-accent">設定</h1>
        {saved && (
          <Badge variant="default" className="bg-green-600">
            保存しました
          </Badge>
        )}
      </div>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList>
          <TabsTrigger value="general">基本設定</TabsTrigger>
          <TabsTrigger value="billing">料金設定</TabsTrigger>
          <TabsTrigger value="hours">営業時間</TabsTrigger>
          <TabsTrigger value="theme">テーマ</TabsTrigger>
        </TabsList>

        {/* 基本設定 */}
        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Store className="mr-2 h-5 w-5" />
                店舗情報
              </CardTitle>
              <CardDescription>
                店舗の基本情報を設定します
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="org-name">店舗名</Label>
                <Input
                  id="org-name"
                  value={settings.organizationName}
                  onChange={(e) =>
                    setSettings({ ...settings, organizationName: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="timezone">タイムゾーン</Label>
                <Input
                  id="timezone"
                  value={settings.timezone}
                  disabled
                  className="bg-muted"
                />
              </div>
              <div>
                <Label htmlFor="currency">通貨</Label>
                <Input
                  id="currency"
                  value={settings.currency}
                  disabled
                  className="bg-muted"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 料金設定 */}
        <TabsContent value="billing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CreditCard className="mr-2 h-5 w-5" />
                料金設定
              </CardTitle>
              <CardDescription>
                税率、サービス料、チャージ料金を設定します
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="tax-rate">消費税率 (%)</Label>
                <Input
                  id="tax-rate"
                  type="number"
                  value={settings.taxRatePercent}
                  onChange={(e) =>
                    setSettings({ ...settings, taxRatePercent: Number(e.target.value) })
                  }
                />
              </div>
              <div>
                <Label htmlFor="service-charge">サービス料率 (%)</Label>
                <Input
                  id="service-charge"
                  type="number"
                  value={settings.serviceChargeRatePercent}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      serviceChargeRatePercent: Number(e.target.value),
                    })
                  }
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="charge-enabled">固定チャージ</Label>
                  <p className="text-sm text-muted-foreground">
                    席料として固定料金を追加します
                  </p>
                </div>
                <Switch
                  id="charge-enabled"
                  checked={settings.chargeEnabled}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, chargeEnabled: checked })
                  }
                />
              </div>
              {settings.chargeEnabled && (
                <div>
                  <Label htmlFor="charge-amount">チャージ金額 (円)</Label>
                  <Input
                    id="charge-amount"
                    type="number"
                    value={settings.chargeFixedJPY}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        chargeFixedJPY: Number(e.target.value),
                      })
                    }
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 営業時間 */}
        <TabsContent value="hours" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="mr-2 h-5 w-5" />
                営業時間
              </CardTitle>
              <CardDescription>
                店舗の営業時間を設定します
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="open-time">開店時刻</Label>
                <Input
                  id="open-time"
                  type="time"
                  value={settings.businessHours.openTime}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      businessHours: {
                        ...settings.businessHours,
                        openTime: e.target.value,
                      },
                    })
                  }
                />
              </div>
              <div>
                <Label htmlFor="close-time">閉店時刻</Label>
                <Input
                  id="close-time"
                  type="time"
                  value={settings.businessHours.closeTime}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      businessHours: {
                        ...settings.businessHours,
                        closeTime: e.target.value,
                      },
                    })
                  }
                />
              </div>
              <div className="p-4 bg-amber-500/10 rounded-lg flex items-start space-x-2">
                <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-amber-500">注意</p>
                  <p className="text-muted-foreground">
                    深夜営業の場合、閉店時刻が翌日になることがあります
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* テーマ */}
        <TabsContent value="theme" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Palette className="mr-2 h-5 w-5" />
                テーマ設定
              </CardTitle>
              <CardDescription>
                アプリケーションの外観を設定します
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>ダークモード</Label>
                  <p className="text-sm text-muted-foreground">
                    暗い背景色を使用します
                  </p>
                </div>
                <Switch
                  checked={settings.theme === "dark"}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, theme: checked ? "dark" : "light" })
                  }
                />
              </div>
              <Separator />
              <div>
                <Label>ブランドカラー</Label>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div className="p-4 rounded-lg bg-[#7A001F] text-white text-center">
                    ワインレッド
                    <br />
                    #7A001F
                  </div>
                  <div className="p-4 rounded-lg bg-[#C9A227] text-black text-center">
                    ゴールド
                    <br />
                    #C9A227
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 保存ボタン */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          className="bg-brand-primary hover:bg-brand-primary-light"
          size="lg"
        >
          <Save className="mr-2 h-4 w-4" />
          設定を保存
        </Button>
      </div>
    </div>
  );
}