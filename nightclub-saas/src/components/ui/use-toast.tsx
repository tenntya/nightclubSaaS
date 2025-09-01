import * as React from "react"

type ToastProps = {
  title?: string
  description?: string
  variant?: "default" | "destructive"
}

type ToastContextType = {
  toast: (props: ToastProps) => void
}

const ToastContext = React.createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const toast = React.useCallback((props: ToastProps) => {
    // 簡易的な実装 - 実際のプロジェクトではより洗練された通知システムを使用
    if (typeof window !== "undefined") {
      console.log("Toast:", props)
      // ブラウザの通知APIを使用
      if (props.variant === "destructive") {
        alert(`エラー: ${props.title}\n${props.description || ""}`)
      } else {
        alert(`${props.title}\n${props.description || ""}`)
      }
    }
  }, [])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = React.useContext(ToastContext)
  
  // コンテキストがない場合でも動作するようにフォールバック
  if (!context) {
    return {
      toast: (props: ToastProps) => {
        if (typeof window !== "undefined") {
          console.log("Toast (fallback):", props)
          if (props.variant === "destructive") {
            alert(`エラー: ${props.title}\n${props.description || ""}`)
          } else {
            alert(`${props.title}\n${props.description || ""}`)
          }
        }
      }
    }
  }
  
  return context
}