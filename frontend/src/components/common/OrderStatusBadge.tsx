import { Badge } from '@/components/ui/badge'
import type { OrderStatus } from '@/types'

type StatusConfig = { label: string; variant: 'warning' | 'info' | 'default' | 'success' | 'destructive' | 'secondary' | 'outline' }

const statusConfig: Record<OrderStatus, StatusConfig> = {
  pending: { label: 'Pending', variant: 'warning' },
  confirmed: { label: 'Confirmed', variant: 'info' },
  processing: { label: 'Processing', variant: 'info' },
  shipped: { label: 'Shipped', variant: 'default' },
  delivered: { label: 'Delivered', variant: 'success' },
  cancelled: { label: 'Cancelled', variant: 'destructive' },
}

export function OrderStatusBadge({ status }: { status?: OrderStatus | string | null | undefined }) {
  // Defensive: Handle null, undefined, or unknown status
  const fallback: StatusConfig = { label: 'Unknown', variant: 'outline' }
  
  let config: StatusConfig = fallback
  if (status && typeof status === 'string' && status in statusConfig) {
    config = statusConfig[status as OrderStatus]
  }
  
  return <Badge variant={config.variant}>{config.label}</Badge>
}
