// Official Elasticsearch brand glyph, rendered from simple-icons so it stays
// crisp at any size and inherits the plane's theme color.
import { siElasticsearch } from 'simple-icons'

function ClusterMark({ color = 'currentColor', className, style }) {
  return (
    <svg
      role="img"
      viewBox="0 0 24 24"
      className={className}
      style={style}
      fill={color}
      xmlns="http://www.w3.org/2000/svg"
      aria-label={siElasticsearch.title}
    >
      <path d={siElasticsearch.path} />
    </svg>
  )
}

export default ClusterMark
