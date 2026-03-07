import { FiAlertCircle, FiCheckCircle, FiInfo } from 'react-icons/fi'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './dialog'
import { Button } from './button'

type AlertType = 'error' | 'success' | 'info'

interface AlertModalProps {
  open: boolean
  message: string
  title?: string
  type?: AlertType
  onClose: () => void
}

const config: Record<AlertType, { icon: React.ElementType; iconClass: string; bgClass: string }> = {
  error:   { icon: FiAlertCircle,  iconClass: 'text-red-600',   bgClass: 'bg-red-100'   },
  success: { icon: FiCheckCircle,  iconClass: 'text-green-600', bgClass: 'bg-green-100' },
  info:    { icon: FiInfo,         iconClass: 'text-blue-600',  bgClass: 'bg-blue-100'  },
}

export function AlertModal({ open, message, title, type = 'error', onClose }: AlertModalProps) {
  const { icon: Icon, iconClass, bgClass } = config[type]
  const defaultTitle = type === 'error' ? 'Error' : type === 'success' ? 'Success' : 'Info'

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <div className="flex flex-col items-center gap-3 pt-2 pb-1 text-center">
          <div className={`w-12 h-12 rounded-full ${bgClass} flex items-center justify-center`}>
            <Icon className={`h-6 w-6 ${iconClass}`} />
          </div>
          <DialogHeader>
            <DialogTitle>{title ?? defaultTitle}</DialogTitle>
            <DialogDescription className="text-sm">{message}</DialogDescription>
          </DialogHeader>
        </div>
        <DialogFooter className="justify-center">
          <Button onClick={onClose} className="px-8">OK</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
