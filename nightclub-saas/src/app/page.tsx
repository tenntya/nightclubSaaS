import { redirect } from "next/navigation";

export default function Home() {
  // ダッシュボードへリダイレクト
  redirect("/dashboard");
}