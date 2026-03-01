import { Badge } from '@/components/ui/badge'
import type { OrderStatus } from '@/types'

const statusConfig: Record<OrderStatus, { label: string; variant: 'warning' | 'info' | 'default' | 'success' | 'destructive' | 'secondary' | 'outline' }> = {
  pending: { label: 'Pending', variant: 'warning' },
  processing: { label: 'Processing', variant: 'info' },
  shipped: { label: 'Shipped', variant: 'default' },
  delivered: { label: 'Delivered', variant: 'success' },
  cancelled: { label: 'Cancelled', variant: 'destructive' },
}

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const { label, variant } = statusConfig[status]
  return <Badge variant={variant}>{label}</Badge>
}
