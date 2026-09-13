import { createRootRoute, Link, Outlet, HeadContent, Scripts } from '@tanstack/react-router'

export const Route = createRootRoute({
  component: RootComponent,
})

function RootComponent() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b">
        <div className="container flex h-14 items-center">
          <Link to="/" className="font-semibold">
            Gestão de Compromissos
          </Link>
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
