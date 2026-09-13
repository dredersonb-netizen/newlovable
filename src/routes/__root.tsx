import { createRootRoute, Link, Outlet, HeadContent, Scripts } from '@tanstack/react-router'

export const Route = createRootRoute({
  component: RootComponent,
})

function RootComponent() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b">
        <div className="container flex h-14 items-center gap-6">
          <Link to="/" className="font-semibold">
            Gestão de Compromissos
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link
              to="/compromissos"
              className="text-muted-foreground transition-colors hover:text-foreground [&.active]:text-foreground [&.active]:font-medium"
            >
              Compromissos
            </Link>
          </nav>
        </div>
      </header>
      <main>
        <Outlet />
      </main>
      <HeadContent />
      <Scripts />
    </div>
  )
}
