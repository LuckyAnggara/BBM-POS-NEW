'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { POSShift, POSTransaction } from '@/lib/appwrite/pos'
import type { Customer } from '@/lib/appwrite/customers'
import type { InventoryItem } from '@/lib/appwrite/inventory'
import { createPOSTransaction } from '@/lib/appwrite/pos'
import { toast } from 'sonner'

import { ProductGrid } from './product-grid'
import { CartPanel } from './cart-panel'
import { PaymentDialog } from './payment-dialog'
import { ScanCustomerDialog } from './scan-customer-dialog'

interface POSContainerProps {
  activeShift: POSShift | null
}

export type CartItem = {
  itemId: string
  name: string
  price: number
  quantity: number
  stock: number
}

export const POSContainer = ({ activeShift }: POSContainerProps) => {
  const { currentUser, userData } = useAuth()

  const [cart, setCart] = useState<CartItem[]>([])
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [isPaymentDialogOpen, setPaymentDialogOpen] = useState(false)
  const [isCustomerDialogOpen, setCustomerDialogOpen] = useState(false)

  const isShiftActive = !!activeShift
  const subtotal = cart.reduce(
    (acc, item) => acc + item.price * item.quantity,
    0
  )

  const handleAddToCart = (product: InventoryItem) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => item.itemId === product.id)
      if (existingItem) {
        // Jika stok masih cukup, tambah kuantitas
        if (existingItem.quantity < product.quantity) {
          return prevCart.map((item) =>
            item.itemId === product.id
              ? { ...item, quantity: item.quantity + 1 }
              : item
          )
        }
        toast.error('Stok Tidak Cukup')
        return prevCart
      }
      // Tambah item baru ke keranjang
      return [
        ...prevCart,
        {
          itemId: product.id,
          name: product.name,
          price: product.price,
          quantity: 1,
          stock: product.quantity,
        },
      ]
    })
  }

  const handleUpdateQuantity = (itemId: string, newQuantity: number) => {
    setCart((prevCart) => {
      const itemToUpdate = prevCart.find((item) => item.itemId === itemId)
      if (newQuantity > 0 && newQuantity <= (itemToUpdate?.stock || 0)) {
        return prevCart.map((item) =>
          item.itemId === itemId ? { ...item, quantity: newQuantity } : item
        )
      }
      if (newQuantity === 0) {
        return prevCart.filter((item) => item.itemId !== itemId)
      }
      toast.error('Stok Tidak Cukup')
      return prevCart
    })
  }

  const handleClearCart = () => {
    setCart([])
    setCustomer(null)
  }

  const handleProcessPayment = async (paymentData: {
    paymentMethod: POSTransaction['paymentMethod']
    amountPaid: number
  }) => {
    if (!currentUser || !userData || !activeShift) return

    const transactionData = {
      branchId: activeShift.branchId,
      shiftId: activeShift.id,
      userId: currentUser.$id,
      userName: userData.name,
      items: cart.map((item) => ({
        itemId: item.itemId,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        total: item.price * item.quantity,
      })),
      subtotal: subtotal,
      discount: 0, // Implementasi diskon bisa ditambahkan di sini
      total: subtotal,
      paymentMethod: paymentData.paymentMethod,
      amountPaid: paymentData.amountPaid,
      customerId: customer?.id,
      customerName: customer?.name,
    }

    const result = await createPOSTransaction(transactionData)

    if ('error' in result) {
      toast.error('Transaksi Gagal', {
        description: result.error,
      })
    } else {
      toast.success('Transaksi Berhasil', {
        description: `Transaksi ${result.transactionNumber} berhasil disimpan.`,
      })
      handleClearCart()
      setPaymentDialogOpen(false)
    }
  }

  return (
    <div
      className={`grid grid-cols-1 lg:grid-cols-3 gap-4 flex-grow ${
        !isShiftActive ? 'opacity-50 pointer-events-none' : ''
      }`}
    >
      <div className='lg:col-span-2'>
        <ProductGrid onAddToCart={handleAddToCart} disabled={!isShiftActive} />
      </div>
      <div className='lg:col-span-1'>
        <CartPanel
          cartItems={cart}
          customer={customer}
          subtotal={subtotal}
          onUpdateQuantity={handleUpdateQuantity}
          onClearCart={handleClearCart}
          onSelectCustomerClick={() => setCustomerDialogOpen(true)}
          onPaymentClick={() => setPaymentDialogOpen(true)}
          disabled={!isShiftActive}
        />
      </div>

      <PaymentDialog
        isOpen={isPaymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        totalAmount={subtotal}
        onSubmit={handleProcessPayment}
      />
      <ScanCustomerDialog
        isOpen={isCustomerDialogOpen}
        onOpenChange={setCustomerDialogOpen}
        onCustomerSelect={(c) => {
          setCustomer(c)
          setCustomerDialogOpen(false)
        }}
      />
    </div>
  )
}
