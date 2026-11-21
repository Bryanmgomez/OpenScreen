import { Film } from 'lucide-react'
import { EncodingSettings } from '@/components/recording/EncodingSettings'
import { Card } from '@/components/ui/Card'

/** Resolución, FPS, formato, códec y calidad, todos gated por capacidades reales. */
export function VideoSection() {
  return (
    <Card title="Codificación de vídeo" icon={<Film size={18} />}>
      <EncodingSettings />
    </Card>
  )
}
