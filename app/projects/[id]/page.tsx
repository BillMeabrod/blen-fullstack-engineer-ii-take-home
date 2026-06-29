import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import type { Task } from '@/lib/schema'
import ProjectDetailClient from '@/components/project-detail-client'

interface ProjectDetail {
  id: string
  name: string
  description: string | null
  status: string
  createdAt: string
  updatedAt: string
  tasks: Task[]
  taskCounts: {
    total: number
    open: number
    in_progress: number
    in_review: number
    completed: number
  }
}

async function getProject(id: string): Promise<ProjectDetail | null> {
  const headersList = await headers()
  const host = headersList.get('host') ?? 'localhost:3000'
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
  const res = await fetch(`${protocol}://${host}/api/projects/${id}`, { cache: 'no-store' })
  if (res.status === 404) return null
  if (!res.ok) return null
  return res.json()
}

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const project = await getProject(id)

  if (!project) {
    redirect('/')
  }

  return (
    <ProjectDetailClient
      project={{
        id: project.id,
        name: project.name,
        description: project.description,
        status: project.status,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
      }}
      initialTasks={project.tasks}
    />
  )
}
