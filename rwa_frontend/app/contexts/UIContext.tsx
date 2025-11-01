/**
 * UI Context - 全局 UI 狀態管理
 * 使用 React Context API 處理 Modal、Toast 等 UI 狀態
 */

'use client'

import { createContext, useContext, useState, ReactNode } from 'react'
import type { ChainId } from '../types'

interface Toast {
  type: 'success' | 'warning' | 'error' | 'info'
  message: string
  txHash?: `0x${string}`
  duration?: number
}

interface UIContextType {
  // Modal 狀態
  isModalOpen: boolean
  modalType?: 'mcpi' | 'claim' | 'refund' | 'settings'
  modalData?: any
  openModal: (type: 'mcpi' | 'claim' | 'refund' | 'settings', data?: any) => void
  closeModal: () => void
  
  // Toast 通知
  toast?: Toast
  showToast: (toast: Toast) => void
  hideToast: () => void
  
  // 選擇狀態
  selectedBillId?: string
  setSelectedBillId: (id?: string) => void
  selectedChainId?: ChainId
  setSelectedChainId: (id?: ChainId) => void
  
  // Loading 狀態
  isLoading: boolean
  setIsLoading: (loading: boolean) => void
  loadingMessage?: string
  setLoadingMessage: (message?: string) => void
}

const UIContext = createContext<UIContextType | undefined>(undefined)

export function UIProvider({ children }: { children: ReactNode }) {
  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalType, setModalType] = useState<'mcpi' | 'claim' | 'refund' | 'settings'>()
  const [modalData, setModalData] = useState<any>()
  
  // Toast
  const [toast, setToast] = useState<Toast>()
  
  // Selection
  const [selectedBillId, setSelectedBillId] = useState<string>()
  const [selectedChainId, setSelectedChainId] = useState<ChainId>()
  
  // Loading
  const [isLoading, setIsLoading] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState<string>()
  
  const openModal = (type: 'mcpi' | 'claim' | 'refund' | 'settings', data?: any) => {
    setModalType(type)
    setModalData(data)
    setIsModalOpen(true)
  }
  
  const closeModal = () => {
    setIsModalOpen(false)
    setModalType(undefined)
    setModalData(undefined)
  }
  
  const showToast = (newToast: Toast) => {
    setToast(newToast)
    if (newToast.duration !== 0) {
      setTimeout(() => {
        setToast(undefined)
      }, newToast.duration || 3000)
    }
  }
  
  const hideToast = () => {
    setToast(undefined)
  }
  
  return (
    <UIContext.Provider
      value={{
        isModalOpen,
        modalType,
        modalData,
        openModal,
        closeModal,
        toast,
        showToast,
        hideToast,
        selectedBillId,
        setSelectedBillId,
        selectedChainId,
        setSelectedChainId,
        isLoading,
        setIsLoading,
        loadingMessage,
        setLoadingMessage,
      }}
    >
      {children}
    </UIContext.Provider>
  )
}

export function useUI() {
  const context = useContext(UIContext)
  if (!context) {
    throw new Error('useUI must be used within UIProvider')
  }
  return context
}

