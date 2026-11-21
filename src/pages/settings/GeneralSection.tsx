import { Info, Scale } from 'lucide-react'
import { SystemInfo } from '@/components/SystemInfo'
import { Card } from '@/components/ui/Card'

export function GeneralSection() {
  return (
    <>
      <Card title="Acerca de OpenScreen" icon={<Info size={18} />}>
        <SystemInfo />
      </Card>
      <Card
        title="Licencia"
        icon={<Scale size={18} />}
        description="OpenScreen es software libre distribuido bajo la licencia GNU GPL-3.0-only. El texto completo está en el archivo LICENSE del proyecto."
      />
    </>
  )
}
