'use client'

interface Props {
  name: string
  color: string
  status: string  // 'idle' | 'working' | 'paused' | 'error'
  isManager?: boolean
  x?: number
  y?: number
  onClick?: () => void
}

export function IsometricAgent({ name, color, status, isManager, x = 0, y = 0, onClick }: Props) {
  const isWorking = status === 'working'
  const isIdle = status === 'idle'

  return (
    <g
      transform={`translate(${x}, ${y})`}
      onClick={(e) => { e.stopPropagation(); onClick?.() }}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      {/* Shadow */}
      <ellipse cx={0} cy={8} rx={8} ry={3} fill="rgba(0,0,0,0.3)" />

      {/* Body */}
      <rect
        x={-6} y={-8} width={12} height={16} rx={3}
        fill={color}
        fillOpacity={0.8}
      >
        {isIdle && (
          <animate attributeName="y" values="-8;-9;-8" dur="3s" repeatCount="indefinite" />
        )}
      </rect>

      {/* Head */}
      <circle
        cx={0} cy={-14} r={7}
        fill={color}
      >
        {isIdle && (
          <animate attributeName="cy" values="-14;-15;-14" dur="3s" repeatCount="indefinite" />
        )}
      </circle>

      {/* Eyes */}
      <circle cx={-2.5} cy={-15} r={1.2} fill="#fff" />
      <circle cx={2.5} cy={-15} r={1.2} fill="#fff" />

      {/* Manager tie/badge */}
      {isManager && (
        <polygon points="0,-6 -2,-2 0,-3 2,-2" fill="#fff" fillOpacity={0.8} />
      )}

      {/* Working indicator - floating dots */}
      {isWorking && (
        <>
          <circle cx={10} cy={-18} r={1.5} fill={color}>
            <animate attributeName="opacity" values="0.3;1;0.3" dur="0.8s" repeatCount="indefinite" />
          </circle>
          <circle cx={14} cy={-20} r={1.5} fill={color}>
            <animate attributeName="opacity" values="0.3;1;0.3" dur="0.8s" begin="0.2s" repeatCount="indefinite" />
          </circle>
          <circle cx={18} cy={-18} r={1.5} fill={color}>
            <animate attributeName="opacity" values="0.3;1;0.3" dur="0.8s" begin="0.4s" repeatCount="indefinite" />
          </circle>
        </>
      )}

      {/* Status glow ring */}
      <circle
        cx={0} cy={-14} r={10}
        fill="none"
        stroke={isWorking ? color : 'transparent'}
        strokeWidth={1}
        strokeOpacity={0.4}
      >
        {isWorking && (
          <animate attributeName="r" values="10;14;10" dur="2s" repeatCount="indefinite" />
        )}
        {isWorking && (
          <animate attributeName="stroke-opacity" values="0.4;0;0.4" dur="2s" repeatCount="indefinite" />
        )}
      </circle>

      {/* Name label */}
      <text
        x={0} y={22}
        textAnchor="middle"
        fontSize={8}
        fontWeight={600}
        fill={color}
      >
        {name}
      </text>
    </g>
  )
}
