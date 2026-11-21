import type { ReactNode } from 'react'
import { AppWindow, Monitor, Scan } from 'lucide-react'
import { cn } from '@/utils/cn'

export type SourceTab = 'screen' | 'window' | 'region'

interface TileDef {
  value: SourceTab
  title: string
  description: string
  icon: ReactNode
}

const TILES: readonly TileDef[] = [
  {
    value: 'screen',
    title: 'Pantalla',
    description: 'Grabar un monitor completo',
    icon: <Monitor size={22} />
  },
  {
    value: 'window',
    title: 'Ventana',
    description: 'Grabar una ventana',
    icon: <AppWindow size={22} />
  },
  {
    value: 'region',
    title: 'Región',
    description: 'Área (recorte pendiente)',
    icon: <Scan size={22} />
  }
]

interface SourceTypeTilesProps {
  value: SourceTab
  onChange: (value: SourceTab) => void
}

/** Tipo de fuente. Cada tile abre el selector real de ese tipo. */
export function SourceTypeTiles({ value, onChange }: SourceTypeTilesProps) {
  return (
    <div className="tiles" role="radiogroup" aria-label="Tipo de fuente">
      {TILES.map((tile) => (
        <button
          key={tile.value}
          type="button"
          role="radio"
          aria-checked={tile.value === value}
          className={cn('tile', tile.value === value && 'tile--active')}
          onClick={() => onChange(tile.value)}
        >
          <span className="tile__icon">{tile.icon}</span>
          <span className="tile__text">
            <span className="tile__title">{tile.title}</span>
            <span className="tile__description">{tile.description}</span>
          </span>
        </button>
      ))}
    </div>
  )
}
