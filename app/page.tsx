import { headers } from 'next/headers'
import ProjectListClient from '@/components/project-list-client'

interface Project {
  id: string
  name: string
  description: string | null
  status: 'active' | 'completed' | 'archived'
  createdAt: string
  updatedAt: string
  taskCount: number
}

async function getProjects(status?: string): Promise<Project[]> {
  const headersList = await headers()
  const host = headersList.get('host') ?? 'localhost:3000'
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
  const url = new URL('/api/projects', `${protocol}://${host}`)
  if (status && status !== 'all') url.searchParams.set('status', status)
  const res = await fetch(url.toString(), { cache: 'no-store' })
  if (!res.ok) return []
  return res.json()
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status } = await searchParams
  const projects = await getProjects(status)

  return <ProjectListClient projects={projects} currentStatus={status ?? 'all'} />
}
