interface SectionHeaderProps {
  index?: string
  title: string
  subtitle?: string
}

export function SectionHeader({ index, title, subtitle }: SectionHeaderProps) {
  return (
    <div className="section-header">
      <div>
        {index && <span className="section-index">{index}</span>}
        <h2>{title}</h2>
      </div>
      {subtitle && <p>{subtitle}</p>}
    </div>
  )
}
