// TODO: This is a Server Component — fetch projects directly from the database
// or via your API, then render them here. No "use client" needed for the list.
//
// Use `next/link` for navigation to /projects/[id] and a client component for
// the "Create Project" dialog.

export default function Page() {
  return (
    <main className="min-h-screen p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Task Tracker</h1>
            <p className="mt-1 text-muted-foreground">
              Manage projects and tasks with AI-powered insights
            </p>
          </div>
          {/* TODO: Add a <CreateProjectDialog /> client component here */}
        </div>

        {/* TODO: Fetch and display projects as cards that link to /projects/[id] */}
        <p className="text-muted-foreground">
          Replace this with your project list.
        </p>
      </div>
    </main>
  )
}
