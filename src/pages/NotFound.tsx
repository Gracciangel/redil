import { Link } from 'react-router-dom'
import { EmptyState } from '@/components/Feedback'
import { Icon } from '@/components/Icons'

export function NotFoundPage() {
  return (
    <div className="page">
      <EmptyState
        icon="search"
        title="Página no encontrada"
        description="La dirección no existe o se ha movido. Vuelve al inicio para seguir usando Redil."
        action={
          <Link to="/" className="btn btn-primary">
            <Icon name="home" size={18} />
            Volver al inicio
          </Link>
        }
      />
    </div>
  )
}
