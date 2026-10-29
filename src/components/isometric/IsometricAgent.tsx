'use client'

interface Props {
  name?: string
  color: string
  status?: string  // 'idle' | 'working' | 'paused' | 'error'
  isManager?: boolean
  x?: number
  y?: number
  small?: boolean
  onClick?: () => void
}

export function IsometricAgent({ name, color, status = 'idle', isManager, x = 0, y = 0, small, onClick }: Props) {
  const working = status === 'working'
  const s = small ? 0.88 : 1

  return (
    <g
      transform={`translate(${x},${y}) scale(${s})`}
      onClick={onClick ? (e) => { e.stopPropagation(); onClick() } : undefined}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      <ellipse cx={0} cy={12} rx={11} ry={4} fill="rgba(0,0,0,0.3)" />
      <g>
        {!working && (
          <animateTransform attributeName="transform" type="translate" values="0 0;0 -2;0 0" dur="3s" repeatCount="indefinite" />
        )}
        <rect x={-9} y={-10} width={18} height={22} rx={4} fill={color} fillOpacity={status === 'paused' ? 0.45 : 0.88} />
        <circle cx={0} cy={-18} r={9} fill={color} fillOpacity={status === 'paused' ? 0.55 : 1} />
        <circle cx={-3} cy={-19} r={1.5} fill="#fff" />
        <circle cx={3} cy={-19} r={1.5} fill="#fff" />
        {isManager && <polygon points="0,-8 -2.5,-2 0,-4 2.5,-2" fill="#fff" fillOpacity={0.85} />}
      </g>
      {working && (
        <>
          <circle cx={14} cy={-24} r={2} fill={color}><animate attributeName="opacity" values="0.3;1;0.3" dur="0.8s" repeatCount="indefinite" /></circle>
          <circle cx={19} cy={-27} r={2} fill={color}><animate attributeName="opacity" values="0.3;1;0.3" dur="0.8s" begin="0.2s" repeatCount="indefinite" /></circle>
          <circle cx={24} cy={-24} r={2} fill={color}><animate attributeName="opacity" values="0.3;1;0.3" dur="0.8s" begin="0.4s" repeatCount="indefinite" /></circle>
          <circle cx={0} cy={-16} r={14} fill="none" stroke={color} strokeWidth={1.5} strokeOpacity={0.4}>
            <animate attributeName="r" values="13;21;13" dur="2s" repeatCount="indefinite" />
            <animate attributeName="stroke-opacity" values="0.45;0;0.45" dur="2s" repeatCount="indefinite" />
          </circle>
        </>
      )}
      {status === 'error' && <circle cx={10} cy={-26} r={3.5} fill="#ef4444" />}
      {name && (
        <text x={0} y={29} textAnchor="middle" fontSize={11} fontWeight={700} fill={color}>{name}</text>
      )}
    </g>
  )
}
